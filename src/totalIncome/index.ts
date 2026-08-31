import {
  isStorageIntact,
  loadBuildings,
  getBuildingsIncomePerSecond,
  type Floor,
} from "../gameState";
import { collectDueIncome } from "../floors";
import { getActiveCompanyIndex, companyStorageKey } from "../company";
import { getCorporationCount } from "../corporationName";

export function getTotalIncome(): number {
  return totalIncome;
}

// reads any company's own running total (not just the currently active one) —
// the active company's in-memory value (freshest, may not be saved yet), every
// other company's last-persisted one (see corporationBoostMenu.ts's "Corporation
// assets" summary, which sums this across every company)
export function getStoredTotalIncome(companyIndex: number): number {
  return companyIndex === activeCompanyIndex
    ? totalIncome
    : loadStoredTotal(companyIndex);
}

// combined totalIncome across every corporation — every corp boost/upgrade
// (companySelectMenu's "Create new Company", corporationBoostMenu's stock raises)
// draws from this shared pool instead of just the currently active company's own
// wallet, so a rich company can carry a poor one
export function getAllCompaniesTotalIncome(): number {
  const count = getCorporationCount();
  let sum = 0;
  for (let i = 0; i < count; i++) sum += getStoredTotalIncome(i);
  return sum;
}

// deducts amount from the running total if affordable; returns whether the spend succeeded
export function spendTotalIncome(amount: number): boolean {
  if (totalIncome < amount) return false;
  totalIncome -= amount;
  return true;
}

// adds amount to the running total; used by the "Add Money" dev/test control
export function addTotalIncome(amount: number): void {
  totalIncome += amount;
}

// applies delta (positive or negative) to a specific company's own total —
// straight to the live value if it's the active company, otherwise read+write
// its persisted value directly (see spendFromAllCompanies)
function adjustStoredTotalIncome(companyIndex: number, delta: number): void {
  if (companyIndex === activeCompanyIndex) {
    totalIncome += delta;
  } else {
    saveStoredTotal(companyIndex, loadStoredTotal(companyIndex) + delta);
  }
}

// a company's own "wealth" for cost-splitting purposes: its current total plus a
// projected hour of its own income rate, so a company that earns fast but hasn't
// banked much yet still shoulders a fair share (not just whichever has the
// biggest pile sitting still). Reads the active company's own LIVE buildings
// (freshest) and every other company's persisted ones (see corporationBoostMenu's
// getStockRaiseCost, same read-only-for-inactive-companies approach)
function getCompanyWealth(companyIndex: number): number {
  const buildings =
    companyIndex === activeCompanyIndex
      ? tickerBuildings
      : loadBuildings(companyIndex);
  const ratePerSecond = getBuildingsIncomePerSecond(buildings);
  return getStoredTotalIncome(companyIndex) + ratePerSecond * SECONDS_PER_HOUR;
}

const SECONDS_PER_HOUR = 3600;

// splits cost proportionally across every corporation's own wealth (see
// getCompanyWealth) — richer companies shoulder proportionally more of it. Any
// company whose computed share would exceed what it actually has instead pays
// exactly what it has and drops out, with the remaining cost re-split across the
// rest by their own wealth (a "water-filling" pass, repeated until nothing is
// over-capped) — so no company ever gets driven into the negative. Returns false
// (spending nothing) if the combined total across every company can't cover cost
// at all
export function spendFromAllCompanies(cost: number): boolean {
  const count = getCorporationCount();
  const totals = Array.from({ length: count }, (_, i) =>
    getStoredTotalIncome(i),
  );
  if (totals.reduce((sum, total) => sum + total, 0) < cost) return false;

  const weights = Array.from({ length: count }, (_, i) => getCompanyWealth(i));
  const paid = new Array(count).fill(0);
  const active = new Set(Array.from({ length: count }, (_, i) => i));
  let unallocated = cost;

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
      const available = totals[i] - paid[i];
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
    if (paid[i] > 0) adjustStoredTotalIncome(i, -paid[i]);
  }
  return true;
}

export function clearTotalIncome(): void {
  // also zero the in-memory value: location.reload() fires beforeunload first,
  // and that handler re-saves whatever totalIncome currently holds
  totalIncome = 0;
  try {
    localStorage.removeItem(companyStorageKey(STORAGE_KEY, activeCompanyIndex));
  } catch {
    // storage unavailable: nothing to clear
  }
}

const STORAGE_KEY = "cash-clicker:total-income";
const SAVE_INTERVAL_MS = 1000;

function loadStoredTotal(companyIndex: number): number {
  try {
    const value = Number(
      localStorage.getItem(companyStorageKey(STORAGE_KEY, companyIndex)),
    );
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveStoredTotal(companyIndex: number, value: number): void {
  try {
    localStorage.setItem(
      companyStorageKey(STORAGE_KEY, companyIndex),
      String(value),
    );
  } catch {
    // storage unavailable/full: persistence is a nice-to-have, safe to ignore
  }
}

// which company's total the module-level totalIncome/tickerBuildings below
// currently belong to — swapped by switchActiveCompany, never shared across
// companies (see company.ts)
let activeCompanyIndex = getActiveCompanyIndex();
let totalIncome = loadStoredTotal(activeCompanyIndex);
// whichever company's buildings the ticker is currently collecting idle income
// from; set by startTotalIncomeTicker at startup, swapped by switchActiveCompany
let tickerBuildings: Floor[][] = [];

// call when the player switches to a different company (see cityMap's barrel
// roll / main.ts): saves the outgoing company's total immediately, then loads
// the new one's own total and points the running ticker at its own buildings —
// its floors' own lastCollectedAt timestamps mean the very next tick correctly
// pays out however much idle income piled up while this company wasn't active
export function switchActiveCompany(
  companyIndex: number,
  buildings: Floor[][],
): void {
  saveStoredTotal(activeCompanyIndex, totalIncome);
  activeCompanyIndex = companyIndex;
  totalIncome = loadStoredTotal(companyIndex);
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
    for (const floors of tickerBuildings) {
      for (const floor of floors) {
        if (!floor.unlocked) continue;
        totalIncome += collectDueIncome(floor, now) * incomeBoostMultiplier();
      }
    }

    const nowPerf = performance.now();
    if (nowPerf - lastSave >= SAVE_INTERVAL_MS) {
      lastSave = nowPerf;
      // same guard as the beforeunload save below — otherwise this periodic
      // autosave would silently undo a manual localStorage clear within ~1s of
      // it happening, even before the player gets a chance to close the tab
      if (isStorageIntact()) saveStoredTotal(activeCompanyIndex, totalIncome);
    }
  }

  setInterval(collectAll, COLLECT_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") collectAll();
  });

  window.addEventListener("beforeunload", () => {
    if (!isStorageIntact()) return;
    saveStoredTotal(activeCompanyIndex, totalIncome);
  });
}
