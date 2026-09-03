import { loadBuildings, clearBuildings, type Floor } from "../../gameState";
import {
  spendFromAllCompanies,
  getStoredTotalIncome,
  getAllCompaniesTotalIncome,
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
  gt,
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

// $ cost of the single, not-per-company "Hold press conference" action: 15%
// of every company's own upgrades value summed together, plus every company's
// current total income (getAllCompaniesTotalIncome) — same efficient
// per-company sourcing as getCompanyValue below for the upgrades half: the
// active company's upgrades value is read fresh off its own live buildings,
// every dormant company reads its own persisted CompanyRecord.upgradesValue
// instead of ever loading its full buildings/floors array
const PRESS_CONFERENCE_UPGRADES_VALUE_PERCENT = 0.15;

function getAllCompaniesUpgradesValue(): BigNumber {
  const count = getCorporationCount();
  let total = ZERO;
  for (let i = 0; i < count; i++) {
    total = add(
      total,
      i === getActiveCompanyIndex()
        ? getUpgradesValue(loadBuildings(i))
        : (loadCompanyRecord(i)?.upgradesValue ?? ZERO),
    );
  }
  return total;
}

export function getPressConferenceCost(): BigNumber {
  return multiply(
    add(getAllCompaniesUpgradesValue(), getAllCompaniesTotalIncome()),
    PRESS_CONFERENCE_UPGRADES_VALUE_PERCENT,
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

// "Stimulate economy" — a cash sink that trades money for Market Influence %,
// always usable regardless of current income (never blocked by a fixed cost
// you can't afford, never a no-op once income is negligible). Each press
// within one continuous hold GROWS the cost from STIMULATE_ECONOMY_BASE_COST
// ($10, the first press), reaching referenceTotal (the hold's own starting
// total income, captured once at hold-start — see
// corporationBoostMenu/index.ts's referenceTotal) in EXACTLY
// STIMULATE_ECONOMY_GROWTH_PRESSES presses — a FIXED press count regardless
// of scale (see stimulateEconomyGrowthRatio: the per-press growth RATIO
// scales up with referenceTotal instead, so a bigger fortune gets a bigger
// jump per press rather than needing more presses to cross it — the
// previous fixed-ratio design needed a genuinely huge number of presses to
// cross a genuinely huge total, which just felt like it took forever). The
// final growth press (the peak) is where the schedule "can't grow" any
// further without exceeding the whole economy's worth, and every press
// after that MIRRORS back down the same ratio curve (same distance from the
// peak on either side costs the same) over the SAME fixed press count,
// rather than cliff-dropping straight to "spend everything left" in one
// single press. Once the shrink side would dip below the $10 base cost it
// just holds flat at $10 a press, and once there's less than $10 left the
// usual min(currentTotal, cost) cap below takes over and finishes the drain
// with one final press for whatever small amount actually remains —
// guaranteeing the hold always ends at exactly $0, never overdrawing.
//
// Influence gained scales with sqrt(log10(cost)) * STIMULATE_ECONOMY_GAIN_RATE
// (same "compress an astronomically wide $ range into a small, steadily-
// growing number" idea getCompanyBaseModifierPercent already uses for company
// value) rather than a flat linear rate of the $ spent — cost above can span
// anywhere from $10 to a many-orders-of-magnitude fortune, but Market
// Influence % must stay in a small, sane range (it feeds directly, 1:1, into
// the global income boost), so a linear rate would either be worthless at $10
// or wildly overpowered (tens/hundreds of percent from ONE press) once cost
// reaches the quadrillion+ scale the schedule above is specifically designed
// to reach. Grows without bound (slowly) as cost grows, so a genuinely huge
// spend is still genuinely worth more, and is naturally 0 once cost drops
// below $1 (i.e. total income is fully drained)
const STIMULATE_ECONOMY_BASE_COST = 10;
// fixed press count for the growth side (and, mirrored, the shrink side) —
// a full grow-then-shrink cycle is always 2 * this - 1 presses, regardless
// of referenceTotal's magnitude (see stimulateEconomyGrowthRatio)
const STIMULATE_ECONOMY_GROWTH_PRESSES = 25;
const STIMULATE_ECONOMY_GAIN_RATE = 0.01;
// exported so corporationBoostMenu/index.ts's own press-and-hold timer fires
// at the same cadence this schedule's press-by-press escalation assumes
export const STIMULATE_ECONOMY_HOLD_INTERVAL_MS = 100;

// the per-press multiplier that takes baseCost all the way up to
// referenceTotal in exactly STIMULATE_ECONOMY_GROWTH_PRESSES - 1 steps — a
// bigger referenceTotal means a bigger ratio here, NOT more presses, which
// is what keeps the full drain fast regardless of how astronomically large
// the economy gets
function stimulateEconomyGrowthRatio(referenceTotal: BigNumber): number {
  const baseCost = fromNumber(STIMULATE_ECONOMY_BASE_COST);
  if (!gt(referenceTotal, baseCost)) return 1;
  const steps = STIMULATE_ECONOMY_GROWTH_PRESSES - 1;
  return 10 ** ((log10(referenceTotal) - log10(baseCost)) / steps);
}

// streak: 1 for the first press of a fresh hold, 2 for the next consecutive
// one, etc. (see corporationBoostMenu/index.ts's own counter). referenceTotal:
// the combined total income captured ONCE at hold-start (NOT re-read fresh
// every press) — the whole point is a stable schedule that still shapes
// itself around the full original amount regardless of how much has already
// been drained mid-hold
export function getStimulateEconomyCost(
  streak: number,
  referenceTotal: BigNumber,
): BigNumber {
  const currentTotal = getAllCompaniesTotalIncome();
  const baseCost = fromNumber(STIMULATE_ECONOMY_BASE_COST);
  // too small a reference to bother growing/shrinking against (e.g. a
  // a fully-drained economy has nothing to reference at all — show the
  // nominal $10 starting price rather than a confusing "$0" (the button
  // stays disabled either way, since there's genuinely nothing to spend)
  if (isZero(referenceTotal)) {
    return baseCost;
  }
  // too small a reference to bother growing/shrinking against (e.g. a
  // fresh/near-empty economy) — just take whatever's there in one go
  if (!gt(referenceTotal, baseCost)) {
    return min(currentTotal, referenceTotal);
  }
  const ratio = stimulateEconomyGrowthRatio(referenceTotal);
  // same distance from the peak (the fixed growth press count) on either
  // side costs the same — this is what turns one growth curve into a
  // mirrored grow-then-shrink shape. Clamped at 0 (i.e. flat at baseCost)
  // once a hold runs long enough to fall off the far end of the mirrored
  // shrink side entirely
  const distanceFromPeak = Math.abs(streak - STIMULATE_ECONOMY_GROWTH_PRESSES);
  const exponent = Math.max(
    0,
    STIMULATE_ECONOMY_GROWTH_PRESSES - 1 - distanceFromPeak,
  );
  const cost = multiply(pow(ratio, exponent), STIMULATE_ECONOMY_BASE_COST);
  return min(currentTotal, cost);
}

export function getStimulateEconomyInfluenceGain(
  streak: number,
  referenceTotal: BigNumber,
): number {
  const cost = getStimulateEconomyCost(streak, referenceTotal);
  const logCost = log10(cost);
  if (!Number.isFinite(logCost)) return 0;
  // sub-$1 costs (the tail end of a full drain, where whatever's left is
  // less than the log scale's own $1 floor) still clamp to a 0 gain here —
  // but, unlike before, that no longer means "nothing left to buy" (see
  // stimulateEconomy below, which now checks cost > 0 for that instead), so
  // pennies-scale remainders keep draining for free instead of getting
  // permanently stuck just above $0
  return Math.sqrt(Math.max(0, logCost)) * STIMULATE_ECONOMY_GAIN_RATE;
}

// spends getStimulateEconomyCost(streak, referenceTotal) (proportionally
// across every company, same as a stock raise/press conference) and banks
// the log-scaled influence gain above. A no-op once total income is FULLY
// drained (cost itself is exactly 0) — returns whether it succeeded. Checking
// cost > 0 here (rather than gain > 0, which used to gate this) matters
// because gain legitimately clamps to 0 well before cost does (any
// sub-$1 remainder), and gating on gain instead left that last sliver of
// income permanently unspendable — the button would go disabled forever
// with corp assets stuck just above $0 instead of ever reaching it
export function stimulateEconomy(
  streak: number,
  referenceTotal: BigNumber,
): boolean {
  const cost = getStimulateEconomyCost(streak, referenceTotal);
  if (isZero(cost)) return false;
  if (!spendFromAllCompanies(cost)) return false;
  addMarketInfluencePercent(
    getStimulateEconomyInfluenceGain(streak, referenceTotal),
  );
  return true;
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
  // same "merging/creating a corporation banks a free conference" reward
  // main.ts's "Create new Corporation" already grants
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
  const companyValue = max(fromNumber(10), getCompanyValue(companyIndex));
  return Math.sqrt(log10(companyValue)) * BASE_MODIFIER_RATE;
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
