// the floors a crit's number plays out onto (floor, button and lock crits),
// and where their targets sit from the flash
import type { FloorActionsDeps } from "../../floors/floorInteractions";
import { isFloorMaxed, type Floor } from "../../gameState";
import { isFloorLocked } from "../../shared/detachedJob";
import {
  isVisibleOnFloor,
  type OnScreenFloor,
} from "../animatedCrits/eventProcs";
import type { Point } from "./critPlayer";

// every open floor in view but floor whose target (at its floor-local y) is
// in view, maxed ones only if `maxed`
export function otherFloorsInView(
  deps: FloorActionsDeps,
  floor: Floor,
  targetY: (target: Floor) => number,
  maxed = false,
): Floor[] {
  return (deps.getOnScreenFloors?.() ?? [])
    .filter(
      (entry) =>
        entry.floor !== floor &&
        entry.floor.unlocked &&
        !isFloorLocked(entry.floor) &&
        (maxed || !isFloorMaxed(entry.floor)) &&
        isVisibleOnFloor(entry, targetY(entry.floor)),
    )
    .map((entry) => entry.floor);
}

// a floor's world top: from the floors in view, else its rect, else fallback
function topOf(
  deps: FloorActionsDeps,
  onScreen: OnScreenFloor[],
  target: Floor,
  fallback: number,
): number {
  for (let i = 0; i < onScreen.length; i++)
    if (onScreen[i].floor === target) return onScreen[i].top;
  return deps.getFloorRect?.(target)?.top ?? fallback;
}

// each target's spot (floor-local) from the screen's middle, where floor's
// crit flash is, in its units; read every frame so a scroll carries them
export function spotsFromFlash(
  deps: FloorActionsDeps,
  floor: Floor,
  targets: Floor[],
  spotOn: (target: Floor) => Point,
): () => Point[] {
  return () => {
    const center = deps.getScreenCenterLocal(floor);
    const onScreen = deps.getOnScreenFloors?.() ?? [];
    const ownTop = topOf(deps, onScreen, floor, 0);
    return targets.map((target) => {
      const top = topOf(deps, onScreen, target, ownTop);
      const spot = spotOn(target);
      return { x: spot.x - center.x, y: top - ownTop + spot.y - center.y };
    });
  };
}
