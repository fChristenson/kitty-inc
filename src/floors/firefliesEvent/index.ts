// the "Fireflies" event: it covers its crit, whose click freezes the screen
// while one firefly per worker the floor in view missing the most is short
// (the wisp, shared/wisp) drifts in from the screen's edges and wanders about
// the floor; then one by one they settle into its empty spots, each forming
// a new worker out of its glow: the floor fills up to its worker cap. Then
// the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { startBoostEventStreamLoop } from "../../sound";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawWisp, WISP_SIZE } from "../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { forceTestCrit } from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  recruitToCap,
  setWorkerSpotlight,
  WORKER_FEET_Y,
  WORKER_HEIGHT,
} from "../worker";
import { findUnderstaffedFloor } from "../onScreenWorkers";
import { drawFormingWorker } from "../formingWorker";
import { FLOOR_W } from "../constants";
import { clamp01, smoothstep as ease } from "../../shared/easing";

const KEY = "fireflies";
// fireflies drift in from this far beyond the screen's edges, a little apart
const OFF_SCREEN = 100;
const LAUNCH_GAP_MS = 120;
// each firefly's worker grows in out of its glow over this long once it arrives
const FORM_MS = 350;

type Point = { x: number; y: number };

interface Firefly {
  workerIndex: number;
  spot: Point;
  launchAt: number;
  settleStart: number;
  settleAt: number;
  at: (ms: number) => Point | null;
  formedAt: number | null;
}

interface RunningFireflies {
  floor: Floor;
  flies: Firefly[];
  startedAt: number;
}

let running: RunningFireflies | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.firefliesEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      findUnderstaffedFloor(floor, context.getOnScreenFloors) !== null,
    arm: startFireflies,
  },
  { label: "Fireflies", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Fireflies
export function forceFirefliesEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

// a firefly's flight, ms from the event's start: drifting in from an edge,
// lazily looping round the floor, then gliding into its spot
function flightOf(
  spot: Point,
  area: { left: number; right: number; top: number },
  launchAt: number,
  settleStart: number,
  settleAt: number,
): (ms: number) => Point | null {
  const { enterMs } = CONFIG.firefliesEvent;
  const cx = between(FLOOR_W * 0.25, FLOOR_W * 0.75);
  const cy = spot.y - WORKER_HEIGHT * between(0.1, 0.5);
  const ax = FLOOR_W * between(0.12, 0.22);
  const ay = WORKER_HEIGHT * between(0.15, 0.3);
  const w1 = (Math.PI * 2) / between(1_400, 2_200);
  const w2 = (Math.PI * 2) / between(900, 1_500);
  const p1 = Math.random() * Math.PI * 2;
  const p2 = Math.random() * Math.PI * 2;
  const wander = (ms: number): Point => ({
    x:
      cx +
      ax * Math.sin(w1 * ms + p1) +
      ax * 0.4 * Math.sin(w1 * 2.3 * ms + p2),
    y: cy + ay * Math.sin(w2 * ms + p2),
  });
  const side = Math.random();
  const entry =
    side < 0.4
      ? { x: area.left - OFF_SCREEN, y: cy + between(-300, 300) }
      : side < 0.8
        ? { x: area.right + OFF_SCREEN, y: cy + between(-300, 300) }
        : { x: between(area.left, area.right), y: area.top - OFF_SCREEN };
  const entered = launchAt + enterMs;
  return (ms) => {
    if (ms < launchAt || ms >= settleAt) return null;
    if (ms < entered) {
      const target = wander(entered);
      const t = 1 - (1 - (ms - launchAt) / enterMs) ** 2;
      return {
        x: entry.x + (target.x - entry.x) * t,
        y: entry.y + (target.y - entry.y) * t,
      };
    }
    if (ms < settleStart) return wander(ms);
    const from = wander(settleStart);
    const t = ease((ms - settleStart) / (settleAt - settleStart));
    return {
      x: from.x + (spot.x - from.x) * t,
      y: from.y + (spot.y - from.y) * t,
    };
  };
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
  for (const fly of event.flies) {
    const form = ease(clamp01((ms - fly.settleAt) / FORM_MS));
    drawFormingWorker(
      ctx,
      event.floor,
      fly.workerIndex,
      fly.spot.x,
      fly.spot.y,
      form,
      form,
      fly.formedAt,
      now,
    );
  }
  for (const fly of event.flies) drawWisp(ctx, fly.at, ms, now, WISP_SIZE);
  ctx.restore();
}

function startFireflies(clicked: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const floor = findUnderstaffedFloor(clicked, context.getOnScreenFloors);
  if (!floor) return;
  const area = context.getScreenAreaLocal?.(floor) ?? {
    left: 0,
    right: FLOOR_W,
    top: -WORKER_HEIGHT * 2,
  };
  // every missing worker is hired at once, each where its firefly settles
  const hires = recruitToCap(floor, Date.now());
  if (hires.length === 0) return;
  const { enterMs, wanderMs, settleMs, gapMs, holdMs } = CONFIG.firefliesEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const settleOrder = [...hires].sort(() => Math.random() - 0.5);
  const flies: Firefly[] = hires.map(({ workerIndex, x }, k) => {
    const spot = { x, y: WORKER_FEET_Y - WORKER_HEIGHT / 2 };
    const launchAt = k * LAUNCH_GAP_MS;
    const settleStart =
      enterMs +
      wanderMs +
      settleOrder.findIndex((h) => h.workerIndex === workerIndex) * gapMs;
    const settleAt = settleStart + settleMs;
    return {
      workerIndex,
      spot,
      launchAt,
      settleStart,
      settleAt,
      at: flightOf(spot, area, launchAt, settleStart, settleAt),
      formedAt: null,
    };
  });
  const event: RunningFireflies = {
    floor,
    flies,
    startedAt: performance.now(),
  };
  running = event;
  const isLive = () => running === event;
  setWorkerSpotlight(
    floor,
    flies.map((fly) => fly.workerIndex),
  );
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  for (const fly of flies)
    setTimeout(() => {
      if (!isLive()) return;
      fly.formedAt = performance.now();
      celebrateWorkerBoost(floor, fly.workerIndex, Date.now());
    }, fly.settleAt + FORM_MS);

  const lastSettle = Math.max(...flies.map((fly) => fly.settleAt)) + FORM_MS;
  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    stopSound();
    clearWorkerSpotlight();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the hires
    context.applyTierCrit?.(clicked, tier);
    endEventProc(KEY);
  }, lastSettle + holdMs);
}
