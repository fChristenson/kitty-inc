// the "Piledriver" event: it covers its crit, whose click freezes the screen
// while the wisp appears over the top of the screen above the upgrade
// buttons, swelling, trembling and heating up as the screen rumbles; then it
// plunges straight down, ever faster, smashing through every upgrade button
// in view on the way: each squashes flat with a flash, a bang and a jolt and
// lands free upgrade levels. It craters into the bottom of the screen in a
// huge blast and shake. Then the screen unfreezes and the crit's tier pays
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh, startBoostEventStreamLoop } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawPoppingCritText } from "../../../critFlash/critText";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import {
  drawFreezeDimmed,
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import { isFloorLocked } from "../../../../shared/detachedJob";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  clearUpgradeButtonSpotlights,
  drawUpgradeButtonSpotlight,
  getButtonCenter,
  setUpgradeButtonSpotlights,
} from "../../../../floors/upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import { lerp, clamp01 } from "../../../../shared/easing";

const KEY = "piledriver";
// the wisp charges this far below the top of the screen, swelling to
// CHARGE_GROW of its size and trembling up to TREMBLE px, the rumble rising to
// RUMBLE; it falls from there to this far below the bottom
const CHARGE_DROP = 140;
const CHARGE_GROW = 1.8;
const TREMBLE = 10;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.08, 0.4];
const FALL_OUT = 40;
// each button: squashed to SQUASH tall, springing back, washed white
const SQUASH = 0.45;
const SPRING_MS = 140;
const WHITE_MS = 260;
const HIT_BURST = 0.35;
const HIT_BURST_MS = 320;
const HIT_SHAKE: [number, number] = [0.8, 1.6];
const LABEL_FONT = 56;
// the crater at the bottom
const FINAL_SHAKE = 2.6;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 360;
const SPARK_SIZE = 22;

interface Hit {
  floor: Floor;
  isGroundFloor: boolean;
  // floor-local to its own floor, and local to the clicked floor
  local: Point;
  at: Point;
  levels: number;
  // ms in that the wisp reaches it, and performance.now() once it has
  dueAt: number;
  hitAt: number | null;
}

interface RunningPiledriver {
  floor: Floor;
  x: number;
  top: number;
  bottom: number;
  hits: Hit[];
  startedAt: number;
  // performance.now() of the release and the crater, once they happen
  releasedAt: number | null;
  crateredAt: number | null;
  lastRumble: number;
}

let running: RunningPiledriver | null = null;

