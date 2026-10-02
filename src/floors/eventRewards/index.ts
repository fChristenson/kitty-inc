// rewards an event lands on screen besides cash (see floors/wispCover): free
// upgrade levels and crit tiers on the income bars in view, perma tiers on
// the workers in view. The cover draws the bars and workers it was handed,
// jolting and flashing each as it's rewarded with a tally over it
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import {
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
  nextCritTier,
} from "../../shared/critTypes";
import { drawPoppingCritText } from "../../shared/critText";
import { isFloorLocked } from "../../shared/detachedJob";
import type { FloorRectResolver } from "../../shared/screenFreeze";
import type { Point } from "../../shared/wisp";
import { isVisibleOnFloor, type EventProcContext } from "../eventProcs";
import {
  drawIncomePanel,
  getIncomeBarBox,
  getIncomeBarCenter,
} from "../incomePanel";
import {
  drawStruckWorkers,
  findOnScreenWorkers,
  isClimber,
  type OnScreenWorker,
} from "../onScreenWorkers";
import { celebrateWorkerBoost, promoteWorkerPermaTier } from "../worker";

// a hit jolts its bar JOLT px the way it came from, flashing it white
const JOLT = 14;
const JOLT_DECAY_MS = 100;
const JOLT_WOBBLE_MS = 120;
const FLASH_MS = 300;
const LABEL_FONT = 44;

export interface RewardBar {
  floor: Floor;
  isGroundFloor: boolean;
  // its bar's box and middle, local to the clicked floor
  box: { x: number; y: number; width: number; height: number };
  center: Point;
  // levels landed so far, and the tally shown over it
  given: number;
  label: string | null;
  labelColor: string;
  hitAt: number | null;
  push: Point;
}

export interface RewardWorker {
  worker: OnScreenWorker;
  // its middle, local to the clicked floor
  at: Point;
  climbs: boolean;
  struckAt: number | null;
}

// every open floor's income bar in view, top first, local to floor
export function findRewardBars(
  floor: Floor,
  context: EventProcContext,
): RewardBar[] {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const top = onScreen.find((entry) => entry.floor === floor)?.top;
  if (top === undefined) return [];
  return onScreen
    .flatMap((entry) => {
      const isGroundFloor = context.floors.indexOf(entry.floor) === 0;
      if (
        !entry.floor.unlocked ||
        isFloorLocked(entry.floor) ||
        !isVisibleOnFloor(entry, getIncomeBarCenter(isGroundFloor).y)
      )
        return [];
      const box = getIncomeBarBox(isGroundFloor);
      const y = box.y + entry.top - top;
      return [
        {
          floor: entry.floor,
          isGroundFloor,
          box: { x: box.x, y, width: box.width, height: box.height },
          center: { x: box.x + box.width / 2, y: y + box.height / 2 },
          given: 0,
          label: null,
          labelColor: COLOR.heavenlyGold,
          hitAt: null,
          push: { x: 0, y: 0 },
        },
      ];
    })
    .sort((a, b) => a.box.y - b.box.y);
}

// every worker in view (only those that can still climb, unless all), local
// to floor
export function findRewardWorkers(
  floor: Floor,
  context: EventProcContext,
  all = false,
): RewardWorker[] {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const top = onScreen.find((entry) => entry.floor === floor)?.top ?? 0;
  return (findOnScreenWorkers(floor, context.getOnScreenFloors) ?? [])
    .filter((w) => all || isClimber(w))
    .map((worker) => ({
      worker,
      at: { x: worker.center.x, y: worker.center.y + worker.top - top },
      climbs: isClimber(worker),
      struckAt: null,
    }));
}

// a floor's share of its own level count in free levels, at least min
export function levelsFor(floor: Floor, share = 0.1, min = 3): number {
  return Math.max(min, Math.round(floor.upgradeCount * share));
}

// flashes and jolts bar away from `from` (straight down without one)
function hitBar(bar: RewardBar, now: number, from?: Point): void {
  bar.hitAt = now;
  const dx = from ? bar.center.x - from.x : 0;
  const dy = from ? bar.center.y - from.y : 1;
  const length = Math.hypot(dx, dy) || 1;
  bar.push.x = dx / length;
  bar.push.y = dy / length;
}

export function giveBarLevels(
  context: EventProcContext,
  bar: RewardBar,
  levels: number,
  from?: Point,
): void {
  hitBar(bar, performance.now(), from);
  if (levels <= 0) return;
  context.upgradeFloorFree?.(bar.floor, levels);
  bar.given += levels;
  bar.label = `+${bar.given} Lvl`;
  bar.labelColor = COLOR.heavenlyGold;
}

// one crit tier up for bar's floor, its new tier tallied over it
export function giveBarTier(bar: RewardBar, from?: Point): void {
  hitBar(bar, performance.now(), from);
  if (bar.floor.critMultiplierTier === CRIT_TIER_ORDER[0]) return;
  const tier = nextCritTier(bar.floor.critMultiplierTier);
  bar.floor.critMultiplierTier = tier;
  bar.label = CRIT_TIER_CONFIG[tier].label;
  bar.labelColor = CRIT_TIER_CONFIG[tier].color;
}

export function giveWorkerTier(worker: RewardWorker): void {
  if (worker.struckAt !== null) return;
  worker.struckAt = performance.now();
  if (!worker.climbs) return;
  const { floor, workerIndex } = worker.worker;
  promoteWorkerPermaTier(floor, workerIndex);
  celebrateWorkerBoost(floor, workerIndex, Date.now());
}

// ctx local to the clicked floor
export function drawRewardBars(
  ctx: CanvasRenderingContext2D,
  bars: RewardBar[],
  now: number,
): void {
  for (const bar of bars) {
    const t = bar.hitAt === null ? Infinity : now - bar.hitAt;
    const k =
      t === Infinity
        ? 0
        : JOLT *
          Math.exp(-t / JOLT_DECAY_MS) *
          Math.cos((2 * Math.PI * t) / JOLT_WOBBLE_MS);
    ctx.save();
    ctx.translate(
      bar.push.x * k,
      bar.box.y - getIncomeBarBox(bar.isGroundFloor).y + bar.push.y * k,
    );
    drawIncomePanel(ctx, bar.floor, bar.isGroundFloor, {
      whiteAlpha: Math.max(0, 1 - t / FLASH_MS),
      rotation: 0,
    });
    ctx.restore();
  }
  for (const bar of bars)
    if (bar.label !== null && bar.hitAt !== null)
      drawPoppingCritText(
        ctx,
        bar.label,
        bar.center.x,
        bar.box.y - LABEL_FONT * 0.6,
        bar.labelColor,
        bar.hitAt,
        now,
        { fontSize: LABEL_FONT, strokeWidth: 7 },
      );
}

// ctx in screen space: unrewarded workers stay dimmed with the frozen frame
export function drawRewardWorkers(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  workers: RewardWorker[],
  now: number,
): void {
  if (workers.length > 0) drawStruckWorkers(ctx, getFloorRect, workers, now);
}
