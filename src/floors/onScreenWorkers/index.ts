// the workers and managers in view, for events that pull every one of them in
import type { Floor } from "../../gameState";
import { isFloorLocked } from "../../shared/detachedJob";
import { isVisibleOnFloor, type OnScreenFloors } from "../eventProcs";
import { getRenderedWorkerCount, getWorkerCenter } from "../worker";

export interface OnScreenWorker {
  floor: Floor;
  // its floor's top, in the same space as every other floor's
  top: number;
  workerIndex: number;
  center: { x: number; y: number };
}

// every worker and manager in view on an open floor, while floor itself is in
// view too; null when it isn't
export function findOnScreenWorkers(
  floor: Floor,
  getOnScreenFloors: OnScreenFloors | undefined,
): OnScreenWorker[] | null {
  const onScreen = getOnScreenFloors?.();
  if (!onScreen?.some((entry) => entry.floor === floor)) return null;
  const workers: OnScreenWorker[] = [];
  for (const entry of onScreen) {
    if (!entry.floor.unlocked || isFloorLocked(entry.floor)) continue;
    for (let i = 0; i < getRenderedWorkerCount(entry.floor); i++) {
      const center = getWorkerCenter(entry.floor, i);
      if (center && isVisibleOnFloor(entry, center.y))
        workers.push({
          floor: entry.floor,
          top: entry.top,
          workerIndex: i,
          center,
        });
    }
  }
  return workers;
}
