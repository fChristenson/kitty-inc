// the "Orbital Strike" event: it covers its crit, whose click freezes the
// screen while targeting brackets close in on the clicked floor's income bar
// round a spinning crosshair and lock on, a thin laser flickers down onto it,
// then a blazing beam of light slams down from the sky in a huge blast and
// shake: the bar jumps one crit tier. Then the screen unfreezes and the
// crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, startBoostEventStreamLoop } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  CRIT_TIER_ORDER,
  nextCritTier,
  pickCritTierByOdds,
} from "../../../critTypes";
import { drawExplosion } from "../../../../shared/eventFx";
import { drawBeamFlare } from "../../../../shared/beam";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import {
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsHidden,
} from "../../../../floors/incomePanel";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import { clamp01 } from "../../../../shared/easing";

const KEY = "orbitalStrike";
// the brackets close in from this many times the bar's size to PAD px clear
// of it, blinking ever faster
const BRACKET_FROM = 3;
const BRACKET_PAD = 14;
const BRACKET_ARM = 0.45; // each corner's arms, of the bar's height
const BRACKET_WIDTH = 5;
const BLINK_HZ: [number, number] = [4, 16];
// the crosshair: a ring of dashes this big (of the bar's height) spinning
// down to a stop, with four ticks pointing in
const CROSS_R = 1.1;
const CROSS_SPIN = 9; // radians a second at first
const CROSS_DASHES = 4;
const TICK = 0.45; // of the ring's radius
// the lock: a white flash over the reticle
const LOCK_FLASH_MS = 200;
// the laser: a thin flickering line from the top of the screen
const LASER_WIDTH = 3;
// the beam: as wide as the bar, a gold glow round a white-hot core, slamming
// down from above the screen and thinning out over beamMs
const BEAM_ABOVE = 60;
const BEAM_LAYERS = [
  [1.6, COLOR.heavenlyGold, 0.35],
  [1, COLOR.heavenlyGold, 0.85],
  [0.45, COLOR.white, 1],
] as const;
// the strike: the bar knocked down JOLT px, springing back
const JOLT = 30;
const JOLT_DECAY_MS = 130;
const JOLT_WOBBLE_MS = 150;
const STRIKE_SHAKE = 2.4;
const FLASH_MS = 450;
const BLAST_SCALE = 1.6;
const SPARK_REACH = 340;
const SPARK_SIZE = 20;

interface RunningStrike {
  floor: Floor;
  isGroundFloor: boolean;
  box: { x: number; y: number; width: number; height: number };
  skyY: number;
  startedAt: number;
  lockedAt: number | null;
  struckAt: number | null;
  onLock: () => void;
  onStrike: () => void;
}

