// "Hunt" event button: a rare upgrade click while the mouse is on screen (see
// floors/eventProcs' shared pool) arms it; it stays armed only as long
// as that mouse does. Clicking it is free and starts floors/huntEvent
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { registerEventButton } from "../../shared/floorEvents";
import { getHuntTarget } from "../../shared/huntTarget";
import { snapshotSet } from "../../shared/snapshotState";

const armed = snapshotSet<Floor>();

export function armHuntEvent(floor: Floor): void {
  armed.add(floor);
}

export function disarmHuntEvent(floor: Floor): void {
  armed.delete(floor);
}

export function isHuntEventArmed(floor: Floor, _now?: number): boolean {
  return armed.has(floor) && getHuntTarget() !== null;
}

registerEventButton({
  key: "hunt",
  color: COLOR.red,
  freeClick: true,
  isActive: isHuntEventArmed,
  label: () => "Hunt!",
});
