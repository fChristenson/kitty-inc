// the "Boost" event: once its button (see upgradeButton/boost.ts) is clicked,
// the whole screen freezes (shared/screenFreeze), a stream of glimmer lights flies from
// the button into one random on-screen worker (or manager) not yet at the top
// crit tier, and that worker flashes white, wiggles and its glow crossfades
// into the next crit tier's color over EVENT_STREAM_DURATION_MS. It then
// unfreezes with the normal worker boost jump, one crit tier higher for good:
// while boosted it multiplies its floor's speed by that tier's crit multiplier
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { randomInt } from "../../utils";
import { isFloorLocked } from "../../shared/detachedJob";
import { playBoostEventStream } from "../../sound";
import { createEventFx, type EventFx } from "../../shared/eventFx";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { armBoostEvent, isBoostEventArmed } from "../upgradeButton";
import {
  drawStreamOverlay,
  EVENT_STREAM_DURATION_MS,
} from "../../shared/eventStream";
import { streamFromButton } from "./buttonStream";
import {
  endEventProc,
  isVisibleOnFloor,
  registerEventProc,
  trackEventProc,
  type OnScreenFloors,
} from "../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  getBoostEventCandidates,
  getWorkerCenter,
  promoteWorkerPermaTier,
  setWorkerSpotlight,
} from "../worker";

export type { OnScreenFloors } from "../eventProcs";

interface RunningBoost {
  floor: Floor;
  workerIndex: number;
  center: { x: number; y: number };
  startedAt: number;
  fx: EventFx;
}

let running: RunningBoost | null = null;

// only while this floor still has a worker the event could pick
registerEventProc({
  key: "boost",
  chance: () => CONFIG.boostEvent.chance,
  isInProgress: (floor) => running !== null || isBoostEventArmed(floor),
  canArm: (floor) => getBoostEventCandidates(floor).length > 0,
  arm: armBoostEvent,
});

// dev test hook: arms the first unlocked floor that still has a worker to pick,
// ignoring chance and cooldown and never starting the cooldown itself
export function forceBoostEvent(floors: Floor[]): Floor | null {
  const floor = floors.find(
    (f) => f.unlocked && getBoostEventCandidates(f).length > 0,
  );
  if (!floor) return null;
  armBoostEvent(floor);
  trackEventProc("boost", floor);
  return floor;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const boost = running;
  if (!boost) return;
  drawStreamOverlay(
    ctx,
    getFloorRect,
    boost.floor,
    boost.fx,
    boost.center.x,
    boost.center.y,
    (tension) =>
      drawWorkerSpotlight(
        ctx,
        boost.floor,
        boost.workerIndex,
        tension.white,
        tension.rotation,
      ),
  );
}

// starts the freeze sequence from sourceFloor's button; false (nothing
// happens) when no on-screen floor has a worker left to pick
export function startBoostEvent(
  sourceFloor: Floor,
  isGroundFloor: boolean,
  getOnScreenFloors: OnScreenFloors | undefined,
  persist: () => void,
): boolean {
  if (running || isScreenFrozen() || !getOnScreenFloors) return false;
  const onScreen = getOnScreenFloors();
  const sourceTop = onScreen.find((f) => f.floor === sourceFloor)?.top;
  if (sourceTop === undefined) return false;
  const candidates: {
    floor: Floor;
    top: number;
    workerIndex: number;
    center: { x: number; y: number };
  }[] = [];
  for (const entry of onScreen) {
    const { floor, top } = entry;
    if (!floor.unlocked || isFloorLocked(floor)) continue;
    for (const workerIndex of getBoostEventCandidates(floor)) {
      const center = getWorkerCenter(floor, workerIndex);
      if (center && isVisibleOnFloor(entry, center.y))
        candidates.push({ floor, top, workerIndex, center });
    }
  }
  if (candidates.length === 0) return false;
  const target = candidates[randomInt(0, candidates.length - 1)];
  const { center } = target;

  const durationMs = EVENT_STREAM_DURATION_MS;
  const boost: RunningBoost = {
    floor: target.floor,
    workerIndex: target.workerIndex,
    center,
    startedAt: performance.now(),
    fx: createEventFx(EVENT_STREAM_DURATION_MS),
  };
  running = boost;
  setWorkerSpotlight(target.floor, target.workerIndex);
  freezeScreen(drawOverlay);
  playBoostEventStream();

  // the lights fly on (and are drawn through) the button's own floor, so the
  // worker's spot is converted into that floor's local coordinates
  const streamTarget = { x: center.x, y: center.y + target.top - sourceTop };
  streamFromButton(
    "glimmers",
    sourceFloor,
    isGroundFloor,
    streamTarget,
    durationMs,
    () => running === boost,
    () => boost.fx.hit(performance.now()),
  );

  setTimeout(() => {
    if (running !== boost) return;
    running = null;
    clearWorkerSpotlight();
    promoteWorkerPermaTier(boost.floor, boost.workerIndex);
    unfreezeScreen();
    celebrateWorkerBoost(boost.floor, boost.workerIndex, Date.now());
    persist();
    endEventProc("boost");
  }, durationMs);
  return true;
}

export { streamFromButton } from "./buttonStream";
