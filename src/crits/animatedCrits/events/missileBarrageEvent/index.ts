// the "Missile Barrage" event: it covers its crit, whose click freezes the
// screen while a volley of small wisp missiles streaks up from the bottom of
// the screen one after another, each curving in on its own arc and
// accelerating, slamming into every income bar in view: each hit a blast, a
// bang, a shake and the bar jolted, landing free upgrade levels tallied over
// it; the last hits hardest. Then the screen unfreezes and the crit's tier
// pays out
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
import {
  drawWisp,
  WISP_SIZE,
  WISP_TRAIL_MS,
  type Point,
} from "../../../../shared/wisp";
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
import { lerp } from "../../../../shared/easing";

const KEY = "missileBarrage";
// missiles per bar
const PER_BAR: [number, number] = [2, 4];
// they launch from this far below the screen, spread across its width,
// each bowing out up to BOW of its flight's length to one side
const BELOW = 60;
const BOW = 0.35;
const MISSILE_SIZE = 0.6;
// each hit: a blast, a shake, a bang (no closer than BANG_GAP_MS) and the
// bar jolted the way the missile was flying
const HIT_SCALE = 0.55;
const HIT_REACH = 160;
const HIT_SPARK = 12;
const HIT_SHAKE = 0.5;
const BANG_GAP_MS = 60;
const JOLT = 14;
const JOLT_DECAY_MS = 100;
const JOLT_WOBBLE_MS = 120;
const FLASH_MS = 300;
// the last hit
const FINAL_SHAKE = 2;
const FINAL_SCALE = 1.4;
const FINAL_REACH = 300;
const LABEL_FONT = 44;

interface Target {
  floor: Floor;
  isGroundFloor: boolean;
  // its bar's box, local to the clicked floor
  box: { x: number; y: number; width: number; height: number };
  levels: number;
  given: number;
  lastHitAt: number | null;
}

interface Missile {
  target: Target;
  from: Point;
  bend: Point;
  to: Point;
  launchAt: number;
  hitAt: number;
  // the levels this hit lands
  levels: number;
  landedAt: number | null;
}

interface RunningBarrage {
  floor: Floor;
  targets: Target[];
  missiles: Missile[];
  startedAt: number;
  lastBang: number;
  upgradeFloorFree: (floor: Floor, levels: number) => void;
}

let running: RunningBarrage | null = null;

