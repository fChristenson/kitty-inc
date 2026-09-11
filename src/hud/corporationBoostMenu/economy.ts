import { loadBuildings, clearBuildings, type Floor } from "../../gameState";
import {
  spendFromAllCompanies,
  getStoredTotalIncome,
  getAllCompaniesIncomeRatePerSecond,
  addCompanyTotalIncome,
} from "../../totalIncome";
import {
  getCorporationCount,
  regenerateCorporationName,
} from "../../corporationName";
import { getBuildingPrice } from "../../buildings";
import {
  getOfficeChairsCost,
  getOfficeSuppliesCost,
  getManagerCost,
  getWorkersInvestedValue,
} from "../upgradeMenu";
import {
  getActiveCompanyIndex,
  loadCompanyRecord,
  clearCompanyRecord,
  markCompaniesMerged,
} from "../../company";
import {
  type BigNumber,
  ZERO,
  fromNumber,
  add,
  multiply,
  max,
  log10,
} from "../../shared/bigNumber";
import { CONFIG } from "../../config";

// pure $ economy for the Corporation Boosts dialog (press conference /
// company value / global boost math) — split out of index.ts, which owns
// only the dialog's DOM markup + wiring. Nothing in this file touches the
// DOM or canvas.

// compresses a $ amount spanning hundreds of orders of magnitude down to a
// small, steadily-growing number via sqrt(log10(amount)) — null once the
// amount is too small to be worth anything (log10 negative, i.e. under $1).
// Every "$ amount -> global-boost %" conversion in this file builds on this
// SAME compression, each applying its own independent rate afterward (see
// getCompanyBaseModifierPercent) — never fold a caller-specific rate in here
function compressedScale(amount: BigNumber): number | null {
  const logAmount = log10(amount);
  if (!Number.isFinite(logAmount) || logAmount < 0) return null;
  return Math.sqrt(logAmount);
}

// $ cost of opening any minigame ("Hold press conference"/"Secure stock
// price"/"Declare taxes"): a flat number of seconds of every
// company's own combined current income rate, not tied to any one company's
// assets — so it stays affordable (and meaningful) at any point in the
// game's progression the same way a wealth-proportional cost would, without
// needing a company's own banked total or upgrades to be large yet. Kept
// well under the real-world time it actually takes to re-earn it (rather
// than an exact 1:1 "N seconds of the reported rate") — floor income arrives
// in per-floor cycle-based lumps, not a smooth continuous drip, so the
// derived rate is only ever an average and a player draining to $0 can
// otherwise end up waiting noticeably longer than the rate alone would
// suggest before enough lumps have actually landed
const MINIGAME_ENTRY_SECONDS_COST = CONFIG.corporation.minigameEntrySecondsCost;

export function getMinigameEntryCost(): BigNumber {
  return multiply(
    getAllCompaniesIncomeRatePerSecond(),
    MINIGAME_ENTRY_SECONDS_COST,
  );
}

// not tied to any one company (same as the press conference action itself) —
// banked whenever main.ts's "Create new Corporation" purchase succeeds (see
// grantFreePressConference), spent here before ever touching real income
const FREE_PRESS_CONFERENCES_KEY = "cash-clicker:free-press-conferences";

