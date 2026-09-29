// "Union" event button: a rare upgrade click on a floor with 2+ workers (see
// floors/eventProcs' shared pool) arms it, and it stays armed until clicked.
// Clicking it is free and starts the worker merge in floors/unionEvent
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { registerEventButton } from "../../shared/floorEvents";
import { snapshotSet } from "../../shared/snapshotState";

const armed = snapshotSet<Floor>();

export function armUnionEvent(floor: Floor): void {
  armed.add(floor);
}

export function disarmUnionEvent(floor: Floor): void {
  armed.delete(floor);
}

export function isUnionEventArmed(floor: Floor, _now?: number): boolean {
  return armed.has(floor);
}

registerEventButton({
  key: "union",
  color: COLOR.purple,
  freeClick: true,
  isActive: isUnionEventArmed,
  label: () => "Union",
});
