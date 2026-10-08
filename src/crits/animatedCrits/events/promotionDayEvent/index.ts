// the "Promotion Day" event: it covers its crit, whose click freezes the screen
// while glimmer lights rise from every worker on the clicked floor into its
// income bar, which builds up, slams and climbs one crit tier, its new tier's
// label popping above it. Then the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { startBoostEventStreamLoop } from "../../../../sound";
import { isFloorLocked } from "../../../../shared/detachedJob";
import {
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
  nextCritTier,
  pickCritTierByOdds,
} from "../../../critTypes";
import { drawPoppingCritText } from "../../../critFlash/critText";
import { createEventFx, type EventFx } from "../../../../shared/eventFx";
import { triggerEventEndSlam } from "../../../../shared/eventEndSlam";
import {
  drawEventStreams,
  streamGlimmers,
} from "../../../../shared/eventStream";
import { drawGoldShimmer } from "../../../../shared/goldShimmer";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import {
  drawIncomePanel,
  getIncomeBarCenter,
  setIncomePanelsHidden,
} from "../../../../floors/incomePanel";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  getRenderedWorkerCount,
  getWorkerCenter,
  setWorkerSpotlight,
  WORKER_HEIGHT,
} from "../../../../floors/worker";

const KEY = "promotionDay";
const WORKER_GLOW = WORKER_HEIGHT * 0.5;
const LABEL_FONT = 64;
const LABEL_RISE = 70;

interface RunningPromotion {
  floor: Floor;
  isGroundFloor: boolean;
  workers: { index: number; x: number; y: number }[];
  bar: { x: number; y: number };
  fx: EventFx;
  startedAt: number;
  promotedAt: number | null;
}

let running: RunningPromotion | null = null;

function canStart(floor: Floor, context: EventProcContext): boolean {
  if (running || isScreenFrozen()) return false;
  if (!floor.unlocked || isFloorLocked(floor)) return false;
  if (floor.critMultiplierTier === CRIT_TIER_ORDER[0]) return false;
  const entry = context.getOnScreenFloors?.().find((f) => f.floor === floor);
  return (
    entry !== undefined &&
    isVisibleOnFloor(entry, getIncomeBarCenter(context.isGroundFloor).y)
  );
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.promotionDayEvent.chance,
    isInProgress: () => running !== null,
    canArm: canStart,
    arm: startPromotion,
  },
  { label: "Promotion Day", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Promotion Day
export function forcePromotionDayEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const rect = getFloorRect(event.floor);
  if (rect) {
    const now = performance.now();
    const rising =
      event.promotedAt === null
        ? Math.min(
            1,
            (now - event.startedAt) / CONFIG.promotionDayEvent.streamMs,
          )
        : 0;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    for (const worker of event.workers) {
      drawGoldShimmer(
        ctx,
        worker.x,
        worker.y,
        WORKER_GLOW,
        rising,
        2,
        now,
        COLOR.heavenlyGold,
      );
      drawWorkerSpotlight(ctx, event.floor, worker.index, 0, 0);
    }
    const { x, y } = event.bar;
    event.fx.draw(ctx, x, y, ({ white, rotation }) =>
      drawIncomePanel(ctx, event.floor, event.isGroundFloor, {
        whiteAlpha: white,
        rotation,
      }),
    );
    const tier = event.floor.critMultiplierTier;
    if (event.promotedAt !== null && tier)
      drawPoppingCritText(
        ctx,
        CRIT_TIER_CONFIG[tier].label,
        x,
        y - LABEL_RISE,
        CRIT_TIER_CONFIG[tier].color,
        event.promotedAt,
        now,
        { fontSize: LABEL_FONT, strokeWidth: 8 },
      );
    ctx.restore();
  }
  drawEventStreams(ctx, getFloorRect);
}

function startPromotion(floor: Floor, context: EventProcContext): void {
  if (!canStart(floor, context)) return;
  const { streamMs, holdMs } = CONFIG.promotionDayEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const workers: RunningPromotion["workers"] = [];
  for (let i = 0; i < getRenderedWorkerCount(floor); i++) {
    const center = getWorkerCenter(floor, i);
    if (center) workers.push({ index: i, ...center });
  }
  if (workers.length === 0) return;
  const bar = getIncomeBarCenter(context.isGroundFloor);
  const event: RunningPromotion = {
    floor,
    isGroundFloor: context.isGroundFloor,
    workers,
    bar,
    fx: createEventFx(streamMs, COLOR.heavenlyGold),
    startedAt: performance.now(),
    promotedAt: null,
  };
  running = event;
  const isLive = () => running === event;
  setWorkerSpotlight(
    floor,
    workers.map((w) => w.index),
  );
  setIncomePanelsHidden([floor]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  streamGlimmers(
    workers.map((w) => ({
      floor,
      x: w.x,
      y: w.y,
      spreadX: WORKER_HEIGHT * 0.3,
      spreadY: WORKER_HEIGHT * 0.5,
    })),
    {
      target: bar,
      durationMs: streamMs,
      isRunning: isLive,
      onEachArrive: () => event.fx.hit(performance.now()),
    },
  );

  setTimeout(() => {
    if (!isLive()) return;
    event.promotedAt = performance.now();
    floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
    triggerEventEndSlam(floor, "bar");
  }, streamMs);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    stopSound();
    clearWorkerSpotlight();
    setIncomePanelsHidden([]);
    unfreezeScreen();
    // the covered crit's own tier, which also saves the promotion
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, streamMs + holdMs);
}
