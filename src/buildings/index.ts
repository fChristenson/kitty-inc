import { buildFloor } from "../floors";
import { increaseIncomeRate } from "../floors/incomePanel";
import type { Floor } from "../gameState";
import { type BigNumber, pow, multiply } from "../shared/bigNumber";
import { CONFIG } from "../config";

export const BUILDING_COST_MULTIPLIER = CONFIG.buildings.costMultiplier;

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
    pow(BUILDING_COST_MULTIPLIER, nextBuildingIndex - 1),
    BUILDING_BASE_PRICE,
  );
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
  return [groundFloor];
}

// this module's own facade: buildings/ has an outerWall sub-part for internal reuse,
// but anything outside src/buildings must import it from here, never from a nested path
export { drawOuterWall, loadWallMaterial } from "./outerWall";
export { drawRoof, loadRoofImage } from "./roof";
