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
// purchase, separate from (and never affecting) its totalIncome/buildings. The
// DISPLAYED/effective stock price (see getStockPrice below) is these shares
// diluted by how much the company has grown since, not this raw count itself
const STOCK_PRICE_KEY = "cash-clicker:stock-price";
const STOCK_PRICE_BASE = 1;
const STOCK_PRICE_STEP = 1;
const SECONDS_PER_HOUR = 3600;

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

// the stock price actually shown/used everywhere (menu display, boost formula):
// raw purchased shares diluted by log10 of the company's own current value, so
// buying cheap while a company is small doesn't just compound into a permanently
// bigger price/boost forever as that same company grows huge afterward — it
// balances back out, the same way real share dilution works. log10 (not the raw
// value) so this stays a gentle, gradual drop rather than crushing the price to
// nothing the instant a company's value gets big — floored at $1 so dilution
// alone can never push it below its own starting price
export function getStockPrice(companyIndex: number): number {
  const shares = loadStockShares(companyIndex);
  const companyValue = Math.max(10, getCompanyValue(companyIndex));
  return Math.max(STOCK_PRICE_BASE, shares / Math.log10(companyValue));
}

// how many times a company's stock has actually been raised — the menu shows
// this ("x3") instead of the dollar stock price itself, same "xN" convention as
// the crit-upgrade label (floors/upgradeButton)
export function getStockTimesBought(companyIndex: number): number {
  return loadStockShares(companyIndex) - STOCK_PRICE_BASE;
}

// $ cost to raise a company's stock price once: its own total income over a full
// hour at its current rate, doubled for every time it's already been bought (so
// the very first raise costs 1x that hourly income, the next 2x, then 4x, ...)
export function getStockRaiseCost(companyIndex: number): number {
  const timesBought = loadStockShares(companyIndex) - STOCK_PRICE_BASE;
  const baseCost =
    getCompanyIncomeRatePerSecond(companyIndex) * SECONDS_PER_HOUR;
  return baseCost * 2 ** timesBought;
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

// buildings value + upgrades value combined — exported so main.ts can snapshot
// a company's CompanyRecord (see company.ts) at the exact moment it goes
// dormant, without duplicating this pricing logic there
export function getCompanyAssetValue(buildings: Floor[][]): number {
  return getBuildingsValue(buildings.length) + getUpgradesValue(buildings);
}

// a company's overall value — buildings owned + upgrades bought + its own
// current income (wealth) — the base a stock-price contribution below is
// weighted against. The active company reads its own live buildings (freshest);
// any dormant company reads its persisted CompanyRecord's assetValue instead of
// ever loading its full buildings/floors array
function getCompanyValue(companyIndex: number): number {
  if (companyIndex === getActiveCompanyIndex()) {
    return (
      getCompanyAssetValue(loadBuildings(companyIndex)) +
      getStoredTotalIncome(companyIndex)
    );
  }
  const assetValue = loadCompanyRecord(companyIndex)?.assetValue ?? 0;
  return assetValue + getStoredTotalIncome(companyIndex);
}

// how much a company's stock price contributes to the combined income boost.
// stockPrice is already dilution-tempered (see getStockPrice above), so it's
// used directly here — logging it AGAIN on top of that flattened purchases out
// to almost nothing (buying many more shares barely moved the modifier). Only
// companyValue still needs its own log10: it alone can reach illion-scale late
// game, so "10 orders of magnitude bigger" becomes "10 points bigger" instead of
// blowing the percentage up to something needing scientific notation
const STOCK_CONTRIBUTION_RATE = 0.1;

export function getStockContributionPercent(companyIndex: number): number {
  const stockPrice = getStockPrice(companyIndex);
  const companyValue = Math.max(10, getCompanyValue(companyIndex));
  return stockPrice * Math.log10(companyValue) * STOCK_CONTRIBUTION_RATE;
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
  for (let i = 0; i < count; i++) total += getStockContributionPercent(i);
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
