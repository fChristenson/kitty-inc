// the "Alchemy" event: it covers its crit, whose click freezes the screen while
// a cauldron pops up in an open spot on the floor and the button pours coins
// into it; the brew bubbles up ever harder, then boils over and shoots
// glimmer lights into the floor's lowest-tier worker, which climbs one perma
// tier as the floor pays out. Then the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { startBoostEventStreamLoop } from "../../sound";
import { multiply } from "../../shared/bigNumber";
import { pickCritTierByOdds } from "../../shared/critTypes";
import {
  createEventFx,
  drawWhiteBurst,
  type EventFx,
} from "../../shared/eventFx";
import {
  drawEventStreams,
  streamCoins,
  streamGlimmers,
} from "../../shared/eventStream";
import { drawGoldShimmer } from "../../shared/goldShimmer";
import { triggerHudTotalFlash } from "../../shared/totalIncomeCoins";
import {
  freezeScreen,
  getScreenFreezeDim,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { addTotalIncome } from "../../totalIncome";
import { currentPayoutAmount } from "../incomePanel";
import { BTN_H, BTN_W, forceTestCrit, getButtonCenter } from "../upgradeButton";
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
  findOpenSpot,
  promoteWorkerPermaTier,
  setWorkerSpotlight,
  WORKER_HEIGHT,
} from "../worker";
import { findOnScreenWorkers, pickLowestTierClimber } from "../onScreenWorkers";
import { cauldronCenter, cauldronMouth, drawCauldron } from "./cauldron";

const KEY = "alchemy";
const APPEAR_MS = 250;
const VANISH_MS = 300;
const BOIL_OVER_MS = 500;
const WORKER_GLOW = WORKER_HEIGHT * 0.45;
const PULSE_MS = 250;
const BURST_MS = 600;

interface Plan {
  // the cauldron's spot, standing on the floor
  x: number;
  baseY: number;
  workerIndex: number;
  worker: { x: number; y: number };
}

interface RunningAlchemy extends Plan {
  floor: Floor;
  fx: EventFx;
  startedAt: number;
  boiledAt: number | null;
  lastLandedAt: number;
  promotedAt: number | null;
}

let running: RunningAlchemy | null = null;

// an open spot for the cauldron and the floor's lowest-tier climbable worker,
// both in view on the clicked floor
function plan(floor: Floor, context: EventProcContext): Plan | null {
  const pick = pickLowestTierClimber(
    (findOnScreenWorkers(floor, context.getOnScreenFloors) ?? []).filter(
      (w) => w.floor === floor,
    ),
  );
  if (!pick) return null;
  const spot = findOpenSpot(floor);
  return {
    x: spot.x,
    baseY: spot.y + WORKER_HEIGHT / 2,
    workerIndex: pick.workerIndex,
    worker: pick.center,
  };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.alchemyEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running && !isScreenFrozen() && plan(floor, context) !== null,
    arm: startAlchemy,
  },
  { label: "Alchemy", color: COLOR.potionGreen },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Alchemy
export function forceAlchemyEvent(floor: Floor): void {
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
  const rect = getFloorRect(event.floor);
  if (rect) {
    const now = performance.now();
    const { brewMs, shootMs, holdMs } = CONFIG.alchemyEvent;
    const ms = now - event.startedAt;
    const brew =
      event.boiledAt === null
        ? clamp01(event.fx.progress(now))
        : event.promotedAt === null
          ? 1
          : 0.3;
    const size =
      ease(clamp01(ms / APPEAR_MS)) *
      ease(clamp01((brewMs + shootMs + holdMs - ms) / VANISH_MS));
    const { x, baseY } = event;
    const center = cauldronCenter(x, baseY);
    const mouth = cauldronMouth(x, baseY);
    ctx.save();
    ctx.translate(rect.left, rect.top);

    // the worker brightens out of the dimmed frame as the lights land
    const shot =
      event.boiledAt === null ? 0 : clamp01((now - event.boiledAt) / shootMs);
    const pulse = Math.max(0, 1 - (now - event.lastLandedAt) / PULSE_MS);
    if (pulse > 0)
      drawGoldShimmer(
        ctx,
        event.worker.x,
        event.worker.y,
        WORKER_GLOW,
        pulse,
        3,
        now,
        COLOR.potionGreen,
      );
    const dim = getScreenFreezeDim() * (1 - shot);
    drawWorkerSpotlight(ctx, event.floor, event.workerIndex, 0, 0, dim);
    if (event.promotedAt !== null)
      drawWhiteBurst(
        ctx,
        event.worker.x,
        event.worker.y,
        (now - event.promotedAt) / BURST_MS,
        0.4,
      );

    if (size > 0)
      event.fx.draw(ctx, center.x, center.y, ({ rotation }) => {
        ctx.save();
        ctx.translate(x, baseY);
        ctx.rotate(rotation);
        ctx.scale(size, size);
        ctx.translate(-x, -baseY);
        drawCauldron(ctx, x, baseY, brew, now);
        ctx.restore();
      });
    if (event.boiledAt !== null)
      drawWhiteBurst(
        ctx,
        mouth.x,
        mouth.y,
        (now - event.boiledAt) / BOIL_OVER_MS,
        0.5,
      );
    ctx.restore();
  }
  drawEventStreams(ctx, getFloorRect);
}

function startAlchemy(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const target = plan(floor, context);
  if (!target) return;
  const { brewMs, shootMs, holdMs, payouts } = CONFIG.alchemyEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const event: RunningAlchemy = {
    ...target,
    floor,
    fx: createEventFx(brewMs, COLOR.potionGreen),
    startedAt: performance.now(),
    boiledAt: null,
    lastLandedAt: 0,
    promotedAt: null,
  };
  running = event;
  const isLive = () => running === event;
  const mouth = cauldronMouth(event.x, event.baseY);
  setWorkerSpotlight(floor, event.workerIndex);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  const button = getButtonCenter(context.isGroundFloor);
  streamCoins(
    [
      {
        floor,
        x: button.x,
        y: button.y,
        spreadX: BTN_W * 0.75,
        spreadY: BTN_H / 2,
      },
    ],
    {
      target: mouth,
      durationMs: brewMs,
      isRunning: isLive,
      onEachArrive: () => event.fx.hit(performance.now()),
    },
  );

  // the brew boils over into a stream of lights at the worker
  setTimeout(() => {
    if (!isLive()) return;
    event.boiledAt = performance.now();
    streamGlimmers(
      [{ floor, x: mouth.x, y: mouth.y, spreadX: 120, spreadY: 20 }],
      {
        target: event.worker,
        durationMs: shootMs,
        isRunning: isLive,
        onEachArrive: () => {
          event.lastLandedAt = performance.now();
        },
      },
    );
  }, brewMs);

  setTimeout(() => {
    if (!isLive()) return;
    event.promotedAt = performance.now();
    promoteWorkerPermaTier(floor, event.workerIndex);
    const now = Date.now();
    celebrateWorkerBoost(floor, event.workerIndex, now);
    addTotalIncome(multiply(currentPayoutAmount(floor, now), payouts));
    triggerHudTotalFlash();
  }, brewMs + shootMs);

  setTimeout(
    () => {
      if (!isLive()) return;
      running = null;
      stopSound();
      clearWorkerSpotlight();
      unfreezeScreen();
      // the covered crit's own tier, which also saves the promotion
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    brewMs + shootMs + holdMs,
  );
}
