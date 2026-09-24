import { buildFloor } from "../floors";
import { increaseIncomeRate } from "../floors/incomePanel";
import type { Floor } from "../gameState";
import {
  type BigNumber,
  pow,
  multiply,
  multiplyBig,
} from "../shared/bigNumber";
import { CONFIG } from "../config";

export function getBuildingMultiplier(buildingIndex: number): number {
  return CONFIG.floors.floorEconomyMultiplierPerBuilding ** buildingIndex;
}

const BUILDING_BASE_PRICE = CONFIG.buildings.basePrice;

// $ cost to buy the next building (nextBuildingIndex === buildings.length, since
// index 0 is the always-free starting building), independently of floor scaling. Uses
// shared/bigNumber's pow (never a raw `**`), so this stays finite even for a
// very high building index instead of overflowing to Infinity
export function getBuildingPrice(nextBuildingIndex: number): BigNumber {
  return multiply(
    pow(Math.max(1, nextBuildingIndex), CONFIG.buildings.priceGrowthExponent),
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
  configureBuildingFloorPrices(floors, buildingIndex);
  return floors;
}

// this module's own facade: buildings/ has an outerWall sub-part for internal reuse,
// but anything outside src/buildings must import it from here, never from a nested path
export { drawOuterWall, loadWallMaterial } from "./outerWall";
export { drawRoof, loadRoofImage } from "./roof";
