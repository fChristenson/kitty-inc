import { buildFloor } from "../floors";
import type { Floor } from "../gameState";

// each building's $ base values (income/upgrade/unlock/rate-step) are this much
// bigger than the previous building's — a fresh, much richer economy to grow into
export const BUILDING_COST_MULTIPLIER = 1000;

export function getBuildingMultiplier(buildingIndex: number): number {
  return BUILDING_COST_MULTIPLIER ** buildingIndex;
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
export { drawOuterWall } from "./outerWall";
