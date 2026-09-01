import { loadBuildings, type Floor } from "../../gameState";
import {
  spendFromAllCompanies,
  getStoredTotalIncome,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import { getCorporationCount } from "../../corporationName";
import { getBuildingPrice } from "../../buildings";
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
