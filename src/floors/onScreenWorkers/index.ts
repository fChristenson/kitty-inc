// the workers and managers in view, for events that pull every one of them in
import type { Floor } from "../../gameState";
import { critTierRank } from "../../shared/critTypes";
import { isFloorLocked } from "../../shared/detachedJob";
import { drawWhiteBurst } from "../../shared/eventFx";
import {
  drawFreezeDimmed,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { isVisibleOnFloor, type OnScreenFloors } from "../eventProcs";
import {
  drawWorkerSpotlight,
  findRecruitSpot,
  getBoostEventCandidates,
  getRenderedWorkerCount,
  getWorkerCenter,
  getWorkerPermaTier,
  missingWorkerCount,
  setWorkerSpotlights,
  WORKER_FEET_Y,
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

// a worker that can still climb a perma tier
export const isClimber = (w: OnScreenWorker): boolean =>
  getBoostEventCandidates(w.floor).includes(w.workerIndex);

// every climber in view, while floor itself is in view too
export function findClimbers(
  floor: Floor,
  getOnScreenFloors: OnScreenFloors | undefined,
): OnScreenWorker[] {
  return (findOnScreenWorkers(floor, getOnScreenFloors) ?? []).filter(
    isClimber,
  );
}

// lifts workers out of the frozen frame for the overlay to draw
export function spotlightWorkers(workers: OnScreenWorker[]): void {
  const byFloor = new Map<Floor, number[]>();
  for (const w of workers)
    byFloor.set(w.floor, [...(byFloor.get(w.floor) ?? []), w.workerIndex]);
  setWorkerSpotlights(
    [...byFloor].map(([floor, workerIndexes]) => ({ floor, workerIndexes })),
  );
}

const STRUCK_BURST_MS = 500;

// spotlit workers, washed as dark as the frozen frame until struckAt is set,
// then lit up in a white burst
export function drawStruckWorkers(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  struck: { worker: OnScreenWorker; struckAt: number | null }[],
  now: number,
): void {
  const draw = (c: CanvasRenderingContext2D, w: OnScreenWorker) => {
    const rect = getFloorRect(w.floor);
    if (!rect) return;
    c.save();
    c.translate(rect.left, rect.top);
    drawWorkerSpotlight(c, w.floor, w.workerIndex, 0, 0);
    c.restore();
  };
  drawFreezeDimmed(ctx, (layer) => {
    for (const s of struck) if (s.struckAt === null) draw(layer, s.worker);
  });
  for (const { worker, struckAt } of struck) {
    if (struckAt === null) continue;
    draw(ctx, worker);
    const rect = getFloorRect(worker.floor);
    if (rect)
      drawWhiteBurst(
        ctx,
        rect.left + worker.center.x,
        rect.top + worker.center.y,
        (now - struckAt) / STRUCK_BURST_MS,
        0.3,
      );
  }
}

export interface RecruitSpot {
  floor: Floor;
  // where a free hire would stand, local to its own floor
  x: number;
  y: number;
}

// every open floor in view with room for another worker, with where it'd
// stand, while floor itself is in view too
export function findRecruitSpots(
  floor: Floor,
  getOnScreenFloors: OnScreenFloors | undefined,
): RecruitSpot[] {
  const onScreen = getOnScreenFloors?.() ?? [];
  if (!onScreen.some((entry) => entry.floor === floor)) return [];
  const spots: RecruitSpot[] = [];
  for (const entry of onScreen) {
    if (!entry.floor.unlocked || isFloorLocked(entry.floor)) continue;
    const spot = findRecruitSpot(entry.floor);
    if (spot && isVisibleOnFloor(entry, spot.y))
      spots.push({ floor: entry.floor, ...spot });
  }
  return spots;
}

// the floor in view missing the most workers, floor itself on a tie
export function findUnderstaffedFloor(
  floor: Floor,
  getOnScreenFloors: OnScreenFloors | undefined,
): Floor | null {
  const floors = findRecruitSpots(floor, getOnScreenFloors).map(
    (spot) => spot.floor,
  );
  if (floors.length === 0) return null;
  const most = Math.max(...floors.map(missingWorkerCount));
  const pool = floors.filter((f) => missingWorkerCount(f) === most);
  return pool.includes(floor) ? floor : pool[0];
}

// every floor's ground in view, where its workers stand, top first, local to
// floor's own space
export function findFloorLines(
  floor: Floor,
  getOnScreenFloors: OnScreenFloors | undefined,
): number[] {
  const onScreen = getOnScreenFloors?.() ?? [];
  const top = onScreen.find((entry) => entry.floor === floor)?.top;
  if (top === undefined) return [];
  return onScreen
    .map((entry) => WORKER_FEET_Y + entry.top - top)
    .sort((a, b) => a - b);
}

// a random one of the lowest perma tier among the workers that can still climb
export function pickLowestTierClimber(
  workers: OnScreenWorker[],
): OnScreenWorker | null {
  const climbers = workers.filter(isClimber);
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
