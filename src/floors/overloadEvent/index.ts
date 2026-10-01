// the "Overload" event: it covers its crit, whose click freezes the screen
// while the clicked floor's income bar overheats: it shudders ever harder,
// flashes white ever faster and sprays sparks off its edges as the screen
// rumbles; it sucks in for a split second, then blows in a huge explosion,
// flash and shockwave and jumps one crit tier. Then the screen unfreezes and
// the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSlamExplosion, startBoostEventStreamLoop } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  CRIT_TIER_ORDER,
  nextCritTier,
  pickCritTierByOdds,
} from "../../shared/critTypes";
import { drawExplosion } from "../../shared/eventFx";
import { hash01 } from "../../shared/twinkle";
import { drawGlitterLight } from "../../shared/wisp";
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

const KEY = "overload";
// overheating: shuddering up to SHUDDER px, flashing white up to FLASH_PEAK
// at FLASH_HZ, the screen rumbling RUMBLES times ever harder
const SHUDDER = 8;
const FLASH_HZ: [number, number] = [3, 16];
const FLASH_PEAK = 0.75;
const RUMBLES = 6;
const RUMBLE_SHAKE: [number, number] = [0.15, 0.7];
// sparks sprayed off its edges, ever more as it heats: each flies out at up
// to SPARK_SPEED px/ms, falling, for SPARK_LIFE_MS
const SPARKS = 90;
const SPARK_SPEED: [number, number] = [0.3, 0.9];
const SPARK_GRAVITY = 0.0016;
const SPARK_LIFE_MS = 450;
const SPARK_SIZE = 9;
// it sucks in to SUCK of its size, then pops out to POP and springs back
const SUCK = 0.82;
const POP = 1.35;
const POP_SPRING_MS = 160;
// the blast
const BLAST_SHAKE = 2.6;
const BLAST_SCALE = 1.9;
const BLAST_REACH = 380;
const BLAST_SPARK = 22;
const SCREEN_FLASH_MS = 260;
const SCREEN_FLASH = 0.85;
const BAR_FLASH_MS = 450;

interface RunningOverload {
  floor: Floor;
  isGroundFloor: boolean;
  box: { x: number; y: number; width: number; height: number };
  area: { left: number; top: number; right: number; bottom: number };
  startedAt: number;
  blewAt: number | null;
}

