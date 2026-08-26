import { buildFloor } from "../floors";
import type { Floor } from "../gameState";
import type { FurnitureSprite } from "../floors/sprites";

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
  sprites: FurnitureSprite[],
  buildingIndex: number,
): Floor[] {
  const multiplier = getBuildingMultiplier(buildingIndex);
  const groundFloor = buildFloor(sprites, 1, multiplier, buildingIndex > 0);
  return [groundFloor];
}
