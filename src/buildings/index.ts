import { buildFloor } from "../floors";
import type { Floor } from "../gameState";
import { type BigNumber, pow, multiply } from "../shared/bigNumber";

// each building's $ base values (income/upgrade/unlock/rate-step) are this much
// bigger than the previous building's — a fresh, much richer economy to grow into
export const BUILDING_COST_MULTIPLIER = 1000;

export function getBuildingMultiplier(buildingIndex: number): number {
  return BUILDING_COST_MULTIPLIER ** buildingIndex;
}

const BUILDING_BASE_PRICE = 1_000_000_000; // $ to buy the very first purchasable building (index 1)

// $ cost to buy the next building (nextBuildingIndex === buildings.length, since
// index 0 is the always-free starting building) — scales by the same
// BUILDING_COST_MULTIPLIER as that building's own economy, so the price always keeps
// pace with how much richer each successive building actually is. Uses
// shared/bigNumber's pow (never a raw `**`), so this stays finite even for a
// very high building index instead of overflowing to Infinity
export function getBuildingPrice(nextBuildingIndex: number): BigNumber {
  return multiply(
    pow(BUILDING_COST_MULTIPLIER, nextBuildingIndex - 1),
    BUILDING_BASE_PRICE,
  );
}

// builds a new building's starting floor list: just its ground floor, locked (and
// priced) for every building except the very first one, which keeps the original
// always-free ground floor. floorLock.ts's ensureLockedFloorAbove adds the next
// (always-locked) floor above it the same way it does for every other building.
export function createBuilding(
  buildingIndex: number,
  backgroundCount: number,
): Floor[] {
  const multiplier = getBuildingMultiplier(buildingIndex);
  const groundFloor = buildFloor(1, {
    backgroundCount,
    multiplier,
    groundFloorLocked: buildingIndex > 0,
  });
  return [groundFloor];
}

// this module's own facade: buildings/ has an outerWall sub-part for internal reuse,
// but anything outside src/buildings must import it from here, never from a nested path
export { drawOuterWall, loadWallMaterial } from "./outerWall";
export { drawRoof, loadRoofImage } from "./roof";
