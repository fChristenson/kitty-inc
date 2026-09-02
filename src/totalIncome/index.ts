import { isStorageIntact, type Floor } from "../gameState";
import { collectDueIncome, currentIncomeRatePerSecond } from "../floors";
import {
  getActiveCompanyIndex,
  loadCompanyRecord,
  saveCompanyRecord,
  clearCompanyRecord,
} from "../company";
import { getCorporationCount } from "../corporationName";
import {
  type BigNumber,
  ZERO,
  fromNumber,
  toNumber,
  add,
  subtract,
  multiply,
  lt,
} from "../shared/bigNumber";

export function getTotalIncome(): BigNumber {
  return totalIncome;
}

// reads any company's own current total (not just the currently active one) —
// the active company's in-memory value (freshest, may not be saved yet), every
// other company's derived straight from its single persisted CompanyRecord (see
// company.ts): bankedTotal as of updatedAt, plus however much its own frozen
// rate would have earned in the elapsed time since — a pure function of that one
// record, so it can never desync from a separate "total" write happening
// somewhere else (there isn't one)
export function getStoredTotalIncome(companyIndex: number): BigNumber {
  if (companyIndex === activeCompanyIndex) return totalIncome;
  const record = loadCompanyRecord(companyIndex);
  if (!record) return ZERO; // never went dormant yet (e.g. brand new company) — nothing banked
  const elapsedSeconds = Math.max(0, (Date.now() - record.updatedAt) / 1000);
  return add(
    record.bankedTotal,
    multiply(record.incomeRatePerSecond, elapsedSeconds),
  );
}

// combined totalIncome across every corporation — every corp boost/upgrade
// (corporationUpgradeMenu's "Create new Company", corporationBoostMenu's stock raises)
// draws from this shared pool instead of just the currently active company's own
// wallet, so a rich company can carry a poor one
export function getAllCompaniesTotalIncome(): BigNumber {
  const count = getCorporationCount();
  let sum = ZERO;
  for (let i = 0; i < count; i++) sum = add(sum, getStoredTotalIncome(i));
  return sum;
}

// deducts amount from the running total if affordable; returns whether the spend succeeded
export function spendTotalIncome(amount: BigNumber): boolean {
  if (lt(totalIncome, amount)) return false;
  totalIncome = subtract(totalIncome, amount);
  return true;
}

// adds amount to the running total; used by the "Add Money" dev/test control
export function addTotalIncome(amount: BigNumber): void {
  totalIncome = add(totalIncome, amount);
}

// applies delta (can be negative — a spend) to a specific company's own total —
// straight to the live value if it's the active company; for a dormant one,
// re-anchors its CompanyRecord's bankedTotal AND updatedAt TOGETHER in one
// atomic write (see spendFromAllCompanies) — bankedTotal is computed from the
// CURRENT derived total (already including whatever it earned since it went
// dormant) minus delta, so the next read projects forward from right now
// instead of double-counting or drifting against a stale timestamp. delta is
// expressed as a plain, non-negative $ amount plus a sign flag (BigNumber can't
// represent a negative value at all — see shared/bigNumber's own convention)
function adjustStoredTotalIncome(
  companyIndex: number,
  amount: BigNumber,
  sign: 1 | -1,
): void {
  if (companyIndex === activeCompanyIndex) {
    totalIncome =
      sign === 1 ? add(totalIncome, amount) : subtract(totalIncome, amount);
    return;
  }
  const record = loadCompanyRecord(companyIndex);
  const currentTotal = getStoredTotalIncome(companyIndex);
  saveCompanyRecord(companyIndex, {
    bankedTotal:
      sign === 1 ? add(currentTotal, amount) : subtract(currentTotal, amount),
    incomeRatePerSecond: record?.incomeRatePerSecond ?? ZERO,
    assetValue: record?.assetValue ?? ZERO,
    upgradesValue: record?.upgradesValue ?? ZERO,
    updatedAt: Date.now(),
  });
}

