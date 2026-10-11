// which floors' upgrade buttons are held down right now (started and ended by
// gameCanvas's press and hold), so a floor's label can wait for the hold to end
import type { Floor } from "../../gameState";

const holds = new WeakSet<Floor>();

export function startHoldTally(floor: Floor): void {
  holds.add(floor);
}

export function isHoldingUpgrade(floor: Floor): boolean {
  return holds.has(floor);
}

export function endHoldTally(floor: Floor): void {
  holds.delete(floor);
}
