// the "Thunderclap" event: it covers its crit, whose click freezes the screen
// while two wisps rocket in from the screen's left and right edges, ever
// faster, and smash together on the clicked floor's income bar: a huge flash,
// blast and shake, and a shockwave racing up and down the screen. Every income
// bar it passes jolts, flashes and gets free upgrade levels. Then the screen
// unfreezes and the crit's tier pays out
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
import { drawPoppingCritText } from "../../../critFlash/critText";
import { isFloorLocked } from "../../../../shared/detachedJob";
import { drawExplosion } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import {
  drawIncomePanel,
  getIncomeBarBox,
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
import { clamp01 } from "../../../../shared/easing";

const KEY = "thunderclap";
// the wisps start this far off the screen's sides, speeding up (their share
// of the way is u^RUSH_EASE)
const START_OUT = 60;
const RUSH_EASE = 2.2;
// the clap
const CLAP_SHAKE = 2.4;
const CLAP_SCALE = 1.8;
const SPARK_REACH = 360;
const SPARK_SIZE = 22;
const FLASH_MS = 220;
const FLASH_ALPHA = 0.8;
// the shockwave: two bright bands racing up and down the screen, thinning
const WAVE_LAYERS = [
  [40, COLOR.heavenlyGold, 0.3],
  [14, COLOR.heavenlyGold, 0.8],
  [4, COLOR.white, 1],
] as const;
// a struck bar: knocked JOLT px away from the clap, springing back, washed
// white, a small shake, and its levels popping up over it
const JOLT = 18;
const JOLT_DECAY_MS = 120;
const JOLT_WOBBLE_MS = 140;
const BAR_SHAKE = 0.6;
const BAR_FLASH_MS = 400;
const LABEL_FONT = 44;

interface Struck {
  floor: Floor;
  isGroundFloor: boolean;
  // its bar's middle, local to the clicked floor
  bar: Point;
  levels: number;
  hitAt: number | null;
}

interface RunningClap {
  floor: Floor;
  clap: Point;
  fromLeft: number;
  fromRight: number;
  // how far the shockwave reaches up and down, local
  reach: number;
  area: { left: number; top: number; right: number; bottom: number };
  bars: Struck[];
  startedAt: number;
  clappedAt: number | null;
  onHit: (bar: Struck) => void;
}

let running: RunningClap | null = null;

// every open floor's income bar in view, local to floor
function barsInView(
  floor: Floor,
  context: EventProcContext,
): { floor: Floor; isGroundFloor: boolean; bar: Point }[] {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const top = onScreen.find((entry) => entry.floor === floor)?.top;
  if (top === undefined) return [];
  return onScreen.flatMap((entry) => {
    const isGroundFloor = context.floors.indexOf(entry.floor) === 0;
    const bar = getIncomeBarCenter(isGroundFloor);
    return entry.floor.unlocked &&
      !isFloorLocked(entry.floor) &&
      isVisibleOnFloor(entry, bar.y)
      ? [
          {
            floor: entry.floor,
            isGroundFloor,
            bar: { x: bar.x, y: bar.y + entry.top - top },
          },
        ]
      : [];
  });
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.thunderclapEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.upgradeFloorFree !== undefined &&
      context.getScreenAreaLocal !== undefined &&
      barsInView(floor, context).some((b) => b.floor === floor),
    arm: startClap,
  },
  { label: "Thunderclap", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Thunderclap
export function forceThunderclapEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// how far the shockwave has spread since the clap
function waveSpread(clap: RunningClap, since: number): number {
  const t = clamp01(since / CONFIG.thunderclapEvent.waveMs);
  return clap.reach * (1 - (1 - t) ** 2);
}

// the clap, and every bar the shockwave has reached, on the frame it's drawn
function landBeats(clap: RunningClap, ms: number, now: number): void {
  const { rushMs } = CONFIG.thunderclapEvent;
  if (clap.clappedAt === null && ms >= rushMs) {
    clap.clappedAt = clap.startedAt + rushMs;
    playSlamExplosion();
    shakeScreen(CLAP_SHAKE);
  }
  if (clap.clappedAt === null) return;
  const spread = waveSpread(clap, now - clap.clappedAt);
  for (const bar of clap.bars)
    if (bar.hitAt === null && Math.abs(bar.bar.y - clap.clap.y) <= spread) {
      bar.hitAt = now;
      clap.onHit(bar);
    }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const clap = running;
  if (!clap) return;
  const rect = getFloorRect(clap.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - clap.startedAt;
  landBeats(clap, ms, now);
  const { rushMs, waveMs } = CONFIG.thunderclapEvent;
  ctx.save();
  ctx.translate(rect.left, rect.top);

  for (const bar of clap.bars) {
    const since = bar.hitAt === null ? null : now - bar.hitAt;
    const away = Math.sign(bar.bar.y - clap.clap.y);
    const jolt =
      since === null
        ? 0
        : JOLT *
          Math.exp(-since / JOLT_DECAY_MS) *
          Math.cos((2 * Math.PI * since) / JOLT_WOBBLE_MS);
    const barRect = getFloorRect(bar.floor);
    if (!barRect) continue;
    ctx.save();
    ctx.translate(
      barRect.left - rect.left,
      barRect.top - rect.top + away * jolt,
    );
    drawIncomePanel(ctx, bar.floor, bar.isGroundFloor, {
      whiteAlpha: since === null ? 0 : Math.max(0, 1 - since / BAR_FLASH_MS),
      rotation: 0,
    });
    ctx.restore();
  }

  // the two wisps rushing in from either side
  for (const fromX of [clap.fromLeft, clap.fromRight])
    drawWisp(
      ctx,
      (t) =>
        t < 0 || t >= rushMs
          ? null
          : {
              x:
                fromX +
                (clap.clap.x - fromX) * clamp01(t / rushMs) ** RUSH_EASE,
              y: clap.clap.y,
            },
      ms,
      now,
      WISP_SIZE,
      clamp01(ms / rushMs),
    );

  if (clap.clappedAt !== null) {
    const since = now - clap.clappedAt;
    const spread = waveSpread(clap, since);
    const fade = 1 - clamp01(since / waveMs);
    if (fade > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const [width, color, alpha] of WAVE_LAYERS) {
        ctx.globalAlpha = alpha * fade;
        ctx.fillStyle = color;
        const w = width * fade;
        for (const y of [clap.clap.y - spread, clap.clap.y + spread])
          ctx.fillRect(
            clap.area.left,
            y - w / 2,
            clap.area.right - clap.area.left,
            w,
          );
      }
      ctx.restore();
    }
    drawExplosion(
      ctx,
      clap.clap.x,
      clap.clap.y,
      since,
      now,
      CLAP_SCALE,
      SPARK_REACH,
      SPARK_SIZE,
    );
    const flash = 1 - since / FLASH_MS;
    if (flash > 0) {
      const { area } = clap;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = FLASH_ALPHA * flash;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(
        area.left,
        area.top,
        area.right - area.left,
        area.bottom - area.top,
      );
      ctx.restore();
    }
  }

  for (const bar of clap.bars) {
    if (bar.hitAt === null) continue;
    const box = getIncomeBarBox(bar.isGroundFloor);
    drawPoppingCritText(
      ctx,
      `+${bar.levels} Lvl`,
      bar.bar.x,
      bar.bar.y - box.height / 2 - LABEL_FONT * 0.6,
      COLOR.heavenlyGold,
      bar.hitAt,
      now,
      { fontSize: LABEL_FONT, strokeWidth: 7 },
    );
  }
  ctx.restore();
}

function startClap(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  const upgradeFloorFree = context.upgradeFloorFree;
  const found = barsInView(floor, context);
  const own = found.find((b) => b.floor === floor);
  if (running || isScreenFrozen() || !area || !upgradeFloorFree || !own) return;
  const { rushMs, waveMs, holdMs, levelShare, minLevels } =
    CONFIG.thunderclapEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const clap: RunningClap = {
    floor,
    clap: own.bar,
    fromLeft: area.left - START_OUT,
    fromRight: area.right + START_OUT,
    reach: Math.max(own.bar.y - area.top, area.bottom - own.bar.y),
    area,
    bars: found.map((b) => ({
      ...b,
      levels: Math.max(
        minLevels,
        Math.round(b.floor.upgradeCount * levelShare),
      ),
      hitAt: null,
    })),
    startedAt: performance.now(),
    clappedAt: null,
    onHit: (bar) => {
      upgradeFloorFree(bar.floor, bar.levels);
      if (bar.floor !== floor) {
        playExplosion();
        shakeScreen(BAR_SHAKE);
      }
    },
  };
  running = clap;
  const isLive = () => running === clap;
  setIncomePanelsHidden(found.map((b) => b.floor));
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  setTimeout(
    () => {
      if (!isLive()) return;
      landBeats(clap, Infinity, performance.now());
      for (const bar of clap.bars)
        if (bar.hitAt === null) {
          bar.hitAt = performance.now();
          upgradeFloorFree(bar.floor, bar.levels);
        }
      running = null;
      stopSound();
      setIncomePanelsHidden([]);
      unfreezeScreen();
      // the covered crit's own tier, which also saves the levels
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    rushMs + waveMs + holdMs,
  );
}
