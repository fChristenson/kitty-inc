// the "Harvest" event: it covers its crit, whose click freezes the screen
// while the button tosses a seed beside each worker on the floor; each lands
// with a puff of dirt and a leafy crop shoots up, a gold coin ripening under
// it. Then, left to right, every coin is yanked out of the ground like a
// carrot, spinning up and bursting into a coin stream into the total as its
// worker lights up and climbs one perma tier. The floor pays out per crop,
// the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playSold, startBoostEventStreamLoop } from "../../sound";
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
import { drawEventStreams, streamCoins } from "../../shared/eventStream";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../shared/totalIncomeCoins";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { addTotalIncome } from "../../totalIncome";
import { currentPayoutAmount } from "../incomePanel";
import { forceTestCrit, getButtonCenter } from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  promoteWorkerPermaTier,
  WORKER_FEET_Y,
} from "../worker";
import {
  drawStruckWorkers,
  findOnScreenWorkers,
  spotlightWorkers,
  type OnScreenWorker,
} from "../onScreenWorkers";
import { FLOOR_W } from "../constants";
import { drawClods, drawCrop, drawSeed, YANK_RISE } from "./crop";

const KEY = "harvest";
// a crop grows this far beside its worker, toward the floor's middle
const CROP_OFFSET = 100;
const SEED_ARC = 240;
const SEED_SPINS = 3;
const YANK_MS = 280;
const PUFF_MS = 350;
const BURST_MS = 450;

interface Crop {
  worker: OnScreenWorker;
  x: number;
  // ms from the event's start
  plantAt: number;
  yankAt: number;
  struckAt: number | null;
}

interface RunningHarvest {
  floor: Floor;
  button: { x: number; y: number };
  crops: Crop[];
  startedAt: number;
  totalFx: EventFx | null;
}

let running: RunningHarvest | null = null;

function floorWorkers(
  floor: Floor,
  context: EventProcContext,
): OnScreenWorker[] {
  return (findOnScreenWorkers(floor, context.getOnScreenFloors) ?? []).filter(
    (w) => w.floor === floor,
  );
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.harvestEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running && !isScreenFrozen() && floorWorkers(floor, context).length > 0,
    arm: startHarvest,
  },
  { label: "Harvest", color: COLOR.cropLeaf },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Harvest
export function forceHarvestEvent(floor: Floor): void {
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
  const now = performance.now();
  const ms = now - event.startedAt;
  const { seedMs, growMs } = CONFIG.harvestEvent;
  drawStruckWorkers(
    ctx,
    getFloorRect,
    event.crops.map((c) => ({ worker: c.worker, struckAt: c.struckAt })),
    now,
  );
  const rect = getFloorRect(event.floor);
  if (rect) {
    ctx.save();
    ctx.translate(rect.left, rect.top);
    event.crops.forEach((crop, i) => {
      const grow = (ms - crop.plantAt) / growMs;
      const yank = ms < crop.yankAt ? null : (ms - crop.yankAt) / YANK_MS;
      drawCrop(ctx, crop.x, WORKER_FEET_Y, grow, yank, now, i);
      drawClods(
        ctx,
        crop.x,
        WORKER_FEET_Y,
        (ms - crop.plantAt) / PUFF_MS,
        i,
        0.6,
      );
      const t = (ms - crop.plantAt + seedMs) / seedMs;
      if (t >= 0 && t < 1) {
        const { button } = event;
        drawSeed(
          ctx,
          button.x + (crop.x - button.x) * t,
          button.y +
            (WORKER_FEET_Y - button.y) * t -
            SEED_ARC * 4 * t * (1 - t),
          t * SEED_SPINS * Math.PI * 2,
        );
      }
      drawWhiteBurst(
        ctx,
        crop.x,
        WORKER_FEET_Y - YANK_RISE,
        (ms - crop.yankAt - YANK_MS) / BURST_MS,
        0.35,
      );
    });
    ctx.restore();
  }
  drawEventStreams(ctx, getFloorRect, totalTarget);
}

function startHarvest(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const workers = floorWorkers(floor, context);
  if (workers.length === 0) return;
  const { seedMs, seedGapMs, growMs, popGapMs, streamMs, holdMs, payouts } =
    CONFIG.harvestEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const planted = workers
    .map((worker) => ({
      worker,
      x:
        worker.center.x +
        (worker.center.x < FLOOR_W / 2 ? CROP_OFFSET : -CROP_OFFSET),
    }))
    .sort((a, b) => a.x - b.x);
  const lastPlant = (planted.length - 1) * seedGapMs + seedMs;
  const crops: Crop[] = planted.map((p, i) => ({
    ...p,
    plantAt: i * seedGapMs + seedMs,
    yankAt: lastPlant + growMs + i * popGapMs,
    struckAt: null,
  }));
  const firstBurst = crops[0].yankAt + YANK_MS;
  const lastBurst = crops[crops.length - 1].yankAt + YANK_MS;
  const endMs = lastBurst + streamMs + holdMs;
  const event: RunningHarvest = {
    floor,
    button: getButtonCenter(context.isGroundFloor),
    crops,
    startedAt: performance.now(),
    totalFx: null,
  };
  running = event;
  const isLive = () => running === event;
  spotlightWorkers(workers);
  freezeScreen(drawOverlay, { spotlightTotal: true });
  let stopSound: (() => void) | null = null;

  for (const crop of crops) {
    setTimeout(() => {
      if (isLive()) playBloop();
    }, crop.plantAt);
    setTimeout(() => {
      if (isLive()) playBloop();
    }, crop.yankAt);
    setTimeout(() => {
      if (!isLive()) return;
      crop.struckAt = performance.now();
      const { floor: f, workerIndex } = crop.worker;
      promoteWorkerPermaTier(f, workerIndex);
      celebrateWorkerBoost(f, workerIndex, Date.now());
      streamCoins([{ floor, x: crop.x, y: WORKER_FEET_Y - YANK_RISE }], {
        durationMs: streamMs,
        isRunning: isLive,
        onEachArrive: pulseHudTotalFlash,
      });
    }, crop.yankAt + YANK_MS);
  }

  setTimeout(() => {
    if (!isLive()) return;
    event.totalFx = createEventFx(endMs - firstBurst);
    addTargetStream(GLOBAL_SLAM, "total", event.totalFx, true);
    stopSound = startBoostEventStreamLoop();
  }, firstBurst);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    if (event.totalFx) removeTargetStream(event.totalFx);
    stopSound?.();
    clearWorkerSpotlight();
    unfreezeScreen();
    addTotalIncome(
      multiply(currentPayoutAmount(floor, Date.now()), payouts * crops.length),
    );
    triggerHudTotalFlash();
    // the covered crit's own tier, revealed as the total jumps
    triggerEventEndSlam(GLOBAL_SLAM, "total", () =>
      context.applyTierCrit?.(floor, tier),
    );
    playSold();
    endEventProc(KEY);
  }, endMs);
}
