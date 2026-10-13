// the locked floor a lock crit plays on: the one waiting at the top of the
// building, if any
import type { Floor } from "../../gameState";
import { FLOOR_H } from "../../floors/constants";
import {
  isVisibleOnFloor,
  type OnScreenFloors,
} from "../animatedCrits/eventProcs";

export function lockedFloorOf(floors: Floor[]): Floor | null {
  const top = floors[floors.length - 1];
  return top && !top.unlocked ? top : null;
}

// whether the locked floor's middle is in view
export function lockedFloorInView(
  floors: Floor[],
  getOnScreenFloors: OnScreenFloors | undefined,
): boolean {
  const locked = lockedFloorOf(floors);
  if (!locked || !getOnScreenFloors) return false;
  const entry = getOnScreenFloors().find((e) => e.floor === locked);
  return !!entry && isVisibleOnFloor(entry, FLOOR_H / 2);
}
