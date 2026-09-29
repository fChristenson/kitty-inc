// the "roll" an event's coin target (the total-income readout or a floor's
// income bar) does when that event ends, timed to span the ending sound: it
// crouches, pops out at the viewer spinning twice, slams back down and bursts
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { roundRect } from "../../utils";

export type EventEndRollTarget = "total" | "bar";

let totalRoll: { startedAt: number; durationMs: number } | null = null;
const barRolls = new WeakMap<
  Floor,
  { startedAt: number; durationMs: number }
>();

export function triggerEventEndRoll(
  floor: Floor,
  target: EventEndRollTarget,
  durationMs: number,
): void {
  const roll = { startedAt: Date.now(), durationMs };
  if (target === "total") totalRoll = roll;
  else barRolls.set(floor, roll);
}

export interface RollPose {
  angle: number;
  scaleX: number;
  scaleY: number;
}

const REST: RollPose = { angle: 0, scaleX: 1, scaleY: 1 };
const DEG = Math.PI / 180;
// phase boundaries as fractions of the roll's duration
const WINDUP_END = 0.16;
const LAND_AT = 0.6;
const WINDUP_ANGLE = -24 * DEG;
const TURNS = 2;
const OVERSHOOT_ANGLE = 16 * DEG;
const POP_SCALE = 0.4; // extra size at the top of the pop
const SQUASH = 0.22;
const SETTLE_WIGGLES = 3;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);

function pose(
  roll: { startedAt: number; durationMs: number } | undefined | null,
  now: number,
): RollPose {
  if (!roll) return REST;
  const t = (now - roll.startedAt) / roll.durationMs;
  if (t <= 0 || t >= 1) return REST;
  if (t < WINDUP_END) {
    const p = easeInOutSine(t / WINDUP_END);
    return {
      angle: WINDUP_ANGLE * p,
      scaleX: 1 + SQUASH * 0.7 * p,
      scaleY: 1 - SQUASH * p,
    };
  }
  if (t < LAND_AT) {
    const p = (t - WINDUP_END) / (LAND_AT - WINDUP_END);
    const pop = 1 + POP_SCALE * Math.sin(Math.PI * p);
    // stretched on take-off and on the way back down, round at the top
    const stretch = SQUASH * Math.abs(Math.cos(Math.PI * p)) * 0.8;
    return {
      angle:
        WINDUP_ANGLE +
        (Math.PI * 2 * TURNS + OVERSHOOT_ANGLE - WINDUP_ANGLE) *
          easeOutCubic(p),
      scaleX: pop * (1 - stretch * 0.5),
      scaleY: pop * (1 + stretch),
    };
  }
  // slams down flat, then wobbles out of the overshoot back to rest
  const p = (t - LAND_AT) / (1 - LAND_AT);
  const decay = (1 - p) ** 2.2;
  const wobble = Math.cos(p * Math.PI * SETTLE_WIGGLES * 2) * decay;
  return {
    angle: Math.PI * 2 * TURNS + OVERSHOOT_ANGLE * wobble,
    scaleX: 1 + SQUASH * 0.7 * wobble,
    scaleY: 1 - SQUASH * wobble,
  };
}

// the landing burst: shock outlines of the target's own shape plus stars
const BURST_MS = 650;
const BURST_STARS = 12;

function drawBurst(
  ctx: CanvasRenderingContext2D,
  roll: { startedAt: number; durationMs: number } | undefined | null,
  cx: number,
  cy: number,
  width: number,
  height: number,
  now: number,
): void {
  if (!roll) return;
  const elapsed = now - (roll.startedAt + roll.durationMs * LAND_AT);
  if (elapsed < 0 || elapsed >= BURST_MS) return;
  const t = elapsed / BURST_MS;
  ctx.save();
  ctx.lineJoin = "round";
  for (const [delay, color] of [
    [0, COLOR.white],
    [0.18, COLOR.starYellow],
  ] as const) {
    const rt = (t - delay) / (1 - delay);
    if (rt <= 0) continue;
    const grow = 1 - (1 - rt) ** 3;
    const w = width + height * 1.6 * grow;
    const h = height * (1 + 1.6 * grow);
    ctx.globalAlpha = 1 - rt;
    ctx.strokeStyle = color;
    ctx.lineWidth = 10 * (1 - rt) + 2;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 3);
    ctx.stroke();
  }
  // stars fly out from the target's edge, along an ellipse around it
  ctx.fillStyle = COLOR.starYellow;
  ctx.strokeStyle = COLOR.white;
  ctx.lineWidth = 3;
  const out = 1 - (1 - t) ** 2;
  const size = 16 * Math.sin(Math.PI * Math.min(1, t * 1.3));
  ctx.globalAlpha = 1;
  for (let i = 0; i < BURST_STARS; i++) {
    const a = (i / BURST_STARS) * Math.PI * 2 + (i % 2) * 0.2;
    const reach = 0.55 + 0.45 * out + (i % 3) * 0.08 * out;
    drawStar(
      ctx,
      cx + Math.cos(a) * (width / 2 + height * 0.5) * reach,
      cy + Math.sin(a) * height * 1.3 * reach,
      size * (i % 2 ? 0.7 : 1),
      a + t * 4,
    );
  }
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
): void {
  if (size <= 0) return;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size * 0.45;
    const a = rotation + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

export function drawTotalRollBurst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  now: number,
): void {
  drawBurst(ctx, totalRoll, cx, cy, width, height, now);
}

export function drawBarRollBurst(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  cx: number,
  cy: number,
  width: number,
  height: number,
  now: number,
): void {
  drawBurst(ctx, barRolls.get(floor), cx, cy, width, height, now);
}

export function getTotalRollPose(now: number): RollPose {
  return pose(totalRoll, now);
}

export function getBarRollPose(floor: Floor, now: number): RollPose {
  return pose(barRolls.get(floor), now);
}
