// the "Halo" event: it covers its crit, whose click freezes the screen while
// glimmer lights spiral in from off screen to circle the lowest-tier worker in
// view, orbit it, then shrink into a glowing halo settling over its head: that
// worker jumps straight to the top perma tier. Then the screen unfreezes and
// the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { startBoostEventStreamLoop } from "../../../../sound";
import { CRIT_TIER_ORDER, pickCritTierByOdds } from "../../../critTypes";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  freezeScreen,
  getScreenFreezeDim,
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
  getWorkerPermaTier,
  promoteWorkerPermaTier,
  setWorkerSpotlights,
  WORKER_HEIGHT,
} from "../../../../floors/worker";
import {
  findOnScreenWorkers,
  pickLowestTierClimber,
  type OnScreenWorker,
} from "../../onScreenWorkers";
import { clamp01, smoothstep as ease } from "../../../../shared/easing";

const KEY = "halo";
const LIGHTS = 8;
// the lights' size once they've formed the halo, of a wisp's
const CROWNED_SIZE = 0.6;
// the lights start this far out, orbit at ORBIT of the worker's height and
// settle into a halo HALO_RX wide (of its height) and HALO_SQUASH as tall
const START_RADIUS = 900;
const ORBIT = 0.85;
// the orbit is a ring seen from just above, this tall of its width
const ORBIT_SQUASH = 0.38;
const HALO_RX = 0.24;
const HALO_SQUASH = 0.28;
// the halo hangs this far above the worker's middle, of its height
const HALO_RISE = 0.62;
// turns a second the lights circle at, speeding up by SPIN_ACCEL a second until crowned
const SPIN = 0.6;
const SPIN_ACCEL = 1.2;
// the lights launch one after another over this share of gatherMs, each
// starting SWOOP (radians) behind its slot and curving through BEND of START_RADIUS
const STAGGER = 0.4;
const SWOOP = Math.PI * 0.6;
const BEND = 0.6;
// the orbiting ring sways this much (radians), once every TILT_MS * 2π
const TILT = 0.2;
const TILT_MS = 260;
// lights at the back of the ring are this much smaller, behind the worker
const DEPTH = 0.35;
const BURST_MS = 600;

interface RunningHalo {
  worker: OnScreenWorker;
  startedAt: number;
  crownedAt: number | null;
}

let running: RunningHalo | null = null;

