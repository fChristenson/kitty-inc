// the "Recruit" event: it covers its crit, whose click freezes the screen while
// glimmer lights stream in from the screen's edges to an empty spot on a floor
// in view, where a new worker forms out of their glow and lands with a slam: a
// free hire. Then the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { startBoostEventStreamLoop } from "../../../../sound";
import { pickCritTierByOdds } from "../../../critTypes";
import {
  drawEventStreams,
  streamGlimmers,
  type StreamSource,
} from "../../../../shared/eventStream";
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
  recruitWorker,
  setWorkerSpotlight,
  WORKER_HEIGHT,
} from "../../../../floors/worker";
import { findRecruitSpots } from "../../onScreenWorkers";
import { drawFormingWorker } from "../../formingWorker";
import { clamp01, smoothstep as ease } from "../../../../shared/easing";

const KEY = "recruit";
const PULSE_MS = 250;
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
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawFormingWorker(
      ctx,
      floor,
      event.workerIndex,
      x,
      y,
      form,
      Math.max(form, pulse),
      event.formedAt,
      now,
    );
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
