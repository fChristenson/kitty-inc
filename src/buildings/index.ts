import { buildFloor, computeBaseFloorStats } from "../floors";
import {
  increaseIncomeRate,
  increaseIncomeRateBy,
} from "../floors/incomePanel";
import type { Floor } from "../gameState";
import {
  type BigNumber,
  ZERO,
  add,
  isZero,
  max,
  pow,
  multiply,
  multiplyBig,
} from "../shared/bigNumber";
import { nominalIncomeRatePerSecond } from "../shared/income";
import { CONFIG } from "../config";
import { floorRateFactor } from "../shared/upgradeEconomy";
import { MAX_FLOORS_PER_BUILDING } from "../floors/floorLock";

// a BigNumber: 1000 ** index overflows a plain number past ~100 buildings,
// which zeroed every new or reset floor's income and price there
export function getBuildingMultiplier(buildingIndex: number): BigNumber {
  return pow(CONFIG.floors.floorEconomyMultiplierPerBuilding, buildingIndex);
}

// a fully upgraded first building's income per second: every floor maxed (with
// its maxed bonus) and all three office upgrades
const MAXED_BUILDING_INCOME =
  MAX_FLOORS_PER_BUILDING *
  CONFIG.floors.baseIncomeAmount *
  floorRateFactor(CONFIG.incomePanel.maxFloorLevel) *
  CONFIG.incomePanel.maxedFloorIncomeMultiplier *
  CONFIG.officeUpgrades.speedMultiplierPerUpgrade ** 3;
const BUILDING_BASE_PRICE =
  MAXED_BUILDING_INCOME * 60 * CONFIG.buildings.unlockMinutesAtMax;

// every floor of the building unlocked and at the level cap
export function isBuildingMaxed(floors: readonly Floor[]): boolean {
  const unlocked = floors.filter((floor) => floor.unlocked);
  return (
    unlocked.length >= MAX_FLOORS_PER_BUILDING &&
    unlocked.every(
      (floor) => floor.upgradeCount >= CONFIG.incomePanel.maxFloorLevel,
    )
  );
}

// the next building opens once the newest one is maxed out
export function canBuyNextBuilding(buildings: readonly Floor[][]): boolean {
  const newest = buildings[buildings.length - 1];
  return (
    !newest || !CONFIG.buildings.requireMaxedBuilding || isBuildingMaxed(newest)
  );
}

// the company's nominal income (see shared/income), re-summed at most once a
// second: the map draws the next building's price every frame
const INCOME_CACHE_MS = 1000;
const incomeCache = new WeakMap<
  readonly Floor[][],
  { at: number; income: BigNumber }
>();
function companyNominalIncome(buildings: readonly Floor[][]): BigNumber {
  const now = Date.now();
  const cached = incomeCache.get(buildings);
  if (cached && now - cached.at < INCOME_CACHE_MS) return cached.income;
  let income = ZERO;
  for (const floors of buildings)
    for (const floor of floors)
      if (floor.unlocked)
        income = add(income, nominalIncomeRatePerSecond(floor));
  incomeCache.set(buildings, { at: now, income });
  return income;
}

// $ cost to buy the next building (nextBuildingIndex === buildings.length, since
// index 0 is the always-free starting building): its milestone price, or
// CONFIG.buildings.unlockIncomeMinutes of the company's nominal income, whichever
// is higher. Uses shared/bigNumber's pow (never a raw `**`), so this stays
// finite even for a very high building index instead of overflowing to Infinity
export function getBuildingPrice(
  nextBuildingIndex: number,
  buildings: readonly Floor[][],
): BigNumber {
  return max(
    multiply(
      pow(
        CONFIG.floors.floorEconomyMultiplierPerBuilding,
        Math.max(0, nextBuildingIndex - 1),
      ),
      BUILDING_BASE_PRICE,
    ),
    multiply(
      companyNominalIncome(buildings),
      CONFIG.buildings.unlockIncomeMinutes * 60,
    ),
  );
}

export function configureBuildingFloorPrices(
  floors: Floor[],
  buildingIndex: number,
): void {
  const ground = floors[0];
  if (!ground) return;
  const base = multiply(
    pow(CONFIG.floors.floorEconomyMultiplierPerBuilding, buildingIndex),
    CONFIG.floors.baseUnlockCost,
  );
  ground.buildingFloorUnlockBaseCost = base;
  for (let index = 1; index < floors.length; index++) {
    const floor = floors[index];
    if (floor.unlocked) continue;
    floor.unlockCost = multiply(
      multiplyBig(base, pow(CONFIG.floors.unlockCostGrowthFactor, index - 1)),
      floor.priceDiscountMultiplier,
    );
  }
}

// New buildings include a free, working ground floor. ensureLockedFloorAbove
// queues the next paid floor above it.
export function createBuilding(
  buildingIndex: number,
  backgroundCount: number,
  options: {
    groundFloorLocked?: boolean;
    initialUpgradeCount?: number;
    purchaseCost?: BigNumber;
  } = {},
): Floor[] {
  const multiplier = getBuildingMultiplier(buildingIndex);
  const groundFloorLocked = options.groundFloorLocked ?? false;
  const groundFloor = buildFloor(1, {
    backgroundCount,
    multiplier,
    groundFloorLocked,
  });
  for (let i = 0; i < (options.initialUpgradeCount ?? 0); i++) {
    increaseIncomeRate(groundFloor);
  }
  const floors = [groundFloor];
  groundFloor.buildingPurchaseCost = options.purchaseCost ?? ZERO;
  configureBuildingFloorPrices(floors, buildingIndex);
  return floors;
}

// floors zeroed by the old overflowing multiplier: rebuilt from their level-0
// stats and replayed to the level they had
export function repairZeroedFloors(
  floors: Floor[],
  buildingIndex: number,
): void {
  const multiplier = getBuildingMultiplier(buildingIndex);
  floors.forEach((floor, index) => {
    if (!isZero(floor.rateStep)) return;
    const level = Number.isFinite(floor.upgradeCount) ? floor.upgradeCount : 0;
    const base = computeBaseFloorStats(index + 1, multiplier);
    floor.incomeAmount = base.incomeAmount;
    floor.incomeIntervalSeconds = base.incomeIntervalSeconds;
    floor.rateStep = base.rateStep;
    floor.upgradeCost = multiply(
      base.upgradeCost,
      floor.priceDiscountMultiplier,
    );
    floor.upgradeCount = 0;
    increaseIncomeRateBy(floor, level);
  });
}

// this module's own facade: buildings/ has an outerWall sub-part for internal reuse,
// but anything outside src/buildings must import it from here, never from a nested path
export { drawOuterWall, loadWallMaterial } from "./outerWall";
export { drawRoof, loadRoofImage } from "./roof";
