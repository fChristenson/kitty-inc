// the "Bowling" event: it covers its crit, whose click freezes the screen
// while the wisp rolls in from off the screen's left edge along the clicked
// floor like a bowling ball, ever faster, smashing into every worker on it:
// each is knocked flying in a full flip with a bang and a shake, lands in a
// burst and climbs one perma tier. Then the screen unfreezes and the crit's
// tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { startBoostEventStreamLoop } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  drawFreezeDimmed,
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
  promoteWorkerPermaTier,
  WORKER_HEIGHT,
} from "../../../../floors/worker";
import {
  findOnScreenWorkers,
  isClimber,
  spotlightWorkers,
  type OnScreenWorker,
} from "../../onScreenWorkers";
import { clamp01 } from "../../../../shared/easing";

const KEY = "bowling";
// the ball rolls from this far off the screen's left edge to this far off its
// right, at shin height, speeding up (its share of the way is u^ROLL_EASE)
const ROLL_OUT = 80;
const ROLL_EASE = 1.4;
const SHIN = 0.3; // of the worker's height, below its middle
// it hits a worker this far before reaching its middle
const HIT_REACH = WORKER_HEIGHT * 0.2;
// a hit worker flies up FLY_UP px and FLY_ON px along, flipping once
const FLY_UP = WORKER_HEIGHT * 1.6;
const FLY_ON = WORKER_HEIGHT * 0.5;
const HIT_SHAKE = 0.9;
const LAND_SHAKE = 0.5;
const BURST_MS = 450;

interface Pin {
  worker: OnScreenWorker;
  climbs: boolean;
  hitAt: number | null;
  landedAt: number | null;
}

interface RunningBowl {
  floor: Floor;
  // the lane, local to floor
  laneY: number;
  fromX: number;
  toX: number;
  pins: Pin[];
  startedAt: number;
  allLanded: boolean;
}

let running: RunningBowl | null = null;

// every worker on floor in view
function pinsOn(floor: Floor, context: EventProcContext): OnScreenWorker[] {
  return (findOnScreenWorkers(floor, context.getOnScreenFloors) ?? []).filter(
    (w) => w.floor === floor,
  );
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.bowlingEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getScreenAreaLocal !== undefined &&
      pinsOn(floor, context).some(isClimber),
    arm: startBowling,
  },
  { label: "Bowling", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Bowling
export function forceBowlingEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function ballX(bowl: RunningBowl, ms: number): number {
  const u = clamp01(ms / CONFIG.bowlingEvent.rollMs) ** ROLL_EASE;
  return bowl.fromX + (bowl.toX - bowl.fromX) * u;
}

// knocks over every pin the ball has reached, and lands every flipped one,
// on the frame it's drawn
function landBeats(bowl: RunningBowl, ms: number, now: number): void {
  const { flyMs } = CONFIG.bowlingEvent;
  const x = ballX(bowl, ms);
  for (const pin of bowl.pins) {
    if (pin.hitAt === null && x >= pin.worker.center.x - HIT_REACH) {
      pin.hitAt = now;
      playExplosion();
      shakeScreen(HIT_SHAKE);
    }
    if (
      pin.hitAt !== null &&
      pin.landedAt === null &&
      now - pin.hitAt >= flyMs
    ) {
      pin.landedAt = now;
      shakeScreen(LAND_SHAKE);
      if (pin.climbs) {
        promoteWorkerPermaTier(pin.worker.floor, pin.worker.workerIndex);
        celebrateWorkerBoost(
          pin.worker.floor,
          pin.worker.workerIndex,
          Date.now(),
        );
      }
    }
  }
  if (!bowl.allLanded && bowl.pins.every((pin) => pin.landedAt !== null)) {
    bowl.allLanded = true;
    playSlamExplosion();
  }
}

function drawPin(ctx: CanvasRenderingContext2D, pin: Pin, now: number): void {
  const { worker } = pin;
  const t =
    pin.hitAt === null || pin.landedAt !== null
      ? 0
      : clamp01((now - pin.hitAt) / CONFIG.bowlingEvent.flyMs);
  ctx.save();
  ctx.translate(FLY_ON * Math.sin(Math.PI * t), -FLY_UP * 4 * t * (1 - t));
  ctx.translate(worker.center.x, worker.center.y);
  ctx.rotate(t * Math.PI * 2);
  ctx.translate(-worker.center.x, -worker.center.y);
  drawWorkerSpotlight(ctx, worker.floor, worker.workerIndex, 0, 0);
  ctx.restore();
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const bowl = running;
  if (!bowl) return;
  const rect = getFloorRect(bowl.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - bowl.startedAt;
  landBeats(bowl, ms, now);
  ctx.save();
  ctx.translate(rect.left, rect.top);

  drawFreezeDimmed(
    ctx,
    (layer) => {
      for (const pin of bowl.pins)
        if (pin.hitAt === null) drawPin(layer, pin, now);
    },
    [bowl, bowl.pins.filter((pin) => pin.hitAt === null).length],
  );
  for (const pin of bowl.pins) {
    if (pin.hitAt === null) continue;
    drawPin(ctx, pin, now);
    const { x, y } = pin.worker.center;
    drawWhiteBurst(ctx, x, y, (now - pin.hitAt) / BURST_MS, 0.35);
    if (pin.landedAt !== null)
      drawWhiteBurst(
        ctx,
        x,
        y + WORKER_HEIGHT * SHIN,
        (now - pin.landedAt) / BURST_MS,
        0.25,
      );
  }
  drawWisp(
    ctx,
    (t) =>
      t < 0 || t > CONFIG.bowlingEvent.rollMs
        ? null
        : { x: ballX(bowl, t), y: bowl.laneY },
    ms,
    now,
    WISP_SIZE,
    1,
  );
  ctx.restore();
}

function startBowling(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  const workers = pinsOn(floor, context);
  if (running || isScreenFrozen() || !area || workers.length === 0) return;
  const { rollMs, flyMs, holdMs } = CONFIG.bowlingEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const laneY =
    workers.reduce((sum, w) => sum + w.center.y, 0) / workers.length +
    WORKER_HEIGHT * SHIN;
  const bowl: RunningBowl = {
    floor,
    laneY,
    fromX: area.left - ROLL_OUT,
    toX: area.right + ROLL_OUT,
    pins: workers.map((worker) => ({
      worker,
      climbs: isClimber(worker),
      hitAt: null,
      landedAt: null,
    })),
    startedAt: performance.now(),
    allLanded: false,
  };
  running = bowl;
  const isLive = () => running === bowl;
  spotlightWorkers(workers);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  setTimeout(
    () => {
      if (!isLive()) return;
      for (const pin of bowl.pins)
        if (pin.landedAt === null && pin.climbs)
          promoteWorkerPermaTier(pin.worker.floor, pin.worker.workerIndex);
      running = null;
      stopSound();
      clearWorkerSpotlight();
      unfreezeScreen();
      // the covered crit's own tier, which also saves the promotions
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    rollMs + flyMs + holdMs,
  );
}