// same as spendTotalIncome but for any company, not just the active one —
// corporationUpgradeMenu's per-company Building upgrades buttons need this so
// a purchase made for a dormant company draws from THAT company's own wallet,
// never the currently active one's
export function spendCompanyTotalIncome(
  companyIndex: number,
  amount: BigNumber,
): boolean {
  if (lt(getStoredTotalIncome(companyIndex), amount)) return false;
  adjustStoredTotalIncome(companyIndex, amount, -1);
  return true;
}

// $/sec every unlocked floor across every one of buildings is currently earning,
// worker-boost/office-upgrades AND the global stock-boost multiplier (see
// getGlobalIncomeBoostMultiplier) all included — same cycle math peekDueIncome
// uses, just as a flat rate instead of a lump sum. Exported so
// corporationBoostMenu.ts's getStockRaiseCost values a company's current earning
// power the same way even while it isn't the active company
export function getBuildingsCurrentIncomePerSecond(
  buildings: Floor[][],
  now: number,
): BigNumber {
  let total = ZERO;
  for (const floors of buildings) {
    for (const floor of floors) {
      if (!floor.unlocked) continue;
      total = add(total, currentIncomeRatePerSecond(floor, now));
    }
  }
  return multiply(total, incomeBoostMultiplier());
}

// a company's own current $/sec, without ever loading a DORMANT company's full
// buildings/floors — the active company's is computed live (freshest), every
// other company's comes straight from its persisted CompanyRecord (see
// company.ts), already boost-adjusted as of when it went dormant. The single
// shared way any per-company cost/weight calculation (getCompanyWealth,
// corporationBoostMenu's getStockRaiseCost)
// should read a company's rate — never loadBuildings(i) directly for this
export function getCompanyIncomeRatePerSecond(companyIndex: number): BigNumber {
  if (companyIndex === activeCompanyIndex) {
    return getBuildingsCurrentIncomePerSecond(tickerBuildings, Date.now());
  }
  return loadCompanyRecord(companyIndex)?.incomeRatePerSecond ?? ZERO;
}

// a company's own "wealth" for cost-splitting purposes: its current total plus a
// projected hour of its own income rate, so a company that earns fast but hasn't
// banked much yet still shoulders a fair share (not just whichever has the
// biggest pile sitting still)
function getCompanyWealth(companyIndex: number): BigNumber {
  const ratePerSecond = getCompanyIncomeRatePerSecond(companyIndex);
  return add(
    getStoredTotalIncome(companyIndex),
    multiply(ratePerSecond, SECONDS_PER_HOUR),
  );
}

const SECONDS_PER_HOUR = 3600;

