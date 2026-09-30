// the "Union" event: once its button (see upgradeButton/union.ts) is clicked,
// the screen freezes (shared/screenFreeze) and coins stream from the floor's
// other workers into one of them (its manager when it has one), which flashes
// and wiggles. It then unfreezes: the merged workers are gone (and can be
// hired again) and the target has gained one perma tier per merged worker,
// plus each merged worker's own perma tiers, up to the top tier
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { isFloorLocked } from "../../shared/detachedJob";
import { playBoostEventStream } from "../../sound";
import { createEventFx, type EventFx } from "../../shared/eventFx";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { drawCoins } from "../coins";
import { armUnionEvent, isUnionEventArmed } from "../upgradeButton";
import {
  EVENT_STREAM_DURATION_MS,
  streamCoins,
} from "../boostEvent/coinStream";
import { endEventProc, registerEventProc, trackEventProc } from "../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  getUnionPlan,
  getWorkerCenter,
  mergeWorkersInto,
  setWorkerSpotlight,
  type UnionPlan,
} from "../worker";

interface RunningUnion {
  floor: Floor;
  plan: UnionPlan;
  target: { x: number; y: number };
  startedAt: number;
  fx: EventFx;
}

let running: RunningUnion | null = null;

// only while this floor has 2+ workers and a target that isn't maxed yet
registerEventProc({
  key: "union",
  chance: () => CONFIG.unionEvent.chance,
  isInProgress: (floor) => running !== null || isUnionEventArmed(floor),
  canArm: (floor) => !isFloorLocked(floor) && getUnionPlan(floor) !== null,
  arm: armUnionEvent,
});

// dev test hook: arms the first unlocked floor a Union could play on,
// ignoring chance and cooldown and never starting the cooldown itself
export function forceUnionEvent(floors: Floor[]): Floor | null {
  const floor = floors.find((f) => getUnionPlan(f) !== null);
  if (!floor) return null;
  armUnionEvent(floor);
  trackEventProc("union", floor);
  return floor;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const union = running;
  if (!union) return;
  const rect = getFloorRect(union.floor);
  if (!rect) {
    drawCoins(ctx, getFloorRect, undefined, "overlay");
    return;
  }
  const now = performance.now();
  ctx.save();
  ctx.translate(rect.left, rect.top);
  const { targetIndex, mergedIndexes } = union.plan;
  const { white, rotation } = union.fx.tension(now);
  for (const index of mergedIndexes)
    drawWorkerSpotlight(ctx, union.floor, index, white, rotation);
  union.fx.draw(ctx, union.target.x, union.target.y, (tension) =>
    drawWorkerSpotlight(
      ctx,
      union.floor,
      targetIndex,
      tension.white,
      tension.rotation,
    ),
  );
  ctx.restore();
  drawCoins(ctx, getFloorRect, undefined, "overlay");
}

// starts the merge on floor; false (nothing happens) when it no longer has a
// Union to play, e.g. workers changed since the button armed
export function startUnionEvent(floor: Floor, persist: () => void): boolean {
  if (running || isScreenFrozen() || isFloorLocked(floor)) return false;
  const plan = getUnionPlan(floor);
  const target = plan && getWorkerCenter(floor, plan.targetIndex);
  if (!plan || !target) return false;
  const sources = plan.mergedIndexes
    .map((index) => getWorkerCenter(floor, index))
    .filter((center) => center !== null);

  const union: RunningUnion = {
    floor,
    plan,
    target,
    startedAt: performance.now(),
    fx: createEventFx(EVENT_STREAM_DURATION_MS),
  };
  running = union;
  setWorkerSpotlight(floor, [plan.targetIndex, ...plan.mergedIndexes]);
  freezeScreen(drawOverlay);
  playBoostEventStream();

  streamCoins(
    sources.map((source) => ({ floor, x: source.x, y: source.y })),
    {
      target,
      durationMs: EVENT_STREAM_DURATION_MS,
      isRunning: () => running === union,
      onEachArrive: () => union.fx.hit(performance.now()),
    },
  );

  setTimeout(() => {
    if (running !== union) return;
    running = null;
    clearWorkerSpotlight();
    const targetIndex = mergeWorkersInto(floor, plan);
    unfreezeScreen();
    celebrateWorkerBoost(floor, targetIndex, Date.now());
    persist();
    endEventProc("union");
  }, EVENT_STREAM_DURATION_MS);
  return true;
}
