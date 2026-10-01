// the workers and managers in view, for events that pull every one of them in
import type { Floor } from "../../gameState";
import { critTierRank } from "../../shared/critTypes";
import { isFloorLocked } from "../../shared/detachedJob";
import { isVisibleOnFloor, type OnScreenFloors } from "../eventProcs";
import {
  getBoostEventCandidates,
  getRenderedWorkerCount,
  getWorkerCenter,
  getWorkerPermaTier,
} from "../worker";

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

// a random one of the lowest perma tier among the workers that can still climb
export function pickLowestTierClimber(
  workers: OnScreenWorker[],
): OnScreenWorker | null {
  const climbers = workers.filter((w) =>
    getBoostEventCandidates(w.floor).includes(w.workerIndex),
  );
  if (climbers.length === 0) return null;
  const rank = (w: OnScreenWorker) =>
    critTierRank(getWorkerPermaTier(w.floor, w.workerIndex));
  const lowest = Math.min(...climbers.map(rank));
  const pool = climbers.filter((w) => rank(w) === lowest);
  return pool[Math.floor(Math.random() * pool.length)];
}

// up to max workers in hop order from start, always on to the nearest one not
// yet reached; start's y is measured like a worker's center.y + top
export function nearestChain(
  start: { x: number; y: number },
  workers: OnScreenWorker[],
  max: number,
): OnScreenWorker[] {
  const left = [...workers];
  const chain: OnScreenWorker[] = [];
  let at = start;
  while (left.length > 0 && chain.length < max) {
    let best = 0;
    let bestDistance = Infinity;
    left.forEach((w, i) => {
      const d = Math.hypot(w.center.x - at.x, w.center.y + w.top - at.y);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    const [next] = left.splice(best, 1);
    chain.push(next);
    at = { x: next.center.x, y: next.center.y + next.top };
  }
  return chain;
}
