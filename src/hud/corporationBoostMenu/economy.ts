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
  subtract,
  multiply,
  max,
  min,
  lt,
  isZero,
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
// getCompanyBaseModifierPercent/investInMarket) — never fold a
// caller-specific rate in here
function compressedScale(amount: BigNumber): number | null {
  const logAmount = log10(amount);
  if (!Number.isFinite(logAmount) || logAmount < 0) return null;
  return Math.sqrt(logAmount);
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

// "Invest in the market" — a cash sink that trades money for Investment
// Portfolio %, always usable regardless of current income. Each press takes
// INVEST_DRAIN_PERCENT of whatever's still left in this hold's own
// remaining-to-drain budget (started at the company's FULL hold-start
// balance, only ever shrinks) — NOT a fixed chunk of the original total, so
// the $ amount actually taken (and therefore the % gained, see below) is
// deliberately smaller on every successive press, matching a real
// "drain % of what's left" decay. A plain 0.9x-remaining-forever decay never
// reaches exact $0 though (asymptotes toward it, mathematically forever) —
// so once what's left decays under INVEST_DRAIN_FLOOR_FRACTION of the
// hold's own original balance, that press takes ALL of it instead of yet
// another shrinking slice, guaranteeing the hold actually bottoms out at
// exactly $0 within a bounded number of presses instead of holding forever
// without ever finishing. INVEST_GAIN_RATE is a wholly SEPARATE knob from
// INVEST_DRAIN_PERCENT on purpose — tuning how fast money drains must never
// silently also change (or fail to change) the % payout, which is exactly
// the bug it used to have when one config value drove both
const INVEST_DRAIN_PERCENT = CONFIG.corporation.investDrainPercent;
const INVEST_DRAIN_FLOOR_FRACTION = CONFIG.corporation.investDrainFloorFraction;
const INVEST_GAIN_RATE = CONFIG.corporation.investGainRate;

export interface InvestHoldBudget {
  // each company's own total at the moment this hold began — never
  // mutated; only used to compute the drain-floor cutoff below, so a slow
  // percentage decay still guarantees full termination
  originalTotal: BigNumber[];
  // how much of each company's ORIGINAL hold-start balance is still left to
  // drain — starts at 100% of it, only ever shrinks, snaps to exactly zero
  // once below INVEST_DRAIN_FLOOR_FRACTION of the original (see investInMarket)
  remaining: BigNumber[];
}

// call once when a hold gesture starts
export function beginInvestHold(): InvestHoldBudget {
  const count = getCorporationCount();
  const originalTotal: BigNumber[] = [];
  const remaining: BigNumber[] = [];
  for (let i = 0; i < count; i++) {
    const total = getStoredTotalIncome(i);
    originalTotal[i] = total;
    remaining[i] = total;
  }
  return { originalTotal, remaining };
}

// drains INVEST_DRAIN_PERCENT of each company's own CURRENT remaining hold
// budget (remaining is mutated in place — once a company's original
// balance is fully used up it can't be drained again for the rest of this
// same hold), capped to whatever that company actually still has live.
// Each company's own gain this press is compressedScale(the ACTUAL $
// amount drained this press) * INVEST_GAIN_RATE — since that amount itself
// shrinks every press (see above), the gain shrinks right along with it,
// and INVEST_GAIN_RATE stays a clean, independent, directly-felt multiplier
// on top (see the const's own comment for why it's separate from the drain
// rate). Returns the % just gained, or null if every company's budget is spent
export function investInMarket(budget: InvestHoldBudget): number | null {
  const { originalTotal, remaining } = budget;
  const count = getCorporationCount();
  let totalGain = 0;
  let anyDrained = false;
  for (let i = 0; i < count; i++) {
    const left = remaining[i];
    if (!left || isZero(left)) continue;
    const current = getStoredTotalIncome(i);
    if (isZero(current)) continue;
    const drainFloor = multiply(
      originalTotal[i] ?? ZERO,
      INVEST_DRAIN_FLOOR_FRACTION,
    );
    // once what's left has decayed below the floor, take all of it instead
    // of yet another (even smaller) drain-percent slice — see this const's
    // own comment
    const isFloorSnap = lt(left, drainFloor);
    const chunk = isFloorSnap ? left : multiply(left, INVEST_DRAIN_PERCENT);
    const amount = min(min(chunk, left), current);
    if (isZero(amount)) continue;
    spendCompanyTotalIncome(i, amount);
    remaining[i] = subtract(left, amount);
    anyDrained = true;
    const scale = compressedScale(amount) ?? 0;
    totalGain += scale * INVEST_GAIN_RATE;
  }
  if (!anyDrained || totalGain <= 0) return null;
  addInvestmentPortfolioPercent(totalGain);
  return totalGain;
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

// a company's overall value — its own current total income (bank money) plus
// the $ sunk into its floors' upgrades — the base getCompanyBaseModifierPercent
// below weighs a company's size against. Buildings cost is deliberately NOT
// part of this — total income (the player's actual spendable cash) is already
// one of the two terms, and buildings cost tends to track total income
// closely enough that including it just double-counted roughly the same size
// signal. The active company reads its own live buildings (freshest); any
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

// same as formatBoostPercent, but for a single invest press's own gain —
// investGainRate can produce a genuinely nonzero gain that still rounds to
// "0.00" at 2 decimals (see config.ts's own comment on why $1 amounts drained
// yield ~0%), which reads as "that press did nothing" even though it did;
// ">0.00%" instead makes clear something (just not much) was actually gained
export function formatInvestGainPercent(percent: number): string {
  if (percent > 0 && percent < 0.01) return "< 0.01%";
  return formatBoostPercent(percent);
}