// every open floor's income bar in view, local to floor
function targetsInView(
  floor: Floor,
  context: EventProcContext,
): Omit<Target, "levels" | "given" | "lastHitAt">[] {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const top = onScreen.find((entry) => entry.floor === floor)?.top;
  if (top === undefined) return [];
  return onScreen.flatMap((entry) => {
    const isGroundFloor = context.floors.indexOf(entry.floor) === 0;
    if (
      !entry.floor.unlocked ||
      isFloorLocked(entry.floor) ||
      !isVisibleOnFloor(entry, getIncomeBarCenter(isGroundFloor).y)
    )
      return [];
    const box = getIncomeBarBox(isGroundFloor);
    return [
      {
        floor: entry.floor,
        isGroundFloor,
        box: { ...box, y: box.y + entry.top - top },
      },
    ];
  });
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.missileBarrageEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.upgradeFloorFree !== undefined &&
      context.getScreenAreaLocal !== undefined &&
      targetsInView(floor, context).length > 0,
    arm: startBarrage,
  },
  { label: "Missile Barrage", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Missile Barrage
export function forceMissileBarrageEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// a missile ms in: along its bowed path, speeding up
function missileAt(missile: Missile, ms: number): Point | null {
  if (ms < missile.launchAt || ms >= missile.hitAt) return null;
  const u =
    ((ms - missile.launchAt) / (missile.hitAt - missile.launchAt)) ** 1.6;
  const { from, bend, to } = missile;
  const a = (1 - u) ** 2;
  const b = 2 * u * (1 - u);
  const c = u * u;
  return {
    x: a * from.x + b * bend.x + c * to.x,
    y: a * from.y + b * bend.y + c * to.y,
  };
}

// every missile due by ms, on the frame it lands
function landHits(barrage: RunningBarrage, ms: number, now: number): void {
  const last = barrage.missiles[barrage.missiles.length - 1];
  for (const missile of barrage.missiles) {
    if (missile.landedAt !== null || ms < missile.hitAt) continue;
    missile.landedAt = now;
    const { target } = missile;
    target.lastHitAt = now;
    target.given += missile.levels;
    if (missile.levels > 0)
      barrage.upgradeFloorFree(target.floor, missile.levels);
    if (missile === last) {
      playSlamExplosion();
      shakeScreen(FINAL_SHAKE);
      continue;
    }
    shakeScreen(HIT_SHAKE);
    if (now - barrage.lastBang >= BANG_GAP_MS) {
      barrage.lastBang = now;
      playExplosion();
    }
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const barrage = running;
  if (!barrage) return;
  const rect = getFloorRect(barrage.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - barrage.startedAt;
  landHits(barrage, ms, now);
  const last = barrage.missiles[barrage.missiles.length - 1];
  ctx.save();
  ctx.translate(rect.left, rect.top);

  for (const target of barrage.targets) {
    // jolted the way each missile was flying as it hit
    const jolt = { x: 0, y: 0 };
    for (const missile of barrage.missiles) {
      if (missile.target !== target || missile.landedAt === null) continue;
      const t = now - missile.landedAt;
      const dx = missile.to.x - missile.bend.x;
      const dy = missile.to.y - missile.bend.y;
      const length = Math.hypot(dx, dy) || 1;
      const k =
        JOLT *
        Math.exp(-t / JOLT_DECAY_MS) *
        Math.cos((2 * Math.PI * t) / JOLT_WOBBLE_MS);
      jolt.x += (dx / length) * k;
      jolt.y += (dy / length) * k;
    }
    ctx.save();
    ctx.translate(
      jolt.x,
      target.box.y - getIncomeBarBox(target.isGroundFloor).y + jolt.y,
    );
    drawIncomePanel(ctx, target.floor, target.isGroundFloor, {
      whiteAlpha:
        target.lastHitAt === null
          ? 0
          : Math.max(0, 1 - (now - target.lastHitAt) / FLASH_MS),
      rotation: 0,
    });
    ctx.restore();
  }

  for (const missile of barrage.missiles) {
    if (missile.landedAt === null) continue;
    const final = missile === last;
    drawExplosion(
      ctx,
      missile.to.x,
      missile.to.y,
      now - missile.landedAt,
      now,
      final ? FINAL_SCALE : HIT_SCALE,
      final ? FINAL_REACH : HIT_REACH,
      HIT_SPARK,
    );
  }
  for (const missile of barrage.missiles) {
    if (ms < missile.launchAt || ms > missile.hitAt + WISP_TRAIL_MS) continue;
    drawWisp(
      ctx,
      (t) => missileAt(missile, t),
      ms,
      now,
      WISP_SIZE * MISSILE_SIZE,
      1,
    );
  }
  for (const target of barrage.targets)
    if (target.lastHitAt !== null)
      drawPoppingCritText(
        ctx,
        `+${target.given} Lvl`,
        target.box.x + target.box.width / 2,
        target.box.y - LABEL_FONT * 0.6,
        COLOR.heavenlyGold,
        target.lastHitAt,
        now,
        { fontSize: LABEL_FONT, strokeWidth: 7 },
      );
  ctx.restore();
}

function startBarrage(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  const upgradeFloorFree = context.upgradeFloorFree;
  const found = targetsInView(floor, context);
  if (running || isScreenFrozen() || !area || !upgradeFloorFree) return;
  if (found.length === 0) return;
  const { gapMs, flightMs, holdMs, levelShare, minLevels } =
    CONFIG.missileBarrageEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const targets: Target[] = found.map((t) => ({
    ...t,
    levels: Math.max(minLevels, Math.round(t.floor.upgradeCount * levelShare)),
    given: 0,
    lastHitAt: null,
  }));
  // each bar's missiles, shuffled together into one volley
  const volley = targets.flatMap((target) => {
    const count = Math.round(lerp(PER_BAR, Math.random()));
    return Array.from({ length: count }, (_, i) => ({
      target,
      // the levels split as evenly as they go
      levels:
        Math.floor((target.levels * (i + 1)) / count) -
        Math.floor((target.levels * i) / count),
    }));
  });
  for (let i = volley.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [volley[i], volley[j]] = [volley[j], volley[i]];
  }
  const missiles: Missile[] = volley.map(({ target, levels }, i) => {
    const from = {
      x: lerp([area.left, area.right], Math.random()),
      y: area.bottom + BELOW,
    };
    const to = {
      x: target.box.x + target.box.width * lerp([0.15, 0.85], Math.random()),
      y: target.box.y + target.box.height,
    };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const bow = (Math.random() * 2 - 1) * BOW;
    const launchAt = i * gapMs;
    return {
      target,
      from,
      bend: {
        x: (from.x + to.x) / 2 - dy * bow,
        y: (from.y + to.y) / 2 + dx * bow,
      },
      to,
      launchAt,
      hitAt: launchAt + flightMs,
      levels,
      landedAt: null,
    };
  });
  const barrage: RunningBarrage = {
    floor,
    targets,
    missiles,
    startedAt: performance.now(),
    lastBang: -Infinity,
    upgradeFloorFree,
  };
  running = barrage;
  const isLive = () => running === barrage;
  setIncomePanelsHidden(targets.map((t) => t.floor));
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  setTimeout(
    () => {
      if (!isLive()) return;
      landHits(barrage, Infinity, performance.now());
      running = null;
      stopSound();
      setIncomePanelsHidden([]);
      unfreezeScreen();
      // the covered crit's own tier, which also saves the levels
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    missiles[missiles.length - 1].hitAt + holdMs,
  );
}