function loadFreePressConferenceCount(): number {
  try {
    const raw = localStorage.getItem(FREE_PRESS_CONFERENCES_KEY);
    const parsed = raw !== null ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveFreePressConferenceCount(value: number): void {
  try {
    localStorage.setItem(FREE_PRESS_CONFERENCES_KEY, String(value));
  } catch {
    // storage unavailable: nothing to persist
  }
}

export function getFreePressConferenceCount(): number {
  return loadFreePressConferenceCount();
}

// +1 free press conference — called once per successful "Create new
// Corporation" purchase (see main.ts), so buying a new company always comes
// with one conference paid for already
export function grantFreePressConference(): void {
  saveFreePressConferenceCount(loadFreePressConferenceCount() + 1);
}

// spends a banked free credit (see grantFreePressConference) first, else
// pays the shared getMinigameEntryCost — the actual boost comes from then
// playing hud/pressConferenceGame's own mini-game (see Market Influence
// below), this just pays the entry fee. Returns whether it succeeded
export function holdPressConference(): boolean {
  const freeCount = loadFreePressConferenceCount();
  if (freeCount > 0) {
    saveFreePressConferenceCount(freeCount - 1);
    return true;
  }
  return spendFromAllCompanies(getMinigameEntryCost());
}

// "Market Influence %" — earned by playing hud/pressConferenceGame's own
// mini-game, banked once per round via addMarketInfluencePercent; not tied to
// any one company either. Contributes directly, 1:1, to the global boost (see
// getGlobalIncomeBoostPercent) — no leverage/scaling/cap of any kind
const MARKET_INFLUENCE_KEY = "cash-clicker:market-influence-percent";

export function getMarketInfluencePercent(): number {
  try {
    const raw = localStorage.getItem(MARKET_INFLUENCE_KEY);
    const parsed = raw !== null ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

// banks additional influence earned just now (delta can be negative, but the
// running total is floored at 0)
export function addMarketInfluencePercent(delta: number): void {
  try {
    localStorage.setItem(
      MARKET_INFLUENCE_KEY,
      String(Math.max(0, getMarketInfluencePercent() + delta)),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}

// "Secured assets %" — earned by playing hud/liquidateAssetsGame's own
// "Avoid market drop" mini-game, banked once per round via
// addSecuredAssetsPercent; kept as its own modifier, separate from Market
// Influence. Contributes directly, 1:1, to the global
// boost (see getGlobalIncomeBoostPercent) — same as those, no leverage/
// scaling/cap of any kind
const SECURED_ASSETS_KEY = "cash-clicker:secured-assets-percent";

export function getSecuredAssetsPercent(): number {
  try {
    const raw = localStorage.getItem(SECURED_ASSETS_KEY);
    const parsed = raw !== null ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

// banks additional secured-assets % earned just now (delta can be negative —
// see liquidateAssetsGame's red-line penalty — but the running total is
// floored at 0)
export function addSecuredAssetsPercent(delta: number): void {
  try {
    localStorage.setItem(
      SECURED_ASSETS_KEY,
      String(Math.max(0, getSecuredAssetsPercent() + delta)),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}

// "Tax rebate %" — earned by playing hud/payTaxes's own "Declare Taxes"
// mini-game, banked once per round via addTaxRebatePercent; kept as its own
// modifier, separate from every other one above. Contributes directly, 1:1,
// to the global boost (see getGlobalIncomeBoostPercent), same as those, no
// leverage/scaling/cap of any kind
const TAX_REBATE_KEY = "cash-clicker:tax-rebate-percent";

export function getTaxRebatePercent(): number {
  try {
    const raw = localStorage.getItem(TAX_REBATE_KEY);
    const parsed = raw !== null ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

// banks additional tax-rebate % earned just now (delta can be negative, but
// the running total is floored at 0)
export function addTaxRebatePercent(delta: number): void {
  try {
    localStorage.setItem(
      TAX_REBATE_KEY,
      String(Math.max(0, getTaxRebatePercent() + delta)),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}

// $ "invested" in a company's buildings — sum of what each one (after the
// always-free first) cost to unlock, same buildings.ts pricing used everywhere
// else on the map
function getBuildingsValue(buildingCount: number): BigNumber {
  let total = ZERO;
  for (let i = 1; i < buildingCount; i++)
    total = add(total, getBuildingPrice(i));
  return total;
}

// $ "invested" in every floor's upgrades across a company's buildings — each
// upgrade already bought raised that floor's rate by its own rateStep, so this is
// the total $/sec worth of upgrade purchases actually paid for
function getUpgradesValue(buildings: Floor[][]): BigNumber {
  let total = ZERO;
  for (const floors of buildings) {
    for (const floor of floors) {
      total = add(total, multiply(floor.rateStep, floor.upgradeCount));
    }
  }
  return total;
}

// exported so main.ts can snapshot just the upgrades portion into a company's
// CompanyRecord (see company.ts's upgradesValue field) when it goes dormant —
// getCompanyValue below needs this alone, not bundled with buildings cost
export function getCompanyUpgradesValue(buildings: Floor[][]): BigNumber {
  return getUpgradesValue(buildings);
}

// $ actually PAID to unlock every floor a company owns — a floor's own
// unlockCost is never rewritten after being unlocked, so reading it back is
// the real spend, not a proxy (locked floors haven't been paid for yet, so
// they're excluded)
function getFloorUnlockValue(buildings: Floor[][]): BigNumber {
  let total = ZERO;
  for (const floors of buildings) {
    for (const floor of floors) {
      if (floor.unlocked) total = add(total, floor.unlockCost);
    }
  }
  return total;
}

// $ actually paid hiring workers + the one-time office chairs/supplies/manager
// purchases across every floor — all deterministic from a floor's own current
// state (workerCount, the hasOfficeX flags), so no separate historical spend
// tracking is needed to read back the real amount invested
function getStaffInvestmentValue(buildings: Floor[][]): BigNumber {
  let total = ZERO;
  for (const floors of buildings) {
    for (const floor of floors) {
      if (!floor.unlocked) continue;
      total = add(total, getWorkersInvestedValue(floor));
      if (floor.hasOfficeChairs) total = add(total, getOfficeChairsCost(floor));
      if (floor.hasOfficeSupplies)
        total = add(total, getOfficeSuppliesCost(floor));
      if (floor.hasManager) total = add(total, getManagerCost(floor));
    }
  }
  return total;
}

// buildings value + every other real $ sunk into a company (floor unlocks,
// workers, office purchases, upgrades combined) — exported so main.ts can
// snapshot a company's CompanyRecord (see company.ts) at the exact moment it
// goes dormant, without duplicating this pricing logic there
export function getCompanyAssetValue(buildings: Floor[][]): BigNumber {
  return add(
    add(getBuildingsValue(buildings.length), getUpgradesValue(buildings)),
    add(getFloorUnlockValue(buildings), getStaffInvestmentValue(buildings)),
  );
}

// hud/corporationUpgradeMenu's "Merge" action: picks whichever selected company
// has the most overall progress (total floor count across every one of its
// buildings — the simplest holistic "how far into the game is this company"
// signal) to survive, and folds every other selected company's own total income +
// upgrades value into the survivor's total. The merged-away
// companies are left permanently empty (0 floors, $0) and hidden from
// every company list from then on (see company.ts's isCompanyMerged). Any
// company, including the currently ACTIVE one, can be selected — the caller
// (main.ts) is responsible for switching to the survivor afterward, and if the
// previously-active company was itself merged away, for not letting its own
// stale live in-memory buildings/total get re-snapshotted over the clear this
// function just did (see main.ts's own mergeCompanies wiring / switchToCompany's
// skipOutgoingSnapshot option). Returns the survivor's index + freshly
// generated name, or null if fewer than 2 companies were given
export interface MergeCompaniesResult {
  survivorIndex: number;
  name: string;
}

export function mergeCompanies(
  companyIndices: number[],
): MergeCompaniesResult | null {
  if (companyIndices.length < 2) return null;

  const buildingsByIndex = new Map<number, Floor[][]>();
  for (const index of companyIndices) {
    buildingsByIndex.set(index, loadBuildings(index));
  }
  const progression = (index: number): number =>
    (buildingsByIndex.get(index) ?? []).reduce(
      (sum, floors) => sum + floors.length,
      0,
    );
  const survivorIndex = companyIndices.reduce((best, index) =>
    progression(index) > progression(best) ? index : best,
  );

  let addedTotal = ZERO;
  for (const index of companyIndices) {
    if (index === survivorIndex) continue;
    addedTotal = add(
      addedTotal,
      add(
        getStoredTotalIncome(index),
        getUpgradesValue(buildingsByIndex.get(index) ?? []),
      ),
    );
    clearBuildings(index);
    clearCompanyRecord(index);
  }
  addCompanyTotalIncome(survivorIndex, addedTotal);
  // merging multiple companies into one banks a free conference for the survivor
  grantFreePressConference();

  markCompaniesMerged(
    companyIndices.filter((index) => index !== survivorIndex),
  );
  return { survivorIndex, name: regenerateCorporationName(survivorIndex) };
}

// a company's overall value — the $ actually invested into it, i.e. buildings
// bought + upgrades bought (see getCompanyAssetValue) — the base
// getCompanyBaseModifierPercent below weighs a company's size against.
// Deliberately NOT the company's current banked total income: that's
// unspent/liquid cash, not money put INTO the company, and would let a player
// who just hoards cash without ever spending it inflate this for free. The
// active company reads its own live buildings (freshest); any dormant
// company reads its persisted CompanyRecord's own frozen assetValue instead
// of ever loading its full buildings/floors array
function getCompanyValue(companyIndex: number): BigNumber {
  if (companyIndex === getActiveCompanyIndex()) {
    return getCompanyAssetValue(loadBuildings(companyIndex));
  }
  return loadCompanyRecord(companyIndex)?.assetValue ?? ZERO;
}

// a baseline % every company contributes purely from its own size — so a
// company that's never done anything else still scales up a little as it
// grows. sqrt(log10(value)) instead of a plain log10 or sqrt(value): log10
// alone already compresses illion-scale late-game values down to a small
// number of "points" (see compressedScale's own comment), and taking the
// sqrt of THAT compresses it a second time — so a company many orders of
// magnitude bigger than another still only ends up a few points higher, never
// an absurd %, while still strictly increasing with value
const BASE_MODIFIER_RATE = CONFIG.corporation.baseModifierRate;

export function getCompanyBaseModifierPercent(companyIndex: number): number {
  const companyValue = max(fromNumber(10), getCompanyValue(companyIndex));
  return (compressedScale(companyValue) ?? 0) * BASE_MODIFIER_RATE;
}

// summed across every corporation plus the market-influence modifier — the
// actual global income boost applied to every floor of every building of
// every company (see totalIncome.ts's startTotalIncomeTicker/gameState.ts's
// computeIdleIncome, both take this as an injected multiplier to avoid a
// circular import back into this hud module). Contributes its own raw
// banked % directly, 1:1 — no leverage/scaling against anything else, so
// whatever's banked is exactly what shows up here
export function getGlobalIncomeBoostPercent(): number {
  const count = getCorporationCount();
  let total =
    getMarketInfluencePercent() +
    getSecuredAssetsPercent() +
    getTaxRebatePercent();
  for (let i = 0; i < count; i++) {
    total += getCompanyBaseModifierPercent(i);
  }
  return total;
}

export function getGlobalIncomeBoostMultiplier(): number {
  return 1 + getGlobalIncomeBoostPercent() / 100;
}

// +N.NN% — the leading + marks it as always an increase, never a penalty; plain
// fixed-point since every banked modifier here stays comfortably small
export function formatBoostPercent(percent: number): string {
  return `+${percent.toFixed(2)}%`;
}
