// the upgrade buttons in view, for events that run through every one of them
import type { Floor } from "../../gameState";
import { isFloorLocked } from "../../shared/detachedJob";
import { isVisibleOnFloor, type EventProcContext } from "../eventProcs";
import { getButtonCenter } from "../upgradeButton";

export interface OnScreenButton {
  floor: Floor;
  // its center, local to the asking floor's own space
  x: number;
  y: number;
}

// every open floor's button in view, top first, while floor itself is in view
export function findOnScreenButtons(
  floor: Floor,
  context: EventProcContext,
): OnScreenButton[] {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const top = onScreen.find((entry) => entry.floor === floor)?.top;
  if (top === undefined) return [];
  return onScreen
    .filter((entry) => entry.floor.unlocked && !isFloorLocked(entry.floor))
    .map((entry) => ({
      entry,
      button: getButtonCenter(context.floors.indexOf(entry.floor) === 0),
    }))
    .filter(({ entry, button }) => isVisibleOnFloor(entry, button.y))
    .sort((a, b) => a.entry.top - b.entry.top)
    .map(({ entry, button }) => ({
      floor: entry.floor,
      x: button.x,
      y: button.y + entry.top - top,
    }));
}
