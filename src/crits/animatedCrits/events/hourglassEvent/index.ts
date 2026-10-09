// the "Hourglass" event: it covers its crit, whose click freezes the screen
// while an hourglass pops up in the screen's middle and the button pours coins
// into it, filling its lower bulb with gold. It turns over, and the gold
// trickles back down through its neck as the coins trickle out of it into the
// total, which pays a minute of the building's income. Then the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSold } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { multiply } from "../../../../shared/bigNumber";
import { pickCritTierByOdds } from "../../../critTypes";
import {
  addTargetStream,
  createEventFx,
  removeTargetStream,
  type EventFx,
} from "../../../../shared/eventFx";
import {
  GLOBAL_SLAM,
  triggerEventEndSlam,
} from "../../../../shared/eventEndSlam";
import { drawEventStreams, streamCoins } from "../../../../shared/eventStream";
import { drawGlimmer, hash01 } from "../../../../shared/twinkle";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../../../shared/totalIncomeCoins";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import {
  addTotalIncome,
  getBuildingsCurrentIncomePerSecond,
} from "../../../../totalIncome";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  BTN_H,
  BTN_W,
  getButtonCenter,
} from "../../../../floors/upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  drawHourglass,
  HOURGLASS_BOTTOM,
  HOURGLASS_HEIGHT,
  HOURGLASS_TOP,
  HOURGLASS_WIDTH,
} from "./hourglass";
import { clamp01, smoothstep as ease } from "../../../../shared/easing";

const KEY = "hourglass";
const APPEAR_MS = 250;
const SCALE = 1.2;
// glimmers twinkling over the glass as it empties, each in and out once a period
const GLIMMERS = 9;
const GLIMMER_SIZE = 20;
const GLIMMER_MS: [number, number] = [500, 900];

interface RunningHourglass {
  floor: Floor;
  x: number;
  y: number;
  startedAt: number;
  // its spotlight and wobble, building with the gold inside it
  fx: EventFx;
  firstHitAt: number | null;
  totalFx: EventFx | null;
}