// every visible upgrade button on the open floors in view, top to bottom
function findButtons(
  floor: Floor,
  context: EventProcContext,
): Omit<Hit, "levels" | "dueAt" | "hitAt">[] {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const top = onScreen.find((entry) => entry.floor === floor)?.top;
  if (top === undefined || !context.upgradeFloorFree) return [];
  const buttons: Omit<Hit, "levels" | "dueAt" | "hitAt">[] = [];
  for (const entry of onScreen) {
    const f = entry.floor;
    if (!f.unlocked || isFloorLocked(f)) continue;
    const isGroundFloor = context.floors.indexOf(f) === 0;
    const local = getButtonCenter(isGroundFloor);
    if (!isVisibleOnFloor(entry, local.y)) continue;
    buttons.push({
      floor: f,
      isGroundFloor,
      local,
      at: { x: local.x, y: local.y + entry.top - top },
    });
  }
  return buttons.sort((a, b) => a.at.y - b.at.y);
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.piledriverEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getScreenAreaLocal !== undefined &&
      findButtons(floor, context).length > 0,
    arm: startPiledriver,
  },
  { label: "Piledriver", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Piledriver
export function forcePiledriverEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// how far down its fall the wisp is, 0..1, ms in: accelerating like a drop
function fallShare(ms: number): number {
  const { chargeMs, fallMs } = CONFIG.piledriverEvent;
  return clamp01((ms - chargeMs) / fallMs) ** 2;
}

function wispAt(pd: RunningPiledriver, ms: number, heat: number): Point {
  const { chargeMs } = CONFIG.piledriverEvent;
  if (ms < chargeMs)
    return {
      x: pd.x + Math.sin(ms * 0.9) * TREMBLE * heat,
      y: pd.top + Math.sin(ms * 1.3 + 1) * TREMBLE * heat,
    };
  return { x: pd.x, y: pd.top + (pd.bottom - pd.top) * fallShare(ms) };
}

// a hit button's squash since the wisp went through it
function squashOf(hit: Hit, now: number): number {
  if (hit.hitAt === null) return 1;
  const t = now - hit.hitAt;
  return 1 - (1 - SQUASH) * Math.exp(-t / SPRING_MS) * Math.cos(t / 45);
}

// the release, each button and the crater, on the frame each is due
function landBeats(
  pd: RunningPiledriver,
  ms: number,
  now: number,
  upgradeFloorFree: (floor: Floor, levels: number) => void,
): void {
  const { chargeMs, fallMs } = CONFIG.piledriverEvent;
  if (ms < chargeMs && now - pd.lastRumble >= RUMBLE_MS) {
    pd.lastRumble = now;
    shakeScreen(lerp(RUMBLE, ms / chargeMs));
  }
  if (pd.releasedAt === null && ms >= chargeMs) {
    pd.releasedAt = now;
    playSwoosh();
  }
  pd.hits.forEach((hit, i) => {
    if (hit.hitAt !== null || ms < hit.dueAt) return;
    hit.hitAt = now;
    playExplosion();
    shakeScreen(lerp(HIT_SHAKE, i / Math.max(1, pd.hits.length - 1)));
    upgradeFloorFree(hit.floor, hit.levels);
  });
  if (pd.crateredAt === null && ms >= chargeMs + fallMs) {
    pd.crateredAt = now;
    playSlamExplosion();
    shakeScreen(FINAL_SHAKE);
  }
}

function startPiledriver(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const area = context.getScreenAreaLocal?.(floor);
  const upgradeFloorFree = context.upgradeFloorFree;
  const found = findButtons(floor, context);
  if (!area || !upgradeFloorFree || found.length === 0) return;
  const { chargeMs, fallMs, holdMs, levelShare, minLevels } =
    CONFIG.piledriverEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const top = area.top + CHARGE_DROP;
  const bottom = area.bottom + FALL_OUT;
  const pd: RunningPiledriver = {
    floor,
    x: found[0].at.x,
    top,
    bottom,
    // reached when the fall's share covers its height: share = u², so u = √share
    hits: found.map((button) => ({
      ...button,
      levels: Math.max(
        minLevels,
        Math.round(button.floor.upgradeCount * levelShare),
      ),
      dueAt:
        chargeMs +
        fallMs * Math.sqrt(clamp01((button.at.y - top) / (bottom - top))),
      hitAt: null,
    })),
    startedAt: performance.now(),
    releasedAt: null,
    crateredAt: null,
    lastRumble: -Infinity,
  };
  running = pd;
  const isLive = () => running === pd;
  setUpgradeButtonSpotlights(pd.hits.map((hit) => hit.floor));
  freezeScreen((ctx, getFloorRect) =>
    drawOverlay(ctx, getFloorRect, upgradeFloorFree),
  );
  const stopSound = startBoostEventStreamLoop();

  setTimeout(
    () => {
      if (!isLive()) return;
      for (const hit of pd.hits)
        if (hit.hitAt === null) upgradeFloorFree(hit.floor, hit.levels);
      running = null;
      stopSound();
      clearUpgradeButtonSpotlights();
      unfreezeScreen();
      // the covered crit's own tier, which also saves the levels
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    chargeMs + fallMs + holdMs,
  );
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  upgradeFloorFree: (floor: Floor, levels: number) => void,
): void {
  const pd = running;
  if (!pd) return;
  const rect = getFloorRect(pd.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - pd.startedAt;
  landBeats(pd, ms, now, upgradeFloorFree);
  const { chargeMs } = CONFIG.piledriverEvent;

  const drawButton = (c: CanvasRenderingContext2D, hit: Hit) => {
    const own = getFloorRect(hit.floor);
    if (!own) return;
    const scaleY = squashOf(hit, now);
    const white =
      hit.hitAt === null ? 0 : clamp01(1 - (now - hit.hitAt) / WHITE_MS);
    c.save();
    c.translate(own.left + hit.local.x, own.top + hit.local.y);
    c.scale(1 / Math.sqrt(scaleY), scaleY);
    c.translate(-hit.local.x, -hit.local.y);
    drawUpgradeButtonSpotlight(c, hit.floor, hit.isGroundFloor, white);
    c.restore();
  };
  // every button sits dim in the frozen frame until the wisp smashes through
  drawFreezeDimmed(
    ctx,
    (layer) => {
      for (const hit of pd.hits) if (hit.hitAt === null) drawButton(layer, hit);
    },
    [pd, pd.hits.filter((hit) => hit.hitAt === null).length],
  );
  for (const hit of pd.hits) if (hit.hitAt !== null) drawButton(ctx, hit);

  ctx.save();
  ctx.translate(rect.left, rect.top);
  for (const hit of pd.hits) {
    if (hit.hitAt === null) continue;
    drawWhiteBurst(
      ctx,
      hit.at.x,
      hit.at.y,
      (now - hit.hitAt) / HIT_BURST_MS,
      HIT_BURST,
    );
    drawPoppingCritText(
      ctx,
      `+${hit.levels} Lvl`,
      hit.at.x,
      hit.at.y - LABEL_FONT * 1.4,
      COLOR.heavenlyGold,
      hit.hitAt,
      now,
      { fontSize: LABEL_FONT, strokeWidth: 8 },
    );
  }
  if (pd.crateredAt !== null)
    drawExplosion(
      ctx,
      pd.x,
      pd.bottom - FALL_OUT,
      now - pd.crateredAt,
      now,
      BLAST_SCALE,
      SPARK_REACH,
      SPARK_SIZE,
    );
  const heat = clamp01(ms / chargeMs);
  if (pd.crateredAt === null)
    drawWisp(
      ctx,
      (t) => (t < 0 ? null : wispAt(pd, t, clamp01(t / chargeMs))),
      ms,
      now,
      WISP_SIZE * (1 + (CHARGE_GROW - 1) * heat),
      heat,
    );
  ctx.restore();
}
