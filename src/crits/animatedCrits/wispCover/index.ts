// the shared stage for wisp and coin events: a money cover whose overlay hands
// the event floor-local ms/now and the total's spot, ticks its beats, and
// draws the bursts and blasts it fires, so each event only plots its wisps or
// its coins' paths. Fire hits with burst()/launchFrom and the finale with
// blast()
import type { Floor } from "../../../gameState";
import type { CoinPath } from "../../../floors/coins";
import { COLOR } from "../../../palette";
import {
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
  type CoverArea,
  type MoneyCover,
} from "../moneyCover";
import { forceTestCrit } from "../../floorCrits/upgradeCrit";
import { pickCritTierByOdds } from "../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../shared/eventFx";
import { playSlamExplosion } from "../../../sound";
import { shakeScreen } from "../../critFlash";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../../shared/totalIncomeCoins";
import { ringTargets } from "../../../shared/coinTargets";
import type { Point } from "../../../shared/wisp";
import { setIncomePanelsHidden } from "../../../floors/incomePanel";
import { spotlightWorkers } from "../onScreenWorkers";
import { clearWorkerSpotlight } from "../../../floors/worker";
import { triggerEventEndSlam } from "../../../shared/eventEndSlam";
import {
  drawRewardBars,
  drawRewardWorkers,
  giveBarLevels,
  giveBarTier,
  giveWorkerTier,
  type RewardBar,
  type RewardWorker,
} from "../eventRewards";

const BURST_MS = 240;
// a blast's look and its ring of coins
const BLAST_MS = 800;
const BLAST_COINS = 28;
const BLAST_RING: [number, number] = [90, 320];
const BLAST_SHAKE = 2.9;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

export interface WispCover {
  readonly cover: MoneyCover;
  readonly startedAt: number;
  // the total-income readout, floor-local; null until the overlay first draws
  total(): Point | null;
  isLive(): boolean;
  launchFrom(from: Point, targets: Point[]): void;
  // one coin per path (floor-local, f 0..1 over travelMs, its scale sizing the
  // coin), all set off at once, each hanging at its path's end till the merge
  trace(paths: CoinPath[], travelMs: number): void;
  // a white burst of `scale` at `at`, drawn under the coins
  burst(at: Point, scale: number): void;
  // the finale: a huge blast and shake, a ring of coins out of `at` (the
  // total flashing if it's there); no coins when the event pays no cash
  blast(at: Point, coins?: number): void;
  // non-cash rewards, each landing with a flash and a jolt (away from `from`)
  levels(bar: RewardBar, levels: number, from?: Point): void;
  tierUp(bar: RewardBar, from?: Point): void;
  promote(worker: RewardWorker): void;
  // the bar's jackpot slam, for a finale landing on it
  slam(bar: RewardBar): void;
}

export interface WispCoverOptions {
  // 0 pays no cash: then the cover ends without the total's finale
  rewardMultiplier: number;
  // false: a cash event whose finale lands elsewhere (defaults to paying cash)
  endOnTotal?: boolean;
  // the income bars and workers it rewards, which it draws itself
  bars?: RewardBar[];
  workers?: RewardWorker[];
  // every frame, before drawing: fire the event's beats
  tick?: (ms: number, now: number) => void;
  // as the screen unfreezes: rewards that play out on the live screen
  onEnd?: () => void;
  // floor-local, under the coins and over them
  drawUnder?: (ctx: CanvasRenderingContext2D, ms: number, now: number) => void;
  drawOver?: (ctx: CanvasRenderingContext2D, ms: number, now: number) => void;
}

interface Flash {
  x: number;
  y: number;
  at: number;
  scale: number;
}

// registers a covering coin event `key` shown on its crit as `label`, armed
// with the screen's floor-local area (only when canArm, if given, agrees);
// returns its dev test hook, which arms a crit on floor (tier by the crit
// odds) carrying it
export function registerWispEvent(
  key: string,
  label: string,
  chance: () => number,
  arm: (floor: Floor, context: EventProcContext, area: CoverArea) => void,
  canArm?: (floor: Floor, context: EventProcContext) => boolean,
): (floor: Floor) => void {
  registerEventProc(
    {
      key,
      chance,
      isInProgress: () => isMoneyCoverRunning(key),
      canArm: (floor, context) =>
        canStartMoneyCover(context) && (canArm?.(floor, context) ?? true),
      arm: (floor, context) => {
        const area = context.getScreenAreaLocal?.(floor);
        if (area) arm(floor, context, area);
      },
    },
    { label, color: COLOR.heavenlyGold },
  );
  return (floor) => {
    forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
    forceClaimEventProc(key, floor);
  };
}