// the actual "money sink" design goal (see hud/corporationBoostMenu's stock-price
// boosts): richer companies foot proportionally more of any corp boost/upgrade's
// cost, draining their own excess wealth to fund something that benefits every
// company equally (see corporationBoostMenu's getGlobalIncomeBoostMultiplier,
// applied globally regardless of which company is currently active) — so a brand
// new company starts out already boosted by whatever earlier ones paid into.
// Splits cost proportionally across every corporation's own wealth (see
// getCompanyWealth). Any company whose computed share would exceed what it
// actually has instead pays exactly what it has and drops out, with the
// remaining cost re-split across the rest by their own wealth (a
// "water-filling" pass, repeated until nothing is over-capped) — so no company
// ever gets driven into the negative. Returns false (spending nothing) if the
// combined total across every company can't cover cost at all. The proportional
// split itself (weightSum/share ratios) is done in plain lossy `number` space —
// safe here because it's only ever comparing/dividing WEALTH RATIOS (0..1-ish
// fractions), never raw magnitudes, so precision loss at extreme scale doesn't
// change which companies get capped or their relative shares
export function spendFromAllCompanies(cost: BigNumber): boolean {
  const count = getCorporationCount();
  const totals = Array.from({ length: count }, (_, i) =>
    getStoredTotalIncome(i),
  );
  const combinedTotal = totals.reduce((sum, total) => add(sum, total), ZERO);
  if (lt(combinedTotal, cost)) return false;

  const weights = Array.from({ length: count }, (_, i) =>
    toNumber(getCompanyWealth(i)),
  );
  const totalNumbers = totals.map((total) => toNumber(total));
  const paid = new Array(count).fill(0);
  const active = new Set(Array.from({ length: count }, (_, i) => i));
  let unallocated = toNumber(cost);

  while (unallocated > 1e-9 && active.size > 0) {
    const weightSum = Array.from(active).reduce(
      (sum, i) => sum + weights[i],
      0,
    );
    let anyCapped = false;
    for (const i of Array.from(active)) {
      const share =
        weightSum > 0
          ? (unallocated * weights[i]) / weightSum
          : unallocated / active.size;
      const available = totalNumbers[i] - paid[i];
      if (share >= available) {
        paid[i] += available;
        unallocated -= available;
        active.delete(i);
        anyCapped = true;
      }
    }
    if (!anyCapped) {
      // every remaining company's share fits within its own funds — settle them
      // all at once instead of looping again
      const finalWeightSum = Array.from(active).reduce(
        (sum, i) => sum + weights[i],
        0,
      );
      for (const i of active) {
        paid[i] +=
          finalWeightSum > 0
            ? (unallocated * weights[i]) / finalWeightSum
            : unallocated / active.size;
      }
      unallocated = 0;
    }
  }

  for (let i = 0; i < count; i++) {
    if (paid[i] > 0) adjustStoredTotalIncome(i, fromNumber(paid[i]), -1);
  }
  return true;
}

export function clearTotalIncome(): void {
  // also zero the in-memory value: location.reload() fires beforeunload first,
  // and that handler re-saves whatever totalIncome currently holds
  totalIncome = ZERO;
  clearCompanyRecord(activeCompanyIndex);
}

const SAVE_INTERVAL_MS = 1000;

// which company's total the module-level totalIncome/tickerBuildings below
// currently belong to — swapped by switchActiveCompany, never shared across
// companies (see company.ts)
let activeCompanyIndex = getActiveCompanyIndex();
let totalIncome: BigNumber =
  loadCompanyRecord(activeCompanyIndex)?.bankedTotal ?? ZERO;
// whichever company's buildings the ticker is currently collecting idle income
// from; set by startTotalIncomeTicker at startup, swapped by switchActiveCompany
let tickerBuildings: Floor[][] = [];

// call when the player switches to a different company (see cityMap's barrel
// roll / main.ts): main.ts's switchToCompany has ALREADY snapshotted the
// outgoing company's own CompanyRecord (bankedTotal/rate/value, all together in
// one write) before calling this, so this just flips which company's live
// totalIncome/tickerBuildings are in memory — its floors' own lastCollectedAt
// timestamps mean the very next tick correctly pays out however much idle
// income piled up while this company wasn't active
export function switchActiveCompany(
  companyIndex: number,
  buildings: Floor[][],
): void {
  activeCompanyIndex = companyIndex;
  totalIncome = loadCompanyRecord(companyIndex)?.bankedTotal ?? ZERO;
  tickerBuildings = buildings;
}

// pays out each unlocked floor's income (across every building) only once its fill-bar
// cycle actually completes, instead of accruing fractional $ continuously underneath a
// bar that looks stepped. Uses setInterval (not requestAnimationFrame) so floor.
// lastCollectedAt keeps advancing even while this tab is open but unfocused/backgrounded
// — browsers throttle rAF to near-zero there, which let it go stale for however long the
// tab sat in the background, so gameState.ts's computeIdleIncome wrongly treated that
// whole span as idle time on the next load even though the tab was never closed.
// Also catches up immediately on visibilitychange, in case the interval itself got
// suspended for a long background/sleep stretch. reads tickerBuildings fresh every
// tick, so a building bought later — or a whole different company switched in via
// switchActiveCompany — is automatically included without needing to restart this.
// read the running total via getTotalIncome()
const COLLECT_INTERVAL_MS = 200;

