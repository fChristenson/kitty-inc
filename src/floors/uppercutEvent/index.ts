// the "Uppercut" event: it covers its crit, whose click freezes the screen
// while the wisp swoops in low from off the screen's left edge and uppercuts
// the clicked floor's income bar from below: the bar's launched high into the
// air, flipping right over, hangs, then comes crashing back down into its slot
// in a huge slam, blast and shake, squashing and springing back, and lands
// with a pile of free upgrade levels. Then the screen unfreezes and the
// crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import {
  playExplosion,
  playSlamExplosion,
  startBoostEventStreamLoop,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawPoppingCritText } from "../../shared/critText";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import {
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsHidden,
} from "../incomePanel";
import { forceTestCrit } from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";

const KEY = "uppercut";
// the wisp swoops in from this far off the screen's left edge, this far
// below the bar, and shoots on up off the screen's top after the hit
const OUT = 80;
const SWOOP_BELOW = 160;
const SHOOT_MS = 220;
// the bar flies LAUNCH px up, flipping FLIPS times, and hangs at the top
const LAUNCH = 300;
const FLIPS = 1;
// the hit
const HIT_SHAKE = 1.3;
const HIT_BURST = 0.5;
const HIT_BURST_MS = 380;
// the landing: squashed to SQUASH tall, springing back, a blast and a flash
const SQUASH = 0.55;
const SPRING_MS = 130;
const LAND_SHAKE = 2.6;
const LAND_SCALE = 1.7;
const SPARK_REACH = 340;
const SPARK_SIZE = 22;
const FLASH_MS = 450;
const LABEL_FONT = 56;

interface RunningUppercut {
  floor: Floor;
  isGroundFloor: boolean;
  box: { x: number; y: number; width: number; height: number };
  area: { left: number; top: number; right: number; bottom: number };
  levels: number;
  startedAt: number;
  hitAt: number | null;
  landedAt: number | null;
  onLand: () => void;
}

