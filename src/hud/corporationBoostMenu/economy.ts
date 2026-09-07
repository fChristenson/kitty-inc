import { loadBuildings, clearBuildings, type Floor } from "../../gameState";
import {
  spendFromAllCompanies,
  spendCompanyTotalIncome,
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
  companyStorageKey,
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
  pow,
  max,
  min,
  isZero,
  log10,
} from "../../shared/bigNumber";

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
  clearInvestmentPortfolio();
}

// how many times a company's stock has actually been raised — the menu shows
// this ("x3") instead of the dollar stock price itself, same "xN" convention as
// the crit-upgrade label (floors/upgradeButton)
export function getStockTimesBought(companyIndex: number): number {
  return loadStockShares(companyIndex) - STOCK_PRICE_BASE;
}

// $ cost to raise a company's stock price once: starts at $1 and doubles every
// time it's already been bought (so the very first raise costs $1, the next
// $2, then $4, ...) — flat regardless of the company's own value/size. Uses
// shared/bigNumber's pow (never a raw `**`), so this stays finite no matter
// how many times stock has already been raised
const STOCK_RAISE_COST_BASE = 1;

export function getStockRaiseCost(companyIndex: number): BigNumber {
  const timesBought = loadStockShares(companyIndex) - STOCK_PRICE_BASE;
  return multiply(pow(2, timesBought), STOCK_RAISE_COST_BASE);
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

// $ cost of opening any minigame ("Hold press conference"/"Secure stock
// price"/"Declare taxes"/"Use tax haven"): a flat number of seconds of every
// company's own combined current income rate, not tied to any one company's
// assets — so it stays affordable (and meaningful) at any point in the
// game's progression the same way a wealth-proportional cost would, without
// needing a company's own banked total or upgrades to be large yet. Kept
// well under the real-world time it actually takes to re-earn it (rather
// than an exact 1:1 "N seconds of the reported rate") — floor income arrives
// in per-floor cycle-based lumps, not a smooth continuous drip, so the
// derived rate is only ever an average and a player draining to $0 (e.g. via
// "Invest in the market") can otherwise end up waiting noticeably longer
// than the rate alone would suggest before enough lumps have actually landed
const MINIGAME_ENTRY_SECONDS_COST = 10;

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

// raises EVERY company's purchased shares by STOCK_PRICE_STEP at once, for one
// combined cost (see getMinigameEntryCost) instead of paying each company's
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

// "Investment portfolio %" — earned via "Invest in the market" below. Kept
// as its OWN modifier, separate from Market Influence (which is earned via
// hud/pressConferenceGame's mini-game instead), so the two income sources
// track independently. Contributes directly, 1:1, to the global boost (see
// getGlobalIncomeBoostPercent) — same as Market Influence, no leverage/
// scaling/cap of any kind
const INVESTMENT_PORTFOLIO_KEY = "cash-clicker:investment-portfolio-percent";

export function getInvestmentPortfolioPercent(): number {
  try {
    const raw = localStorage.getItem(INVESTMENT_PORTFOLIO_KEY);
    const parsed = raw !== null ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function addInvestmentPortfolioPercent(delta: number): void {
  try {
    localStorage.setItem(
      INVESTMENT_PORTFOLIO_KEY,
      String(Math.max(0, getInvestmentPortfolioPercent() + delta)),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}

// "Secured assets %" — earned by playing hud/liquidateAssetsGame's own
// "Avoid market drop" mini-game, banked once per round via
// addSecuredAssetsPercent; kept as its own modifier, separate from Market
// Influence/Investment Portfolio. Contributes directly, 1:1, to the global
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

// "Assets moved %" — earned by playing hud/taxHavenGame's own "Tax Haven"
// mini-game, banked once per round via addAssetsMovedPercent; kept as its
// own modifier, separate from every other one above. Contributes directly,
// 1:1, to the global boost (see getGlobalIncomeBoostPercent), same as those,
// no leverage/scaling/cap of any kind
const ASSETS_MOVED_KEY = "cash-clicker:assets-moved-percent";

export function getAssetsMovedPercent(): number {
  try {
    const raw = localStorage.getItem(ASSETS_MOVED_KEY);
    const parsed = raw !== null ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

// banks additional assets-moved % earned just now (delta can be negative,
// but the running total is floored at 0)
export function addAssetsMovedPercent(delta: number): void {
  try {
    localStorage.setItem(
      ASSETS_MOVED_KEY,
      String(Math.max(0, getAssetsMovedPercent() + delta)),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}

// "Invest in the market" — a cash sink that trades money for Investment
// Portfolio %, always usable regardless of current income. Taking
// INVEST_PERCENT (10%) of each company's own CURRENT total on every press
// compounds (0.9x remaining each time) and mathematically never reaches
// exact $0 no matter how long it's held. Instead each press takes 10% of a
// snapshot of every company's total captured once at hold-start
// (beginInvestHold) — a fixed dollar amount per press, so exactly 10
// presses fully drains every company's starting balance, guaranteeing the
// hold finishes well within a bounded time no matter how much money there is
const INVEST_PERCENT = 0.1;

// call once when a hold gesture starts; snapshot is keyed by company index
export function beginInvestHold(): BigNumber[] {
  const count = getCorporationCount();
  const snapshot: BigNumber[] = [];
  for (let i = 0; i < count; i++) {
    snapshot[i] = getStoredTotalIncome(i);
  }
  return snapshot;
}

// drains INVEST_PERCENT of every company's own hold-start snapshot total
// independently (so a poor company only ever loses its own small share,
// never someone else's), capped to whatever that company actually still has
// (in case something else spent from it mid-hold), then banks a log-scaled
// Investment Portfolio % gain off however much was actually drained across
// all of them combined this one press — same sqrt(log10(value)) conversion
// getCompanyBaseModifierPercent uses, so a bigger single drain is worth more
// without ever going negative/infinite. Returns the % just gained, or null
// if every company's snapshot share had nothing left to drain
export function investInMarket(holdStartTotals: BigNumber[]): number | null {
  const count = getCorporationCount();
  let totalDrained: BigNumber = ZERO;
  for (let i = 0; i < count; i++) {
    const startTotal = holdStartTotals[i];
    if (!startTotal || isZero(startTotal)) continue;
    const current = getStoredTotalIncome(i);
    if (isZero(current)) continue;
    const target = multiply(startTotal, INVEST_PERCENT);
    const amount = min(target, current);
    if (isZero(amount)) continue;
    spendCompanyTotalIncome(i, amount);
    totalDrained = add(totalDrained, amount);
  }
  if (isZero(totalDrained)) return null;
  const logDrained = log10(totalDrained);
  if (!Number.isFinite(logDrained) || logDrained < 0) return null;
  const gain = Math.sqrt(logDrained) * BASE_MODIFIER_RATE;
  addInvestmentPortfolioPercent(gain);
  return gain;
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

// same as clearMarketInfluence, folded into clearStockPrices
function clearInvestmentPortfolio(): void {
  try {
    localStorage.removeItem(INVESTMENT_PORTFOLIO_KEY);
  } catch {
    // storage unavailable: nothing to clear
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

// buildings value + upgrades value combined — exported so main.ts can snapshot
// a company's CompanyRecord (see company.ts) at the exact moment it goes
// dormant, without duplicating this pricing logic there
export function getCompanyAssetValue(buildings: Floor[][]): BigNumber {
  return add(getBuildingsValue(buildings.length), getUpgradesValue(buildings));
}

// hud/corporationUpgradeMenu's "Merge" action: picks whichever selected company
// has the most overall progress (total floor count across every one of its
// buildings — the simplest holistic "how far into the game is this company"
// signal) to survive, folds every other selected company's own total income +
// upgrades value into the survivor's total, and adds their stock shares to the
// survivor's own share count (see getStockContributionPercent). The merged-away
// companies are left permanently empty (0 floors, $0, 0 shares) and hidden from
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
  let addedShares = 0;
  for (const index of companyIndices) {
    if (index === survivorIndex) continue;
    addedTotal = add(
      addedTotal,
      add(
        getStoredTotalIncome(index),
        getUpgradesValue(buildingsByIndex.get(index) ?? []),
      ),
    );
    addedShares += getStockTimesBought(index);
    clearBuildings(index);
    clearCompanyRecord(index);
    saveStockShares(index, STOCK_PRICE_BASE);
  }
  // stock shares saved BEFORE folding in the merged-away companies' total
  // income: getCompanyBaseModifierPercent/getCompanyValue read a company's
  // CURRENT totalIncome live, so writing the new (bigger) total first and the
  // share count second briefly left the survivor's modifier computed off a
  // pre-merge share count against an already-inflated total — reported as
  // "loss of stock modifiers" right after merging
  if (addedShares > 0) {
    saveStockShares(
      survivorIndex,
      loadStockShares(survivorIndex) + addedShares,
    );
  }
  addCompanyTotalIncome(survivorIndex, addedTotal);
  // merging multiple companies into one banks a free conference for the survivor
  grantFreePressConference();

  markCompaniesMerged(
    companyIndices.filter((index) => index !== survivorIndex),
  );
  return { survivorIndex, name: regenerateCorporationName(survivorIndex) };
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
function getCompanyValue(companyIndex: number): BigNumber {
  if (companyIndex === getActiveCompanyIndex()) {
    return add(
      getUpgradesValue(loadBuildings(companyIndex)),
      getStoredTotalIncome(companyIndex),
    );
  }
  const upgradesValue = loadCompanyRecord(companyIndex)?.upgradesValue ?? ZERO;
  return add(upgradesValue, getStoredTotalIncome(companyIndex));
}

// how much a company's stock price contributes to the combined income boost:
// a flat +0.01% per purchase, regardless of the company's own value/size —
// company value only ever factors into getCompanyBaseModifierPercent below
export const STOCK_CONTRIBUTION_PER_PURCHASE = 0.01;

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
  const companyValue = max(fromNumber(10), getCompanyValue(companyIndex));
  return Math.sqrt(log10(companyValue)) * BASE_MODIFIER_RATE;
}

// summed across every corporation plus the market-influence AND investment-
// portfolio modifiers — the actual global income boost applied to every
// floor of every building of every company (see totalIncome.ts's
// startTotalIncomeTicker/gameState.ts's computeIdleIncome, both take this as
// an injected multiplier to avoid a circular import back into this hud
// module). Both contribute their own raw banked % directly, 1:1 — no
// leverage/scaling against anything else, so whatever's banked is exactly
// what shows up here
export function getGlobalIncomeBoostPercent(): number {
  const count = getCorporationCount();
  let total =
    getMarketInfluencePercent() +
    getInvestmentPortfolioPercent() +
    getSecuredAssetsPercent() +
    getTaxRebatePercent() +
    getAssetsMovedPercent();
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