// multiplies every $ collected below — main.ts wires this to
// hud/corporationBoostMenu's getGlobalIncomeBoostMultiplier (stock-price
// modifiers), passed in rather than imported directly to avoid a totalIncome ->
// hud -> floors -> totalIncome import cycle (hud already imports from both
// totalIncome and floors)
let incomeBoostMultiplier: () => number = () => 1;
// incomeBoostMultiplier() itself is still O(companies) even called just once
// per tick (see collectAll) — a company's stock/value/income doesn't
// meaningfully change within a second, so it's only actually recomputed at
// most this often; every other 200ms tick in between reuses the cached value
const BOOST_MULTIPLIER_CACHE_MS = 1000;
let cachedBoostMultiplier = 1;
let cachedBoostMultiplierAt = 0;

export function startTotalIncomeTicker(
  buildings: Floor[][],
  getIncomeBoostMultiplier?: () => number,
): void {
  tickerBuildings = buildings;
  if (getIncomeBoostMultiplier)
    incomeBoostMultiplier = getIncomeBoostMultiplier;
  let lastSave = performance.now();
  function collectAll(): void {
    // Date.now()-based (not performance.now()) since collectDueIncome now reads/writes
    // floor.lastCollectedAt directly, a persisted Date.now()-based timestamp
    const now = Date.now();
    // hoisted out of the per-floor loop below — incomeBoostMultiplier() (see
    // corporationBoostMenu's getGlobalIncomeBoostPercent) loops over every
    // company doing a localStorage read + JSON.parse per company, so calling it
    // once per floor instead of once per tick made this whole ticker's cost
    // scale with floors × companies every COLLECT_INTERVAL_MS — the single
    // biggest source of "more companies = more stutter" reported on mobile
    if (now - cachedBoostMultiplierAt >= BOOST_MULTIPLIER_CACHE_MS) {
      cachedBoostMultiplier = incomeBoostMultiplier();
      cachedBoostMultiplierAt = now;
    }
    for (const floors of tickerBuildings) {
      for (const floor of floors) {
        if (!floor.unlocked) continue;
        totalIncome = add(
          totalIncome,
          multiply(collectDueIncome(floor, now), cachedBoostMultiplier),
        );
      }
    }

    const nowPerf = performance.now();
    if (nowPerf - lastSave >= SAVE_INTERVAL_MS) {
      lastSave = nowPerf;
      // same guard as the beforeunload save below — otherwise this periodic
      // autosave would silently undo a manual localStorage clear within ~1s of
      // it happening, even before the player gets a chance to close the tab
      if (isStorageIntact()) snapshotActiveCompanyRecord();
    }
  }

  setInterval(collectAll, COLLECT_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") collectAll();
  });

  window.addEventListener("beforeunload", () => {
    if (!isStorageIntact()) return;
    snapshotActiveCompanyRecord();
  });
}

// refreshes the ACTIVE company's own CompanyRecord (bankedTotal + rate,
// together) so it's never far out of date even if the session ends without an
// explicit company switch (crash, force-quit) — assetValue is preserved as-is
// since computing it needs hud/corporationBoostMenu's pricing logic, which this
// module deliberately never imports (see incomeBoostMultiplier's own comment) ;
// it's only ever fully refreshed by main.ts's switchToCompany snapshot
function snapshotActiveCompanyRecord(): void {
  const existing = loadCompanyRecord(activeCompanyIndex);
  saveCompanyRecord(activeCompanyIndex, {
    bankedTotal: totalIncome,
    incomeRatePerSecond: getBuildingsCurrentIncomePerSecond(
      tickerBuildings,
      Date.now(),
    ),
    assetValue: existing?.assetValue ?? ZERO,
    upgradesValue: existing?.upgradesValue ?? ZERO,
    updatedAt: Date.now(),
  });
}
