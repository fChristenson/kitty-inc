// "Boost" event button: a rare upgrade click (see floors/boostEvent's
// maybeArmBoostEvent) arms it, and it stays armed until clicked. Clicking it is
// free and starts the screen-freezing worker boost in floors/boostEvent
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { registerEventButton } from "../../shared/floorEvents";
import { snapshotSet } from "../../shared/snapshotState";

const armed = snapshotSet<Floor>();

export function armBoostEvent(floor: Floor): void {
  armed.add(floor);
}

export function disarmBoostEvent(floor: Floor): void {
  armed.delete(floor);
}

export function isBoostEventArmed(floor: Floor, _now?: number): boolean {
  return armed.has(floor);
}

registerEventButton({
  key: "boost",
  color: COLOR.cyan,
  freeClick: true,
  isActive: isBoostEventArmed,
  label: () => "Boost!",
});
