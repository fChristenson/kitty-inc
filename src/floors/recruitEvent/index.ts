// the "Recruit" event: it covers its crit, whose click freezes the screen while
// glimmer lights stream in from the screen's edges to an empty spot on a floor
// in view, where a new worker forms out of their glow and lands with a slam: a
// free hire. Then the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { startBoostEventStreamLoop } from "../../sound";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawWhiteBurst } from "../../shared/eventFx";
import {
  drawEventStreams,
  streamGlimmers,
  type StreamSource,
} from "../../shared/eventStream";
import { drawGoldShimmer } from "../../shared/goldShimmer";
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
  drawWorkerSpotlight,
  recruitWorker,
  setWorkerSpotlight,
  WORKER_HEIGHT,
} from "../worker";
import { findRecruitSpots } from "../onScreenWorkers";

const KEY = "recruit";
// the forming worker grows from this share of its size up to full
const FORM_SCALE = 0.6;
// its white glow fades out over this long once it lands
const WHITE_FADE_MS = 350;
const GLOW = WORKER_HEIGHT * 0.7;
const PULSE_MS = 250;
const BURST_MS = 600;
// without a known screen area, the lights start this far from the spot
const FALLBACK_REACH = 900;

interface Spot {
  floor: Floor;
  x: number;
  y: number;
}

interface RunningRecruit {
  spot: Spot;
  workerIndex: number;
  startedAt: number;
  lastLandedAt: number;
  formedAt: number | null;
}

let running: RunningRecruit | null = null;

// an empty spot on a floor in view, the clicked floor's own first
function findSpot(floor: Floor, context: EventProcContext): Spot | null {
  const spots = findRecruitSpots(floor, context.getOnScreenFloors);
  return (
    spots.find((s) => s.floor === floor) ??
    spots[Math.floor(Math.random() * spots.length)] ??
    null
  );
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.recruitEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running && !isScreenFrozen() && findSpot(floor, context) !== null,
    arm: startRecruit,
  },
  { label: "Recruit", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Recruit
export function forceRecruitEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const { floor, x, y } = event.spot;
  const rect = getFloorRect(floor);
  if (rect) {
    const now = performance.now();
    const ms = now - event.startedAt;
    const form = ease(clamp01(ms / CONFIG.recruitEvent.streamMs));
    const pulse = Math.max(0, 1 - (now - event.lastLandedAt) / PULSE_MS);
    const feetY = y + WORKER_HEIGHT / 2;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawGoldShimmer(
      ctx,
      x,
      y,
      GLOW * (0.5 + 0.5 * form),
      event.formedAt === null ? Math.max(form, pulse) : 0,
      2,
      now,
      COLOR.heavenlyGold,
    );
    ctx.save();
    const scale = FORM_SCALE + (1 - FORM_SCALE) * form;
    ctx.globalAlpha = form;
    ctx.translate(x, feetY);
    ctx.scale(scale, scale);
    ctx.translate(-x, -feetY);
    const white =
      event.formedAt === null
        ? 1
        : 1 - clamp01((now - event.formedAt) / WHITE_FADE_MS);
    drawWorkerSpotlight(ctx, floor, event.workerIndex, white, 0);
    ctx.restore();
    if (event.formedAt !== null)
      drawWhiteBurst(ctx, x, y, (now - event.formedAt) / BURST_MS, 0.4);
    ctx.restore();
  }
  drawEventStreams(ctx, getFloorRect);
}

// the lights pour in from the screen's left, right and top edges
function streamSources(spot: Spot, context: EventProcContext): StreamSource[] {
  const area = context.getScreenAreaLocal?.(spot.floor) ?? {
    left: spot.x - FALLBACK_REACH,
    right: spot.x + FALLBACK_REACH,
    top: spot.y - FALLBACK_REACH,
  };
  const { floor, x, y } = spot;
  return [
    { floor, x: area.left, y, spreadY: WORKER_HEIGHT },
    { floor, x: area.right, y, spreadY: WORKER_HEIGHT },
    { floor, x, y: area.top, spreadX: WORKER_HEIGHT * 2 },
  ];
}

function startRecruit(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const spot = findSpot(floor, context);
  if (!spot) return;
  const workerIndex = recruitWorker(spot.floor, spot.x, Date.now());
  if (workerIndex === null) return;
  const { streamMs, holdMs } = CONFIG.recruitEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const event: RunningRecruit = {
    spot,
    workerIndex,
    startedAt: performance.now(),
    lastLandedAt: 0,
    formedAt: null,
  };
  running = event;
  const isLive = () => running === event;
  setWorkerSpotlight(spot.floor, workerIndex);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  streamGlimmers(streamSources(spot, context), {
    target: { x: spot.x, y: spot.y },
    durationMs: streamMs,
    isRunning: isLive,
    onEachArrive: () => {
      event.lastLandedAt = performance.now();
    },
  });

  setTimeout(() => {
    if (!isLive()) return;
    event.formedAt = performance.now();
    celebrateWorkerBoost(spot.floor, workerIndex, Date.now());
  }, streamMs);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    stopSound();
    clearWorkerSpotlight();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the hire
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, streamMs + holdMs);
}
