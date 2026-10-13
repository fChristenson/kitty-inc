// charging for events and crits: an element gathering power until its
// climax, like the black hole spawn. The charge (0..1) builds slow then
// fast; the rumble follows it, every shake and buzz harder and closer
// together than the last, then the climax lands the hardest shake and a
// bang at once. The element trembles harder, its glow swells and streaks of
// light race into it quicker as it charges. Plan once at arm (planCharge),
// then each frame tickCharge (the rumble and climax), trembleAt,
// drawChargeGlow and drawChargeStreaks
import { COLOR } from "../../palette";
import { clamp01, lerp, type Range } from "../easing";
import { drawBeam } from "../beam";
import { drawGlow, fadeStops } from "../glowSprite";
import { beginLightBatch, endLightBatch } from "../lightBatch";
import { playExplosion } from "../explosionBang";
import { shakeScreen } from "../screenShake";
import { buzz } from "../vibration";
import type { Point } from "../wisp";

export interface ChargeStyle {
  // how sharply it builds: the charge is its time share to this power
  curve?: number;
  // each rumble's shake and buzz (ms), and the ms to the next, from an
  // empty charge to a full one
  shake?: Range;
  buzz?: Range;
  everyMs?: Range;
  // the climax's shake, and whether it bangs (off when the caller bangs)
  climaxShake?: number;
  bang?: boolean;
}

export interface Charge {
  startMs: number;
  climaxMs: number;
  style: Required<ChargeStyle>;
  // when the next rumble is due, and whether the climax has gone off
  nextRumbleMs: number;
  climaxed: boolean;
}

const DEFAULTS: Required<ChargeStyle> = {
  curve: 2,
  shake: [0.08, 0.6],
  buzz: [6, 45],
  everyMs: [200, 55],
  climaxShake: 3,
  bang: true,
};

// a charge from startMs that peaks chargeMs later
export function planCharge(
  startMs: number,
  chargeMs: number,
  style: ChargeStyle = {},
): Charge {
  return {
    startMs,
    climaxMs: startMs + chargeMs,
    style: { ...DEFAULTS, ...style },
    nextRumbleMs: startMs,
    climaxed: false,
  };
}

// how charged (0..1) it is at ms
export function chargeAt(charge: Charge, ms: number): number {
  const t = clamp01((ms - charge.startMs) / (charge.climaxMs - charge.startMs));
  return t ** charge.style.curve;
}

// the rumble due by ms, through `shake` (a floor crit's own r.shake, else the
// screen's); true on the frame the climax goes off
export function tickCharge(
  charge: Charge,
  ms: number,
  shake: (intensity: number) => void = shakeScreen,
): boolean {
  if (ms < charge.startMs || charge.climaxed) return false;
  const { style } = charge;
  if (ms >= charge.climaxMs) {
    charge.climaxed = true;
    shake(style.climaxShake);
    if (style.bang) playExplosion();
    else buzz(lerp(style.buzz, 1) * 2);
    return true;
  }
  if (ms < charge.nextRumbleMs) return false;
  const c = chargeAt(charge, ms);
  shake(lerp(style.shake, c));
  buzz(lerp(style.buzz, c));
  charge.nextRumbleMs = ms + lerp(style.everyMs, c);
  return false;
}

// the element's tremble at charge c, up to px either way, quicker as it
// charges; written into `out`
export function trembleAt(
  c: number,
  ms: number,
  px: number,
  out: Point,
): Point {
  const k = px * c * c;
  out.x = k * Math.sin(ms * (0.6 + 0.9 * c));
  out.y = k * Math.cos(ms * (0.8 + 1.1 * c));
  return out;
}

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.2);

// the glow it gathers, `size` px across at full charge: a gold halo swelling
// and flickering, a white-hot core growing in it
export function drawChargeGlow(
  ctx: CanvasRenderingContext2D,
  at: Point,
  c: number,
  size: number,
  now: number,
): void {
  if (c <= 0) return;
  const flicker = 1 + 0.12 * c * Math.sin(now * (0.03 + 0.05 * c));
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * (0.35 + 0.65 * c);
  drawGlow(ctx, GOLD, at.x, at.y, size * (0.3 + 0.7 * c) * flicker);
  ctx.globalAlpha = alpha * c;
  drawGlow(ctx, WHITE, at.x, at.y, size * 0.35 * c * flicker);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = previous;
}

const STREAKS = 14;
const STREAK_LEN = 0.2;
const STREAK_WIDTH = 10;
const STREAK_SPEED: Range = [0.5, 2.2];
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };

// streaks of light racing in from `reach` px out, faster and brighter as it
// charges
export function drawChargeStreaks(
  ctx: CanvasRenderingContext2D,
  at: Point,
  c: number,
  reach: number,
  ms: number,
): void {
  if (c <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  const speed = lerp(STREAK_SPEED, c);
  for (let i = 0; i < STREAKS; i++) {
    const a = (i / STREAKS) * Math.PI * 2 + i * 0.37;
    const d = reach - ((ms * speed + i * 211) % reach);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const tail = Math.max(0, d - reach * STREAK_LEN);
    from.x = at.x + cos * d;
    from.y = at.y + sin * d;
    to.x = at.x + cos * tail;
    to.y = at.y + sin * tail;
    drawBeam(
      ctx,
      from,
      to,
      STREAK_WIDTH,
      0.6 * c * Math.min(1, d / (reach * 0.3)),
    );
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}
