import { loadBuildings, clearBuildings, type Floor } from "../../gameState";
import { getStoredTotalIncome, addCompanyTotalIncome } from "../../totalIncome";
import {
  getCorporationCount,
  regenerateCorporationName,
} from "../../corporationName";
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

function getBuildingsValue(buildings: Floor[][]): BigNumber {
  let total = ZERO;
  for (const floors of buildings)
    total = add(total, floors[0]?.buildingPurchaseCost ?? ZERO);
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
    add(getBuildingsValue(buildings), getUpgradesValue(buildings)),
    add(getFloorUnlockValue(buildings), getStaffInvestmentValue(buildings)),
  );
}

export function getActiveCompanyAssetValue(buildings: Floor[][]): BigNumber {
  return getCompanyAssetValue(buildings);
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

// summed across every corporation's own base size modifier — the actual
// global income boost applied to every floor of every building of every
// company (see totalIncome.ts's startTotalIncomeTicker/gameState.ts's
// computeIdleIncome, both take this as an injected multiplier to avoid a
// circular import back into this hud module)
export function getGlobalIncomeBoostPercent(): number {
  const count = getCorporationCount();
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += getCompanyBaseModifierPercent(i);
  }
  return total;
}

export function getGlobalIncomeBoostMultiplier(): number {
  return 1 + getGlobalIncomeBoostPercent() / 100;
}

// +N.NNN% — the leading + marks it as always an increase, never a penalty; plain
// fixed-point keeps the smaller badge modifiers visible in Corporation Statistics
export function formatBoostPercent(percent: number): string {
  return `+${percent.toFixed(3)}%`;
}