let running: RunningUppercut | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.uppercutEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.upgradeFloorFree !== undefined &&
      context.getScreenAreaLocal !== undefined &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: startUppercut,
  },
  { label: "Uppercut", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Uppercut
export function forceUppercutEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function beats() {
  const { swoopMs, riseMs, hangMs, fallMs } = CONFIG.uppercutEvent;
  const hit = swoopMs;
  const apex = hit + riseMs;
  const drop = apex + hangMs;
  return { hit, apex, drop, land: drop + fallMs };
}

// the wisp ms in: swooping up into the bar's underside, then shooting on up
// off the screen
function wispAt(cut: RunningUppercut, ms: number): Point | null {
  const { hit } = beats();
  const { box, area } = cut;
  const contact = { x: box.x + box.width / 2, y: box.y + box.height };
  if (ms < 0 || ms >= hit + SHOOT_MS) return null;
  if (ms < hit) {
    const u = ms / hit;
    const from = { x: area.left - OUT, y: contact.y + SWOOP_BELOW };
    // in low along the floor, curling up into the bar at the end
    return {
      x: from.x + (contact.x - from.x) * (1 - (1 - u) ** 2),
      y: from.y + (contact.y - from.y) * u ** 3,
    };
  }
  const u = (ms - hit) / SHOOT_MS;
  return {
    x: contact.x,
    y: contact.y + (area.top - OUT - contact.y) * u,
  };
}

// how far up the bar is, its turn and its squash, ms in
function barPose(cut: RunningUppercut, ms: number, now: number) {
  const { hit, apex, drop, land } = beats();
  if (cut.landedAt !== null) {
    const t = now - cut.landedAt;
    return {
      lift: 0,
      turn: 0,
      scaleY: 1 - (1 - SQUASH) * Math.exp(-t / SPRING_MS) * Math.cos(t / 40),
    };
  }
  if (ms < hit) return { lift: 0, turn: 0, scaleY: 1 };
  const flip = FLIPS * Math.PI * 2;
  if (ms < apex) {
    const u = (ms - hit) / (apex - hit);
    return {
      lift: LAUNCH * (1 - (1 - u) ** 2),
      turn: flip * (1 - (1 - u) ** 2) * 0.85,
      scaleY: 1,
    };
  }
  if (ms < drop)
    return {
      lift: LAUNCH,
      turn: flip * (0.85 + 0.1 * ((ms - apex) / (drop - apex))),
      scaleY: 1,
    };
  const u = clamp01((ms - drop) / (land - drop));
  return {
    lift: LAUNCH * (1 - u * u),
    turn: flip * (0.95 + 0.05 * u),
    scaleY: 1,
  };
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const cut = running;
  if (!cut) return;
  const rect = getFloorRect(cut.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - cut.startedAt;
  const { hit, land } = beats();
  if (cut.hitAt === null && ms >= hit) {
    cut.hitAt = now;
    playExplosion();
    shakeScreen(HIT_SHAKE);
  }
  if (cut.landedAt === null && ms >= land) {
    cut.landedAt = now;
    cut.onLand();
  }
  const { box } = cut;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const pose = barPose(cut, ms, now);
  ctx.save();
  ctx.translate(rect.left, rect.top);

  ctx.save();
  // squashing down onto its base, spinning round its middle
  ctx.translate(cx, cy - pose.lift);
  ctx.rotate(pose.turn);
  ctx.translate(0, (box.height / 2) * (1 - pose.scaleY));
  ctx.scale(1 / Math.sqrt(pose.scaleY), pose.scaleY);
  ctx.translate(-cx, -cy);
  drawIncomePanel(ctx, cut.floor, cut.isGroundFloor, {
    whiteAlpha:
      cut.landedAt === null
        ? 0
        : Math.max(0, 1 - (now - cut.landedAt) / FLASH_MS),
    rotation: 0,
  });
  ctx.restore();

  if (cut.hitAt !== null)
    drawWhiteBurst(
      ctx,
      cx,
      box.y + box.height,
      (now - cut.hitAt) / HIT_BURST_MS,
      HIT_BURST,
    );
  drawWisp(ctx, (t) => wispAt(cut, t), ms, now, WISP_SIZE, 1);
  if (cut.landedAt !== null) {
    drawExplosion(
      ctx,
      cx,
      cy,
      now - cut.landedAt,
      now,
      LAND_SCALE,
      SPARK_REACH,
      SPARK_SIZE,
    );
    drawPoppingCritText(
      ctx,
      `+${cut.levels} Lvl`,
      cx,
      box.y - LABEL_FONT * 0.6,
      COLOR.heavenlyGold,
      cut.landedAt,
      now,
      { fontSize: LABEL_FONT, strokeWidth: 8 },
    );
  }
  ctx.restore();
}

function startUppercut(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  const upgradeFloorFree = context.upgradeFloorFree;
  if (running || isScreenFrozen() || !area || !upgradeFloorFree) return;
  const { holdMs, levelShare, minLevels } = CONFIG.uppercutEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const levels = Math.max(
    minLevels,
    Math.round(floor.upgradeCount * levelShare),
  );
  const cut: RunningUppercut = {
    floor,
    isGroundFloor: context.isGroundFloor,
    box: getIncomeBarBox(context.isGroundFloor),
    area,
    levels,
    startedAt: performance.now(),
    hitAt: null,
    landedAt: null,
    onLand: () => {
      playSlamExplosion();
      shakeScreen(LAND_SHAKE);
      upgradeFloorFree(floor, levels);
    },
  };
  running = cut;
  const isLive = () => running === cut;
  setIncomePanelsHidden([floor]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  setTimeout(() => {
    if (!isLive()) return;
    if (cut.landedAt === null) {
      cut.landedAt = performance.now();
      upgradeFloorFree(floor, levels);
    }
    running = null;
    stopSound();
    setIncomePanelsHidden([]);
    unfreezeScreen();
    // the covered crit's own tier, which also saves the levels
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, beats().land + holdMs);
}
