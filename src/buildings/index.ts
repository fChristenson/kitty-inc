import { buildFloor, computeBaseFloorStats } from "../floors";
import {
  increaseIncomeRate,
  increaseIncomeRateBy,
} from "../floors/incomePanel";
import type { Floor } from "../gameState";
import {
  type BigNumber,
  ZERO,
  isZero,
  pow,
  multiply,
  multiplyBig,
} from "../shared/bigNumber";
import { CONFIG } from "../config";

// a BigNumber: 1000 ** index overflows a plain number past ~100 buildings,
// which zeroed every new or reset floor's income and price there
export function getBuildingMultiplier(buildingIndex: number): BigNumber {
  return pow(CONFIG.floors.floorEconomyMultiplierPerBuilding, buildingIndex);
}

const BUILDING_BASE_PRICE = CONFIG.buildings.basePrice;

// $ cost to buy the next building (nextBuildingIndex === buildings.length, since
// index 0 is the always-free starting building), independently of floor scaling. Uses
// shared/bigNumber's pow (never a raw `**`), so this stays finite even for a
// very high building index instead of overflowing to Infinity
export function getBuildingPrice(nextBuildingIndex: number): BigNumber {
  return multiply(
    pow(
      CONFIG.floors.floorEconomyMultiplierPerBuilding,
      Math.max(0, nextBuildingIndex - 1),
    ),
    BUILDING_BASE_PRICE,
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