let running: RunningStrike | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.orbitalStrikeEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      floor.critMultiplierTier !== CRIT_TIER_ORDER[0] &&
      context.getScreenAreaLocal !== undefined &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: startStrike,
  },
  { label: "Orbital Strike", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Orbital Strike
export function forceOrbitalStrikeEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function strikeMs(): number {
  const { lockMs, aimMs } = CONFIG.orbitalStrikeEvent;
  return lockMs + aimMs;
}

// lock-on and strike go off on the frame they're drawn
function landBeats(strike: RunningStrike, ms: number): void {
  const { lockMs } = CONFIG.orbitalStrikeEvent;
  if (strike.lockedAt === null && ms >= lockMs) {
    strike.lockedAt = strike.startedAt + lockMs;
    strike.onLock();
  }
  if (strike.struckAt === null && ms >= strikeMs()) {
    strike.struckAt = strike.startedAt + strikeMs();
    strike.onStrike();
  }
}

function drawReticle(
  ctx: CanvasRenderingContext2D,
  strike: RunningStrike,
  ms: number,
  now: number,
): void {
  const { lockMs } = CONFIG.orbitalStrikeEvent;
  const { box } = strike;
  const u = clamp01(ms / lockMs);
  const close = 1 - (1 - u) ** 3;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const scale = BRACKET_FROM + (1 - BRACKET_FROM) * close;
  const halfW = (box.width / 2) * scale + BRACKET_PAD;
  const halfH = (box.height / 2) * scale + BRACKET_PAD;
  const arm = box.height * BRACKET_ARM;
  const hz = BLINK_HZ[0] + (BLINK_HZ[1] - BLINK_HZ[0]) * u;
  const locked = strike.lockedAt !== null;
  const blink = locked
    ? 1
    : 0.55 + 0.45 * Math.sign(Math.sin((ms / 1000) * hz * Math.PI * 2));
  const lockFlash =
    strike.lockedAt === null
      ? 0
      : Math.max(0, 1 - (now - strike.lockedAt) / LOCK_FLASH_MS);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.strokeStyle = locked ? COLOR.white : COLOR.heavenlyGold;
  ctx.globalAlpha = blink;
  ctx.lineWidth = BRACKET_WIDTH + 4 * lockFlash;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const x = cx + sx * halfW;
      const y = cy + sy * halfH;
      ctx.beginPath();
      ctx.moveTo(x - sx * arm, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y - sy * arm);
      ctx.stroke();
    }

  // the crosshair spins down to a stop as it locks
  const radius = box.height * CROSS_R * (1 + (scale - 1) * 0.5);
  const angle = (CROSS_SPIN * lockMs * (1 - (1 - u) ** 2)) / 2000;
  ctx.lineWidth = 3 + 3 * lockFlash;
  for (let i = 0; i < CROSS_DASHES; i++) {
    const from = angle + (i / CROSS_DASHES) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, from, from + (Math.PI * 2) / CROSS_DASHES / 2);
    ctx.stroke();
    const tick = from + Math.PI / CROSS_DASHES / 2 + Math.PI / CROSS_DASHES;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(tick) * radius, cy + Math.sin(tick) * radius);
    ctx.lineTo(
      cx + Math.cos(tick) * radius * (1 - TICK),
      cy + Math.sin(tick) * radius * (1 - TICK),
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawLaser(ctx: CanvasRenderingContext2D, strike: RunningStrike): void {
  const { box } = strike;
  const cx = box.x + box.width / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.4 + 0.6 * Math.random();
  ctx.fillStyle = COLOR.white;
  ctx.fillRect(
    cx - LASER_WIDTH / 2,
    strike.skyY,
    LASER_WIDTH,
    box.y + box.height / 2 - strike.skyY,
  );
  ctx.restore();
}

function drawBeam(
  ctx: CanvasRenderingContext2D,
  strike: RunningStrike,
  since: number,
): void {
  const t = since / CONFIG.orbitalStrikeEvent.beamMs;
  if (t >= 1) return;
  const { box } = strike;
  const cx = box.x + box.width / 2;
  const bottom = box.y + box.height / 2;
  const thin = (1 - t) ** 0.6;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const [share, color, alpha] of BEAM_LAYERS) {
    const width = box.width * share * thin;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(cx - width / 2, strike.skyY, width, bottom - strike.skyY);
  }
  ctx.restore();
  drawBeamFlare(ctx, { x: cx, y: bottom }, box.width * 0.4 * thin);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const strike = running;
  if (!strike) return;
  const rect = getFloorRect(strike.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - strike.startedAt;
  landBeats(strike, ms);
  const since = strike.struckAt === null ? null : now - strike.struckAt;
  ctx.save();
  ctx.translate(rect.left, rect.top);

  const jolt =
    since === null
      ? 0
      : JOLT *
        Math.exp(-since / JOLT_DECAY_MS) *
        Math.cos((2 * Math.PI * since) / JOLT_WOBBLE_MS);
  ctx.save();
  ctx.translate(0, jolt);
  drawIncomePanel(ctx, strike.floor, strike.isGroundFloor, {
    whiteAlpha: since === null ? 0 : Math.max(0, 1 - since / FLASH_MS),
    rotation: 0,
  });
  ctx.restore();

  if (since === null) {
    drawReticle(ctx, strike, ms, now);
    if (strike.lockedAt !== null) drawLaser(ctx, strike);
  } else {
    drawBeam(ctx, strike, since);
    drawExplosion(
      ctx,
      strike.box.x + strike.box.width / 2,
      strike.box.y + strike.box.height / 2,
      since,
      now,
      BLAST_SCALE,
      SPARK_REACH,
      SPARK_SIZE,
    );
  }
  ctx.restore();
}

function startStrike(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (running || isScreenFrozen() || !area) return;
  const { holdMs } = CONFIG.orbitalStrikeEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const strike: RunningStrike = {
    floor,
    isGroundFloor: context.isGroundFloor,
    box: getIncomeBarBox(context.isGroundFloor),
    skyY: area.top - BEAM_ABOVE,
    startedAt: performance.now(),
    lockedAt: null,
    struckAt: null,
    onLock: playBloop,
    onStrike: () => {
      floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
      playSlamExplosion();
      shakeScreen(STRIKE_SHAKE);
    },
  };
  running = strike;
  const isLive = () => running === strike;
  setIncomePanelsHidden([floor]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  setTimeout(() => {
    if (!isLive()) return;
    landBeats(strike, Infinity);
    running = null;
    stopSound();
    setIncomePanelsHidden([]);
    unfreezeScreen();
    // the covered crit's own tier, which also saves the floor's new tier
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, strikeMs() + holdMs);
}
