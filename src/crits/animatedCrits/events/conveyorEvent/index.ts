// the "Conveyor" event: it covers its crit, whose click freezes the screen
// while glimmer hooks glide in one after another, dead straight along a rail
// from the screen's side, each carrying a new worker for a floor in view that
// is missing some. Each hook stops over its spot and drops its worker, which
// lands with a slam, then glides on off the screen: the floor fills up to its
// worker cap. Then the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { startBoostEventStreamLoop } from "../../../../sound";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  recruitToCap,
  setWorkerSpotlight,
  WORKER_FEET_Y,
  WORKER_HEIGHT,
} from "../../../../floors/worker";
import { findUnderstaffedFloor } from "../../onScreenWorkers";
import { FLOOR_W } from "../../../../floors/constants";

const KEY = "conveyor";
// the workers dangle this far above the floor, under hooks this far over their heads
const DROP_HEIGHT = 200;
const HOOK_GAP = 30;
const RAIL_Y = WORKER_FEET_Y - DROP_HEIGHT - WORKER_HEIGHT - HOOK_GAP;
// hooks start and leave this far beyond the screen's sides
const OFF_SCREEN = 120;
// a hook rests this long over its spot before letting go; the drop takes DROP_MS
const PAUSE_MS = 150;
const DROP_MS = 300;
const CARRY_WHITE = 0.5;
const WHITE_FADE_MS = 350;

interface Hook {
  workerIndex: number;
  dropX: number;
  launchAt: number;
  arriveAt: number;
  releaseAt: number;
  landAt: number;
}

interface RunningConveyor {
  floor: Floor;
  hooks: Hook[];
  startX: number;
  exitX: number;
  speed: number; // px a ms
  startedAt: number;
}

let running: RunningConveyor | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.conveyorEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      findUnderstaffedFloor(floor, context.getOnScreenFloors) !== null,
    arm: startConveyor,
  },
  { label: "Conveyor", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Conveyor
export function forceConveyorEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// where hook is along the rail `ms` in, or null while it's off the screen
function hookX(event: RunningConveyor, hook: Hook, ms: number): number | null {
  if (ms < hook.launchAt) return null;
  if (ms < hook.arriveAt)
    return event.startX + (ms - hook.launchAt) * event.speed;
  if (ms < hook.releaseAt) return hook.dropX;
  const x = hook.dropX + (ms - hook.releaseAt) * event.speed;
  return x > event.exitX ? null : x;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const rect = getFloorRect(event.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - event.startedAt;
  ctx.save();
  ctx.translate(rect.left, rect.top);
  for (const hook of event.hooks) {
    const x = hookX(event, hook, ms);
    if (ms >= hook.launchAt) {
      // the worker dangles under its hook, then falls ever faster once let go
      const carried = ms < hook.releaseAt;
      const fall = Math.min(1, Math.max(0, (ms - hook.releaseAt) / DROP_MS));
      const dx = carried && x !== null ? x - hook.dropX : 0;
      const dy = -DROP_HEIGHT * (1 - fall * fall);
      const white =
        ms < hook.landAt
          ? CARRY_WHITE
          : CARRY_WHITE * Math.max(0, 1 - (ms - hook.landAt) / WHITE_FADE_MS);
      if (carried && x !== null) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = COLOR.heavenlyGold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, RAIL_Y);
        ctx.lineTo(x, RAIL_Y + HOOK_GAP);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(dx, dy);
      drawWorkerSpotlight(ctx, event.floor, hook.workerIndex, white, 0);
      ctx.restore();
    }
    if (x === null) continue;
    drawWisp(
      ctx,
      (t) => {
        const at = hookX(event, hook, t);
        return at === null ? null : { x: at, y: RAIL_Y };
      },
      ms,
      now,
      WISP_SIZE,
    );
  }
  ctx.restore();
}

function startConveyor(clicked: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const floor = findUnderstaffedFloor(clicked, context.getOnScreenFloors);
  if (!floor) return;
  const { crossMs, staggerMs, holdMs } = CONFIG.conveyorEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  // every missing worker is hired at once, each where it'll be dropped
  const drops = recruitToCap(floor, Date.now());
  if (drops.length === 0) return;
  const area = context.getScreenAreaLocal?.(floor);
  const startX = (area?.left ?? 0) - OFF_SCREEN;
  const exitX = (area?.right ?? FLOOR_W) + OFF_SCREEN;
  const speed = FLOOR_W / crossMs;
  // the farthest spot first, so no hook glides past one still waiting
  drops.sort((a, b) => b.x - a.x);
  const hooks: Hook[] = drops.map(({ workerIndex, x }, k) => {
    const launchAt = k * staggerMs;
    const arriveAt = launchAt + (x - startX) / speed;
    const releaseAt = arriveAt + PAUSE_MS;
    return {
      workerIndex,
      dropX: x,
      launchAt,
      arriveAt,
      releaseAt,
      landAt: releaseAt + DROP_MS,
    };
  });
  const event: RunningConveyor = {
    floor,
    hooks,
    startX,
    exitX,
    speed,
    startedAt: performance.now(),
  };
  running = event;
  const isLive = () => running === event;
  setWorkerSpotlight(
    floor,
    hooks.map((hook) => hook.workerIndex),
  );
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  for (const hook of hooks)
    setTimeout(() => {
      if (isLive()) celebrateWorkerBoost(floor, hook.workerIndex, Date.now());
    }, hook.landAt);

  const last = hooks[hooks.length - 1];
  const endAt = Math.max(
    last.landAt + holdMs,
    last.releaseAt + (exitX - last.dropX) / speed,
  );
  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    stopSound();
    clearWorkerSpotlight();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the hires
    context.applyTierCrit?.(clicked, tier);
    endEventProc(KEY);
  }, endAt);
}