// the lowest-tier worker in view that can still climb
function findWorker(
  floor: Floor,
  context: EventProcContext,
): OnScreenWorker | null {
  return pickLowestTierClimber(
    findOnScreenWorkers(floor, context.getOnScreenFloors) ?? [],
  );
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.haloEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running && !isScreenFrozen() && findWorker(floor, context) !== null,
    arm: startHalo,
  },
  { label: "Halo", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Halo
export function forceHaloEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the ring's turns `ms` in, spinning ever faster until crowned
function ringTurns(ms: number): number {
  const { gatherMs, orbitMs, settleMs } = CONFIG.haloEvent;
  const t = ms / 1000;
  const tc = Math.min(t, (gatherMs + orbitMs + settleMs) / 1000);
  return SPIN * t + SPIN_ACCEL * ((tc * tc) / 2 + tc * (t - tc));
}

// light i's slot on the swaying ring around the worker's middle (cx, cy),
// shrinking and rising into the halo. `front` slots pass before the worker,
// back ones shrink behind it
function ringAt(i: number, ms: number, cx: number, cy: number) {
  const { gatherMs, orbitMs, settleMs } = CONFIG.haloEvent;
  const settle = ease(clamp01((ms - gatherMs - orbitMs) / settleMs));
  const angle = (i / LIGHTS + ringTurns(ms)) * Math.PI * 2;
  const radius = WORKER_HEIGHT * (ORBIT + (HALO_RX - ORBIT) * settle);
  const squash = ORBIT_SQUASH + (HALO_SQUASH - ORBIT_SQUASH) * settle;
  const tilt = TILT * Math.sin(ms / TILT_MS) * (1 - settle);
  const dx = Math.cos(angle) * radius;
  const dy = Math.sin(angle) * radius * squash;
  const depth = Math.sin(angle);
  return {
    x: cx + dx * Math.cos(tilt) - dy * Math.sin(tilt),
    y:
      cy -
      WORKER_HEIGHT * HALO_RISE * settle +
      dx * Math.sin(tilt) +
      dy * Math.cos(tilt),
    front: depth >= 0,
    scale: 1 - (DEPTH * (1 - depth)) / 2,
  };
}

// light i `ms` in: once launched it swoops in from off screen on a curve
// swirling the ring's way, slowing as it drops into its slot
function lightAt(i: number, ms: number, cx: number, cy: number) {
  const { gatherMs } = CONFIG.haloEvent;
  const launchAt = (i / (LIGHTS - 1)) * STAGGER * gatherMs;
  if (ms < launchAt) return null;
  const ring = ringAt(i, ms, cx, cy);
  const travelMs = gatherMs * (1 - STAGGER);
  const p = clamp01((ms - launchAt) / travelMs);
  if (p >= 1) return ring;
  const e = 1 - (1 - p) ** 2;
  const arriveAngle =
    (i / LIGHTS + ringTurns(launchAt + travelMs)) * Math.PI * 2;
  const fromAngle = arriveAngle - SWOOP;
  const bendAngle = arriveAngle - SWOOP / 2;
  const fromX = cx + Math.cos(fromAngle) * START_RADIUS;
  const fromY = cy + Math.sin(fromAngle) * START_RADIUS;
  const bendX = cx + Math.cos(bendAngle) * START_RADIUS * BEND;
  const bendY = cy + Math.sin(bendAngle) * START_RADIUS * BEND;
  const a = (1 - e) ** 2;
  const b = 2 * (1 - e) * e;
  const c = e * e;
  return {
    x: a * fromX + b * bendX + c * ring.x,
    y: a * fromY + b * bendY + c * ring.y,
    front: e < 0.9 || ring.front,
    scale: 1 + (ring.scale - 1) * e,
  };
}

// light i: a wisp, shrinking a little once the halo forms
function drawLight(
  ctx: CanvasRenderingContext2D,
  i: number,
  ms: number,
  now: number,
  cx: number,
  cy: number,
  crowned: boolean,
): void {
  drawWisp(
    ctx,
    (t) => lightAt(i, t, cx, cy),
    ms,
    now,
    WISP_SIZE * (crowned ? CROWNED_SIZE : 1),
  );
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const { floor, workerIndex, center } = event.worker;
  const rect = getFloorRect(floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - event.startedAt;
  const crowned = event.crownedAt !== null;
  const isFront = (i: number) =>
    lightAt(i, ms, center.x, center.y)?.front ?? true;
  ctx.save();
  ctx.translate(rect.left, rect.top);
  for (let i = 0; i < LIGHTS; i++)
    if (!isFront(i)) drawLight(ctx, i, ms, now, center.x, center.y, crowned);
  drawWorkerSpotlight(
    ctx,
    floor,
    workerIndex,
    0,
    0,
    event.crownedAt === null ? getScreenFreezeDim() : 0,
  );

  // the halo ring itself glows in once the lights have settled
  const haloX = center.x;
  const haloY = center.y - WORKER_HEIGHT * HALO_RISE;
  if (event.crownedAt !== null) {
    const glow = clamp01((now - event.crownedAt) / 200);
    drawWhiteBurst(ctx, haloX, haloY, (now - event.crownedAt) / BURST_MS, 0.4);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [width, color, alpha] of [
      [14, COLOR.heavenlyGold, 0.3],
      [6, COLOR.heavenlyGold, 0.9],
      [2, COLOR.white, 1],
    ] as const) {
      ctx.globalAlpha = alpha * glow;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.ellipse(
        haloX,
        haloY,
        WORKER_HEIGHT * HALO_RX,
        WORKER_HEIGHT * HALO_RX * HALO_SQUASH,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
  for (let i = 0; i < LIGHTS; i++)
    if (isFront(i)) drawLight(ctx, i, ms, now, center.x, center.y, crowned);
  ctx.restore();
}

function startHalo(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const worker = findWorker(floor, context);
  if (!worker) return;
  const { gatherMs, orbitMs, settleMs, holdMs } = CONFIG.haloEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const event: RunningHalo = {
    worker,
    startedAt: performance.now(),
    crownedAt: null,
  };
  running = event;
  const isLive = () => running === event;
  setWorkerSpotlights([
    { floor: worker.floor, workerIndexes: [worker.workerIndex] },
  ]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  const crownAt = gatherMs + orbitMs + settleMs;
  setTimeout(() => {
    if (!isLive()) return;
    event.crownedAt = performance.now();
    while (
      getWorkerPermaTier(worker.floor, worker.workerIndex) !==
      CRIT_TIER_ORDER[0]
    )
      promoteWorkerPermaTier(worker.floor, worker.workerIndex);
    celebrateWorkerBoost(worker.floor, worker.workerIndex, Date.now());
  }, crownAt);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    stopSound();
    clearWorkerSpotlight();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the promotion
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, crownAt + holdMs);
}
