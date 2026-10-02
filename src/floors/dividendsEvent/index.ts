// the "Dividends" event: it covers its crit, whose click freezes the screen
// while glimmer lights stream from the clicked floor's button into the
// lowest-tier worker in view; it climbs one perma tier, then sprays a coin
// stream into the total, paying its floor's payout a few times. Then the
// crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSold, startBoostEventStreamLoop } from "../../sound";
import { multiply } from "../../shared/bigNumber";
import { pickCritTierByOdds } from "../../shared/critTypes";
import {
  addTargetStream,
  createEventFx,
  drawWhiteBurst,
  removeTargetStream,
  type EventFx,
} from "../../shared/eventFx";
import { GLOBAL_SLAM, triggerEventEndSlam } from "../../shared/eventEndSlam";
import {
  drawEventStreams,
  streamCoins,
  streamGlimmers,
} from "../../shared/eventStream";
import { drawGoldShimmer } from "../../shared/goldShimmer";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../shared/totalIncomeCoins";
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
  promoteWorkerPermaTier,
  setWorkerSpotlight,
  WORKER_HEIGHT,
} from "../worker";
import {
  findOnScreenWorkers,
  pickLowestTierClimber,
  type OnScreenWorker,
} from "../onScreenWorkers";

const KEY = "dividends";
const WORKER_GLOW = WORKER_HEIGHT * 0.45;
const PULSE_MS = 250;
const BURST_MS = 600;

interface RunningDividends {
  worker: OnScreenWorker;
  startedAt: number;
  lastLandedAt: number;
  promotedAt: number | null;
  totalFx: EventFx | null;
}

let running: RunningDividends | null = null;

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
    chance: () => CONFIG.dividendsEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running && !isScreenFrozen() && findWorker(floor, context) !== null,
    arm: startDividends,
  },
  { label: "Dividends", color: COLOR.moneyGreen },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Dividends
export function forceDividendsEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: { x: number; y: number },
): void {
  const event = running;
  if (!event) return;
  const { floor, workerIndex, center } = event.worker;
  const rect = getFloorRect(floor);
  if (rect) {
    const now = performance.now();
    const lift = Math.min(
      1,
      (now - event.startedAt) / CONFIG.dividendsEvent.liftMs,
    );
    const pulse = Math.max(0, 1 - (now - event.lastLandedAt) / PULSE_MS);
    ctx.save();
    ctx.translate(rect.left, rect.top);
    if (pulse > 0)
      drawGoldShimmer(
        ctx,
        center.x,
        center.y,
        WORKER_GLOW,
        pulse,
        3,
        now,
        COLOR.heavenlyGold,
      );
    // the worker brightens out of the dimmed frame as the lights land
    const dim = getScreenFreezeDim() * (1 - lift);
    drawWorkerSpotlight(ctx, floor, workerIndex, 0, 0, dim);
    if (event.promotedAt !== null)
      drawWhiteBurst(
        ctx,
        center.x,
        center.y,
        (now - event.promotedAt) / BURST_MS,
        0.4,
      );
    ctx.restore();
  }
  // the spotlit total, with its lights and beats, is drawn live on top by the game canvas
  drawEventStreams(ctx, getFloorRect, totalTarget);
}

function startDividends(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const worker = findWorker(floor, context);
  const floorTop = context
    .getOnScreenFloors?.()
    .find((entry) => entry.floor === floor)?.top;
  if (!worker || floorTop === undefined) return;
  const { liftMs, sprayMs, payouts } = CONFIG.dividendsEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const event: RunningDividends = {
    worker,
    startedAt: performance.now(),
    lastLandedAt: 0,
    promotedAt: null,
    totalFx: null,
  };
  running = event;
  const isLive = () => running === event;
  setWorkerSpotlight(worker.floor, worker.workerIndex);
  freezeScreen(drawOverlay, { spotlightTotal: true });
  const stopSound = startBoostEventStreamLoop();

  const button = getButtonCenter(context.isGroundFloor);
  streamGlimmers(
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
      // local to the clicked floor, like the lights' start
      target: {
        x: worker.center.x,
        y: worker.center.y + worker.top - floorTop,
      },
      durationMs: liftMs,
      isRunning: isLive,
      onEachArrive: () => {
        event.lastLandedAt = performance.now();
      },
    },
  );

  // promoted, the worker sprays its dividends into the total
  setTimeout(() => {
    if (!isLive()) return;
    event.promotedAt = performance.now();
    promoteWorkerPermaTier(worker.floor, worker.workerIndex);
    celebrateWorkerBoost(worker.floor, worker.workerIndex, Date.now());
    const totalFx = createEventFx(sprayMs);
    event.totalFx = totalFx;
    addTargetStream(GLOBAL_SLAM, "total", totalFx, true);
    streamCoins(
      [
        {
          floor: worker.floor,
          x: worker.center.x,
          y: worker.center.y,
          spreadX: WORKER_HEIGHT * 0.3,
          spreadY: WORKER_HEIGHT * 0.5,
        },
      ],
      {
        durationMs: sprayMs,
        isRunning: isLive,
        onEachArrive: pulseHudTotalFlash,
      },
    );
  }, liftMs);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    if (event.totalFx) removeTargetStream(event.totalFx);
    stopSound();
    clearWorkerSpotlight();
    unfreezeScreen();
    addTotalIncome(
      multiply(currentPayoutAmount(worker.floor, Date.now()), payouts),
    );
    triggerHudTotalFlash();
    // the covered crit's own tier, revealed as the total jumps
    triggerEventEndSlam(GLOBAL_SLAM, "total", () =>
      context.applyTierCrit?.(floor, tier),
    );
    playSold();
    endEventProc(KEY);
  }, liftMs + sprayMs);
}