export function startWispCover(
  key: string,
  floor: Floor,
  context: EventProcContext,
  timing: { durationMs: number; mergeMs: number },
  {
    rewardMultiplier,
    endOnTotal,
    bars = [],
    workers = [],
    tick,
    onEnd,
    drawUnder,
    drawOver,
  }: WispCoverOptions,
): WispCover | null {
  const startedAt = performance.now();
  let total: Point | null = null;
  const bursts: Flash[] = [];
  const blasts: Flash[] = [];
  const cash = rewardMultiplier > 0;
  // lifted out of the frozen frame for the overlay to draw them
  setIncomePanelsHidden(bars.map((bar) => bar.floor));
  spotlightWorkers(workers.map((w) => w.worker));
  const release = () => {
    setIncomePanelsHidden([]);
    clearWorkerSpotlight();
  };
  const cover = startMoneyCover(key, floor, context, timing, {
    rewardMultiplier,
    endOnTotal: endOnTotal ?? cash,
    onEnd: () => {
      for (const w of workers) giveWorkerTier(w);
      release();
      onEnd?.();
    },
    drawExtra: (ctx, getFloorRect, totalTarget) => {
      const rect = getFloorRect(floor);
      if (!rect) return;
      total ??= { x: totalTarget.x - rect.left, y: totalTarget.y - rect.top };
      const now = performance.now();
      const ms = now - startedAt;
      tick?.(ms, now);
      drawRewardWorkers(ctx, getFloorRect, workers, now);
      ctx.save();
      ctx.translate(rect.left, rect.top);
      drawRewardBars(ctx, bars, now);
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        const t = (now - b.at) / BURST_MS;
        if (t >= 1) bursts.splice(i, 1);
        else drawWhiteBurst(ctx, b.x, b.y, t, b.scale);
      }
      for (const b of blasts)
        if (now - b.at < BLAST_MS)
          drawExplosion(
            ctx,
            b.x,
            b.y,
            now - b.at,
            now,
            BLAST_SCALE,
            SPARK_REACH,
            SPARK_SIZE,
          );
      drawUnder?.(ctx, ms, now);
      ctx.restore();
    },
    drawOver: drawOver
      ? (ctx, getFloorRect) => {
          const rect = getFloorRect(floor);
          if (!rect) return;
          const now = performance.now();
          ctx.save();
          ctx.translate(rect.left, rect.top);
          drawOver(ctx, now - startedAt, now);
          ctx.restore();
        }
      : undefined,
  });
  if (!cover) {
    release();
    return null;
  }
  return {
    cover,
    startedAt,
    total: () => total,
    isLive: cover.isLive,
    launchFrom: (from, targets) => {
      if (cash && cover.isLive()) cover.launchFrom(from, targets);
    },
    trace: (paths, travelMs) => {
      if (cash && cover.isLive()) cover.trace(paths, travelMs);
    },
    burst: (at, scale) =>
      bursts.push({ x: at.x, y: at.y, at: performance.now(), scale }),
    blast: (at, coins = cash ? BLAST_COINS : 0) => {
      blasts.push({ x: at.x, y: at.y, at: performance.now(), scale: 1 });
      if (!cover.isLive()) return;
      playSlamExplosion();
      shakeScreen(BLAST_SHAKE);
      if (at === total) {
        triggerHudTotalFlash();
        pulseHudTotalFlash();
      }
      if (coins > 0) cover.launchFrom(at, ringTargets(at, coins, BLAST_RING));
    },
    levels: (bar, levels, from) => {
      if (cover.isLive()) giveBarLevels(context, bar, levels, from);
    },
    tierUp: (bar, from) => {
      if (cover.isLive()) giveBarTier(bar, from);
    },
    promote: (worker) => {
      if (cover.isLive()) giveWorkerTier(worker);
    },
    slam: (bar) => {
      if (cover.isLive()) triggerEventEndSlam(bar.floor, "bar");
    },
  };
}