let running: RunningOverload | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.overloadEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      floor.critMultiplierTier !== CRIT_TIER_ORDER[0] &&
      context.getScreenAreaLocal !== undefined &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: startOverload,
  },
  { label: "Overload", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Overload
export function forceOverloadEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;

function blowMs(): number {
  const { chargeMs, suckMs } = CONFIG.overloadEvent;
  return chargeMs + suckMs;
}

// the bar's size ms in: steady while it heats, sucking in, then popping out
// and springing back once it's blown
function barScale(overload: RunningOverload, ms: number, now: number): number {
  const { chargeMs, suckMs } = CONFIG.overloadEvent;
  if (overload.blewAt !== null) {
    const t = now - overload.blewAt;
    return 1 + (POP - 1) * Math.exp(-t / POP_SPRING_MS) * Math.cos(t / 45);
  }
  if (ms < chargeMs) return 1;
  return 1 + (SUCK - 1) * clamp01((ms - chargeMs) / suckMs) ** 2;
}

// sparks sprayed off the bar's edges, born ever faster as it heats
function drawSparks(
  ctx: CanvasRenderingContext2D,
  overload: RunningOverload,
  ms: number,
  now: number,
): void {
  const { chargeMs } = CONFIG.overloadEvent;
  const { box } = overload;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  for (let i = 0; i < SPARKS; i++) {
    const bornAt = chargeMs * Math.sqrt(i / SPARKS);
    const age = ms - bornAt;
    if (age < 0 || age >= SPARK_LIFE_MS) continue;
    // a point on the bar's edge, flying out away from its middle
    const along = hash01(i, 91);
    const onTop = hash01(i, 92) < 0.7;
    const x = box.x + box.width * along;
    const y = onTop ? box.y : box.y + box.height;
    const dx = x - cx;
    const dy = y - cy;
    const length = Math.hypot(dx, dy) || 1;
    const speed = lerp(SPARK_SPEED, hash01(i, 93));
    const vx = (dx / length) * speed * 0.6;
    const vy = (dy / length) * speed - 0.25;
    const life = age / SPARK_LIFE_MS;
    drawGlitterLight(
      ctx,
      x + vx * age,
      y + vy * age + 0.5 * SPARK_GRAVITY * age * age,
      SPARK_SIZE * (1 - life),
      i,
      1 - life,
      now,
    );
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const overload = running;
  if (!overload) return;
  const rect = getFloorRect(overload.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - overload.startedAt;
  if (overload.blewAt === null && ms >= blowMs()) blow(overload, now);
  const { chargeMs } = CONFIG.overloadEvent;
  const { box, area } = overload;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const heat = clamp01(ms / chargeMs);
  ctx.save();
  ctx.translate(rect.left, rect.top);

  const since = overload.blewAt === null ? null : now - overload.blewAt;
  const shudder = since === null ? SHUDDER * heat * heat : 0;
  const scale = barScale(overload, ms, now);
  const hz = lerp(FLASH_HZ, heat);
  const whiteAlpha =
    since !== null
      ? Math.max(0, 1 - since / BAR_FLASH_MS)
      : ms >= chargeMs
        ? FLASH_PEAK
        : FLASH_PEAK *
          heat *
          (0.5 + 0.5 * Math.sin((ms / 1000) * hz * Math.PI * 2));
  ctx.save();
  ctx.translate(
    cx + (Math.random() * 2 - 1) * shudder,
    cy + (Math.random() * 2 - 1) * shudder,
  );
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  drawIncomePanel(ctx, overload.floor, overload.isGroundFloor, {
    whiteAlpha,
    rotation: 0,
  });
  ctx.restore();

  if (since === null) drawSparks(ctx, overload, ms, now);
  else {
    drawExplosion(
      ctx,
      cx,
      cy,
      since,
      now,
      BLAST_SCALE,
      BLAST_REACH,
      BLAST_SPARK,
    );
    const flash = 1 - since / SCREEN_FLASH_MS;
    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = SCREEN_FLASH * flash;
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
  ctx.restore();
}

// on the frame it blows
function blow(overload: RunningOverload, now: number): void {
  overload.blewAt = now;
  overload.floor.critMultiplierTier = nextCritTier(
    overload.floor.critMultiplierTier,
  );
  playSlamExplosion();
  shakeScreen(BLAST_SHAKE);
}

function startOverload(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (running || isScreenFrozen() || !area) return;
  const { chargeMs, holdMs } = CONFIG.overloadEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const overload: RunningOverload = {
    floor,
    isGroundFloor: context.isGroundFloor,
    box: getIncomeBarBox(context.isGroundFloor),
    area,
    startedAt: performance.now(),
    blewAt: null,
  };
  running = overload;
  const isLive = () => running === overload;
  setIncomePanelsHidden([floor]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  // the rumble building as it heats
  for (let i = 0; i < RUMBLES; i++) {
    const u = i / (RUMBLES - 1);
    setTimeout(
      () => {
        if (isLive()) shakeScreen(lerp(RUMBLE_SHAKE, u));
      },
      chargeMs * (0.15 + 0.85 * u),
    );
  }

  setTimeout(() => {
    if (!isLive()) return;
    if (overload.blewAt === null) blow(overload, performance.now());
    running = null;
    stopSound();
    setIncomePanelsHidden([]);
    unfreezeScreen();
    // the covered crit's own tier, which also saves the floor's new tier
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, blowMs() + holdMs);
}
