import { loadBuildings, type Floor } from "../../gameState";
import {
  spendFromAllCompanies,
  spendCompanyTotalIncome,
  getStoredTotalIncome,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import {
  increaseIncomeRate,
  unlockFloor,
  ensureLockedFloorAbove,
  rollFloorBuyCrit,
} from "../../floors";
import {
  getOfficeChairsCost,
  getOfficeSuppliesCost,
  getWorkerCost,
  getManagerCost,
  isManagerUnlocked,
} from "../upgradeMenu";
import { MAX_RENDERED_WORKERS } from "../../floors";
import { getCorporationCount } from "../../corporationName";
import { getBuildingPrice, getBuildingMultiplier } from "../../buildings";
import { getBackgroundUrls } from "../../loadAssets";
import {
  companyStorageKey,
  getActiveCompanyIndex,
  loadCompanyRecord,
} from "../../company";

// pure $ economy for the Corporation Boosts dialog (stock price / press
// conference / company value / global boost math) — split out of index.ts,
// which owns only the dialog's DOM markup + wiring. Nothing in this file
// touches the DOM or canvas.

// each corporation's own purchased "shares" — starts at 1 and goes up 1 per
// purchase, separate from (and never affecting) its totalIncome/buildings. Each
// purchase adds a flat +0.01% to the modifier (see getStockContributionPercent
// below) — company value plays no part in this, only in getCompanyBaseModifierPercent
const STOCK_PRICE_KEY = "cash-clicker:stock-price";
const STOCK_PRICE_BASE = 1;
const STOCK_PRICE_STEP = 1;

function loadStockShares(companyIndex: number): number {
  try {
    const raw = localStorage.getItem(
      companyStorageKey(STOCK_PRICE_KEY, companyIndex),
    );
    const parsed = raw !== null ? Number(raw) : STOCK_PRICE_BASE;
    return Number.isFinite(parsed) ? parsed : STOCK_PRICE_BASE;
  } catch {
    return STOCK_PRICE_BASE;
  }
}

function saveStockShares(companyIndex: number, value: number): void {
  try {
    localStorage.setItem(
      companyStorageKey(STOCK_PRICE_KEY, companyIndex),
      String(value),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}

// wipes every corporation's purchased shares; call alongside clearCorporationNames
// on a full game reset, so a fresh game doesn't inherit old stock-price upgrades
export function clearStockPrices(): void {
  const count = getCorporationCount();
  for (let i = 0; i < count; i++) {
    try {
      localStorage.removeItem(companyStorageKey(STOCK_PRICE_KEY, i));
    } catch {
      // storage unavailable: nothing to clear
    }
  }
  clearMarketInfluence();
  clearFreePressConferences();
}

// how many times a company's stock has actually been raised — the menu shows
// this ("x3") instead of the dollar stock price itself, same "xN" convention as
// the crit-upgrade label (floors/upgradeButton)
export function getStockTimesBought(companyIndex: number): number {
  return loadStockShares(companyIndex) - STOCK_PRICE_BASE;
}

// $ cost to raise a company's stock price once: starts at $1 and doubles every
// time it's already been bought (so the very first raise costs $1, the next
// $2, then $4, ...) — flat regardless of the company's own value/size
const STOCK_RAISE_COST_BASE = 1;

export function getStockRaiseCost(companyIndex: number): number {
  const timesBought = loadStockShares(companyIndex) - STOCK_PRICE_BASE;
  return STOCK_RAISE_COST_BASE * 2 ** timesBought;
}

// raises companyIndex's purchased shares by STOCK_PRICE_STEP if affordable —
// spent proportionally from every corporation's own combined funds (see
// totalIncome.ts's spendFromAllCompanies), not just the currently active one.
// Returns whether it succeeded
export function buyStockRaise(companyIndex: number): boolean {
  if (!spendFromAllCompanies(getStockRaiseCost(companyIndex))) return false;
  saveStockShares(
    companyIndex,
    loadStockShares(companyIndex) + STOCK_PRICE_STEP,
  );
  return true;
}

// $/sec every unlocked floor of every company is currently earning combined —
// same per-company rate getStockRaiseCost uses, just summed across every
// corporation instead of just one
function getAllCompaniesCurrentIncomePerSecond(): number {
  const count = getCorporationCount();
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += getCompanyIncomeRatePerSecond(i);
  }
  return total;
}

const PRESS_CONFERENCE_INCOME_SECONDS = 10 * 60;

// $ cost of the single, not-per-company "Hold press conference" action: every
// company's combined income over 10 minutes at its current rate, flat (unlike
// getStockRaiseCost, this never doubles with repeated purchases)
export function getPressConferenceCost(): number {
  return (
    getAllCompaniesCurrentIncomePerSecond() * PRESS_CONFERENCE_INCOME_SECONDS
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

// raises EVERY company's purchased shares by STOCK_PRICE_STEP at once, for one
// combined cost (see getPressConferenceCost) instead of paying each company's
// own escalating getStockRaiseCost individually — the actual boost comes from
// then playing hud/pressConferenceGame's own mini-game (see Market Influence
// below), this just pays the entry fee. A banked free credit (see
// grantFreePressConference) is always spent first. Returns whether it succeeded
export function holdPressConference(): boolean {
  const freeCount = loadFreePressConferenceCount();
  if (freeCount > 0) {
    saveFreePressConferenceCount(freeCount - 1);
    return true;
  }
  return spendFromAllCompanies(getPressConferenceCost());
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

// folded into clearStockPrices above so a full game reset doesn't inherit an
// old market-influence modifier either
function clearMarketInfluence(): void {
  try {
    localStorage.removeItem(MARKET_INFLUENCE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

// same as clearMarketInfluence, folded into clearStockPrices
function clearFreePressConferences(): void {
  try {
    localStorage.removeItem(FREE_PRESS_CONFERENCES_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

// $ "invested" in a company's buildings — sum of what each one (after the
// always-free first) cost to unlock, same buildings.ts pricing used everywhere
// else on the map
function getBuildingsValue(buildingCount: number): number {
  let total = 0;
  for (let i = 1; i < buildingCount; i++) total += getBuildingPrice(i);
  return total;
}

// $ "invested" in every floor's upgrades across a company's buildings — each
// upgrade already bought raised that floor's rate by its own rateStep, so this is
// the total $/sec worth of upgrade purchases actually paid for
function getUpgradesValue(buildings: Floor[][]): number {
  let total = 0;
  for (const floors of buildings) {
    for (const floor of floors) {
      total += floor.upgradeCount * floor.rateStep;
    }
  }
  return total;
}

// exported so main.ts can snapshot just the upgrades portion into a company's
// CompanyRecord (see company.ts's upgradesValue field) when it goes dormant —
// getCompanyValue below needs this alone, not bundled with buildings cost
export function getCompanyUpgradesValue(buildings: Floor[][]): number {
  return getUpgradesValue(buildings);
}

// "Building upgrades" section (Corporation Upgrades dialog): lets the player
// act on floors scattered across every one of a company's own buildings
// without having to jump to each building on the map manually, for ANY
// corporation (not just the active one — see corporationUpgradeMenu/index.ts,
// which renders one of these sub-sections per company). Every item below
// (income upgrade, worker, office chairs, office supplies, manager) shares
// this same "whichever eligible floor is currently CHEAPEST" targeting shape,
// and every buyCheapest* below spends from THAT company's own wallet via
// spendCompanyTotalIncome — never assumes the active company
export interface FloorTarget {
  floor: Floor;
  level: number; // 1-indexed position within its own building, for display only
  buildingIndex: number; // which of buildings[] this floor belongs to
}

function findCheapestFloorTarget(
  buildings: Floor[][],
  isEligible: (floor: Floor) => boolean,
  getCost: (floor: Floor) => number,
): FloorTarget | null {
  let best: FloorTarget | null = null;
  buildings.forEach((floors, buildingIndex) => {
    floors.forEach((floor, i) => {
      if (!isEligible(floor)) return;
      if (!best || getCost(floor) < getCost(best.floor)) {
        best = { floor, level: i + 1, buildingIndex };
      }
    });
  });
  return best;
}

// targets whichever LOCKED floor (the one waiting to be bought next — see
// floorLock.ts's ensureLockedFloorAbove, there's always exactly one per
// building) is currently CHEAPEST to unlock across every one of a company's
// buildings
export function getCheapestFloorPurchaseTarget(
  buildings: Floor[][],
): FloorTarget | null {
  return findCheapestFloorTarget(
    buildings,
    (floor) => !floor.unlocked,
    (floor) => floor.unlockCost,
  );
}

// spends companyIndex's own total income, unlocks the target floor, rolls the
// same one-shot permanent crit a normal floor purchase can land (see
// floorLock.ts's unlockFloor/upgradeButton.ts's rollFloorBuyCrit), and queues
// that building's own next locked floor above it — same 3-step sequence
// floorInteractions.ts's hitTestFloorLock click branch runs. notifyFloorAdded
// is only relevant when the bought building happens to be the one currently
// on screen (see corporationUpgradeMenu/index.ts's own caller) — every other
// case is picked up automatically next time that building is switched to.
// Returns whether it succeeded
export function buyCheapestFloor(
  companyIndex: number,
  buildings: Floor[][],
  notifyFloorAdded?: (buildingIndex: number, floor: Floor) => void,
): boolean {
  const target = getCheapestFloorPurchaseTarget(buildings);
  if (!target) return false;
  if (!spendCompanyTotalIncome(companyIndex, target.floor.unlockCost)) {
    return false;
  }
  unlockFloor(target.floor);
  ensureLockedFloorAbove({
    floors: buildings[target.buildingIndex],
    backgroundCount: getBackgroundUrls().length,
    multiplier: getBuildingMultiplier(target.buildingIndex),
    onAdd: (floor) => notifyFloorAdded?.(target.buildingIndex, floor),
  });
  const buyTier = rollFloorBuyCrit();
  if (buyTier) target.floor.critMultiplierTier = buyTier;
  return true;
}

// targets whichever unlocked floor is currently CHEAPEST to upgrade next (not
// the lowest-level one — a high floor that's already been upgraded a lot can
// easily be cheaper right now than a low, never-upgraded floor)
export function getCheapestUpgradeTarget(
  buildings: Floor[][],
): FloorTarget | null {
  return findCheapestFloorTarget(
    buildings,
    (floor) => floor.unlocked,
    (floor) => floor.upgradeCost,
  );
}

// spends companyIndex's own total income (same cost a normal upgrade-button
// click on that floor would charge) and applies one upgrade tick via the same
// incomePanel.ts math the canvas button uses. Returns whether it succeeded
export function buyCheapestUpgrade(
  companyIndex: number,
  buildings: Floor[][],
): boolean {
  const target = getCheapestUpgradeTarget(buildings);
  if (!target) return false;
  if (!spendCompanyTotalIncome(companyIndex, target.floor.upgradeCost)) {
    return false;
  }
  increaseIncomeRate(target.floor);
  return true;
}

// targets whichever unlocked, not-yet-maxed floor is currently cheapest to
// hire another worker for (cost scales with how many workers it already has,
// see upgradeMenu.ts's getWorkerCost)
export function getCheapestWorkerTarget(
  buildings: Floor[][],
): FloorTarget | null {
  return findCheapestFloorTarget(
    buildings,
    (floor) => floor.unlocked && floor.workerCount < MAX_RENDERED_WORKERS,
    getWorkerCost,
  );
}

export function buyCheapestWorker(
  companyIndex: number,
  buildings: Floor[][],
): boolean {
  const target = getCheapestWorkerTarget(buildings);
  if (!target) return false;
  if (!spendCompanyTotalIncome(companyIndex, getWorkerCost(target.floor))) {
    return false;
  }
  target.floor.workerCount += 1;
  return true;
}

// targets whichever unlocked floor WITHOUT office chairs yet is cheapest to
// buy them for (cost scales with floor level, see upgradeMenu.ts's
// getOfficeChairsCost). null once every unlocked floor already has chairs,
// which the caller uses to block the button
export function getCheapestOfficeChairsTarget(
  buildings: Floor[][],
): FloorTarget | null {
  return findCheapestFloorTarget(
    buildings,
    (floor) => floor.unlocked && !floor.hasOfficeChairs,
    getOfficeChairsCost,
  );
}

export function buyCheapestOfficeChairs(
  companyIndex: number,
  buildings: Floor[][],
): boolean {
  const target = getCheapestOfficeChairsTarget(buildings);
  if (!target) return false;
  if (
    !spendCompanyTotalIncome(companyIndex, getOfficeChairsCost(target.floor))
  ) {
    return false;
  }
  target.floor.hasOfficeChairs = true;
  return true;
}

// same shape as office chairs above, for the office-supplies one-time purchase
export function getCheapestOfficeSuppliesTarget(
  buildings: Floor[][],
): FloorTarget | null {
  return findCheapestFloorTarget(
    buildings,
    (floor) => floor.unlocked && !floor.hasOfficeSupplies,
    getOfficeSuppliesCost,
  );
}

export function buyCheapestOfficeSupplies(
  companyIndex: number,
  buildings: Floor[][],
): boolean {
  const target = getCheapestOfficeSuppliesTarget(buildings);
  if (!target) return false;
  if (
    !spendCompanyTotalIncome(companyIndex, getOfficeSuppliesCost(target.floor))
  ) {
    return false;
  }
  target.floor.hasOfficeSupplies = true;
  return true;
}

// same shape again, for the manager one-time purchase — additionally gated
// behind isManagerUnlocked (a floor needs enough upgrades bought first), same
// requirement upgradeMenu.ts's own per-floor manager item enforces
export function getCheapestManagerTarget(
  buildings: Floor[][],
): FloorTarget | null {
  return findCheapestFloorTarget(
    buildings,
    (floor) => floor.unlocked && !floor.hasManager && isManagerUnlocked(floor),
    getManagerCost,
  );
}

export function buyCheapestManager(
  companyIndex: number,
  buildings: Floor[][],
): boolean {
  const target = getCheapestManagerTarget(buildings);
  if (!target) return false;
  if (!spendCompanyTotalIncome(companyIndex, getManagerCost(target.floor))) {
    return false;
  }
  target.floor.hasManager = true;
  return true;
}

// buildings value + upgrades value combined — exported so main.ts can snapshot
// a company's CompanyRecord (see company.ts) at the exact moment it goes
// dormant, without duplicating this pricing logic there
export function getCompanyAssetValue(buildings: Floor[][]): number {
  return getBuildingsValue(buildings.length) + getUpgradesValue(buildings);
}

// a company's overall value — its own current total income (bank money) plus
// the $ sunk into its floors' upgrades — the base a stock-price contribution
// below is weighted against, and getStockRaiseCost's own cost basis. Buildings
// cost is deliberately NOT part of this: it was included before, and since
// total income (the player's actual spendable cash) is already one of the two
// terms, every stock raise's cost ended up landing right around "everything
// you currently have", wiping a company's cash to ~0 on the very first
// purchase. The active company reads its own live buildings (freshest); any
// dormant company reads its persisted CompanyRecord's upgradesValue instead of
// ever loading its full buildings/floors array
function getCompanyValue(companyIndex: number): number {
  if (companyIndex === getActiveCompanyIndex()) {
    return (
      getUpgradesValue(loadBuildings(companyIndex)) +
      getStoredTotalIncome(companyIndex)
    );
  }
  const upgradesValue = loadCompanyRecord(companyIndex)?.upgradesValue ?? 0;
  return upgradesValue + getStoredTotalIncome(companyIndex);
}

// how much a company's stock price contributes to the combined income boost:
// a flat +0.01% per purchase, regardless of the company's own value/size —
// company value only ever factors into getCompanyBaseModifierPercent below
const STOCK_CONTRIBUTION_PER_PURCHASE = 0.01;

export function getStockContributionPercent(companyIndex: number): number {
  return getStockTimesBought(companyIndex) * STOCK_CONTRIBUTION_PER_PURCHASE;
}

// a baseline % every company contributes purely from its own size, on top of
// (never instead of) getStockContributionPercent above — so a company that's
// never bought a single stock raise still scales up a little as it grows.
// sqrt(log10(value)) instead of a plain log10 or sqrt(value): log10 alone
// already compresses illion-scale late-game values down to a small number of
// "points" (see getStockContributionPercent's own comment), and taking the
// sqrt of THAT compresses it a second time — so a company many orders of
// magnitude bigger than another still only ends up a few points higher, never
// an absurd %, while still strictly increasing with value
const BASE_MODIFIER_RATE = 0.5;

export function getCompanyBaseModifierPercent(companyIndex: number): number {
  const companyValue = Math.max(10, getCompanyValue(companyIndex));
  return Math.sqrt(Math.log10(companyValue)) * BASE_MODIFIER_RATE;
}

// summed across every corporation plus the market-influence modifier — the
// actual global income boost applied to every floor of every building of every
// company (see totalIncome.ts's startTotalIncomeTicker/gameState.ts's
// computeIdleIncome, both take this as an injected multiplier to avoid a
// circular import back into this hud module). Market Influence contributes its
// own raw banked % directly, 1:1 — no leverage/scaling against anything else,
// so whatever a mini-game round banked is exactly what shows up here
export function getGlobalIncomeBoostPercent(): number {
  const count = getCorporationCount();
  let total = getMarketInfluencePercent();
  for (let i = 0; i < count; i++) {
    total += getStockContributionPercent(i) + getCompanyBaseModifierPercent(i);
  }
  return total;
}

export function getGlobalIncomeBoostMultiplier(): number {
  return 1 + getGlobalIncomeBoostPercent() / 100;
}

// +N.NN% — the leading + marks it as always an increase, never a penalty; plain
// fixed-point since getStockContributionPercent now keeps this comfortably small
export function formatBoostPercent(percent: number): string {
  return `+${percent.toFixed(2)}%`;
}