let running: RunningHourglass | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.hourglassEvent.chance,
    isInProgress: () => running !== null,
    canArm: (_floor, context) =>
      !running && !isScreenFrozen() && context.getScreenAreaLocal !== undefined,
    arm: startHourglass,
  },
  { label: "Hourglass", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Hourglass
export function forceHourglassEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// how far (0..1) it's filled and turned over, and drained, `now`
function progressAt(event: RunningHourglass, now: number) {
  const { fillMs, flipMs, drainMs } = CONFIG.hourglassEvent;
  const ms = now - event.startedAt;
  const filled =
    event.firstHitAt === null
      ? 0
      : clamp01(
          (now - event.firstHitAt) /
            Math.max(1, event.startedAt + fillMs - event.firstHitAt),
        );
  return {
    filled: ease(filled),
    flipped: ease(clamp01((ms - fillMs) / flipMs)),
    drained: clamp01((ms - fillMs - flipMs) / drainMs),
  };
}

function drawGlimmers(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  now: number,
): void {
  for (let i = 0; i < GLIMMERS; i++) {
    const period =
      GLIMMER_MS[0] + (GLIMMER_MS[1] - GLIMMER_MS[0]) * hash01(i, 1);
    const wave = Math.sin(
      ((now + hash01(i, 2) * period) / period) * Math.PI * 2,
    );
    if (wave <= 0) continue;
    drawGlimmer(
      ctx,
      x + (hash01(i, 3) - 0.5) * HOURGLASS_WIDTH * 0.8 * scale,
      y + (hash01(i, 4) - 0.5) * HOURGLASS_HEIGHT * 0.85 * scale,
      GLIMMER_SIZE * wave * (0.6 + 0.4 * hash01(i, 5)),
      now / 300 + i,
      COLOR.heavenlyGold,
    );
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: { x: number; y: number },
): void {
  const event = running;
  if (!event) return;
  const rect = getFloorRect(event.floor);
  if (rect) {
    const { fillMs, flipMs } = CONFIG.hourglassEvent;
    const now = performance.now();
    const ms = now - event.startedAt;
    const scale = SCALE * ease(clamp01(ms / APPEAR_MS));
    const { x, y } = event;
    const { filled, flipped, drained } = progressAt(event, now);
    const draining = ms >= fillMs + flipMs;
    const turning = ms >= fillMs && !draining;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    if (turning) {
      // a clean turn: the spotlight stays lit but nothing shakes it
      event.fx.draw(ctx, x, y);
      drawHourglass(ctx, x, y, {
        upper: 0,
        lower: 1,
        pouring: false,
        rotation: Math.PI * flipped,
        scale,
      });
    } else
      event.fx.draw(ctx, x, y, ({ rotation }) =>
        drawHourglass(
          ctx,
          x,
          y,
          draining
            ? // the gold runs through the neck and on out of the bottom, never settling
              {
                upper: 1 - drained,
                lower: 0,
                pouring: drained < 1,
                rotation,
                scale,
              }
            : { upper: 0, lower: filled, pouring: false, rotation, scale },
        ),
      );
    if (draining && drained < 1) drawGlimmers(ctx, x, y, scale, now);
    ctx.restore();
  }
  // the spotlit total, with its lights and beats, is drawn live on top by the game canvas
  drawEventStreams(ctx, getFloorRect, totalTarget);
}

function startHourglass(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (running || isScreenFrozen() || !area) return;
  const { fillMs, flipMs, drainMs, seconds } = CONFIG.hourglassEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const event: RunningHourglass = {
    floor,
    x: (area.left + area.right) / 2,
    y: (area.top + area.bottom) / 2,
    startedAt: performance.now(),
    // the spotlight fills in with the gold, holds through the flip, then
    // shrinks away as it drains
    fx: createEventFx(fillMs + flipMs + drainMs, undefined, true, () => {
      const { filled, flipped, drained } = progressAt(event, performance.now());
      return flipped < 1 ? filled : 1 - drained;
    }),
    firstHitAt: null,
    totalFx: null,
  };
  running = event;
  const isLive = () => running === event;
  freezeScreen(drawOverlay, { spotlightTotal: true });
  playBoostEventStream();

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
      target: { x: event.x, y: event.y + HOURGLASS_TOP * SCALE },
      durationMs: fillMs,
      isRunning: isLive,
      onEachArrive: () => {
        const now = performance.now();
        event.firstHitAt ??= now;
        event.fx.hit(now);
      },
    },
  );

  // turned over, it trickles its coins out through the neck into the total
  setTimeout(() => {
    if (!isLive()) return;
    const totalFx = createEventFx(drainMs);
    event.totalFx = totalFx;
    addTargetStream(GLOBAL_SLAM, "total", totalFx, true);
    playBoostEventStream();
    streamCoins(
      [
        {
          floor,
          x: event.x,
          y: event.y + HOURGLASS_BOTTOM * SCALE,
          spreadX: 16,
          spreadY: 16,
        },
      ],
      {
        durationMs: drainMs,
        isRunning: isLive,
        onEachArrive: () => {
          pulseHudTotalFlash();
          event.fx.hit(performance.now());
        },
      },
    );
  }, fillMs + flipMs);

  setTimeout(
    () => {
      if (!isLive()) return;
      running = null;
      if (event.totalFx) removeTargetStream(event.totalFx);
      unfreezeScreen();
      addTotalIncome(
        multiply(
          getBuildingsCurrentIncomePerSecond([context.floors], Date.now()),
          seconds,
        ),
      );
      triggerHudTotalFlash();
      // the covered crit's own tier, revealed as the total jumps
      triggerEventEndSlam(GLOBAL_SLAM, "total", () =>
        context.applyTierCrit?.(floor, tier),
      );
      playSold();
      endEventProc(KEY);
    },
    fillMs + flipMs + drainMs,
  );
}
