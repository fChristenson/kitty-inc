// sprays for events: a nozzle hissing out a widening cone of glittering mist
// that can sweep its aim over time, planned at arm time and drawn as a pure
// function of ms (no particle state), plus the misty splash where it lands
// and the gold coat it builds up on whatever it's sprayed onto
import { COLOR } from "../../palette";
import { drawGlow, fadeStops, type FadeStops } from "../glowSprite";
import { drawGlitterLight, type Point } from "../wisp";
import { clamp01, easeOut, lerp } from "../easing";
import { hash01 } from "../twinkle";

export interface Spray {
  startMs: number;
  endMs: number;
  // the nozzle and the way it's aimed (rad) at ms
  from: (ms: number) => Point;
  aim: (ms: number) => number;
  // half the cone's width (rad), how far it carries (px) and each droplet's flight
  spread: number;
  reach: number;
  flightMs: number;
}

export interface SprayPlan {
  startMs: number;
  endMs: number;
  spread?: number;
  reach: number;
  flightMs?: number;
}

const fixed = <T>(v: T | ((ms: number) => T)) =>
  typeof v === "function" ? (v as (ms: number) => T) : () => v;

// a spray from `from` aimed along `aim`, either fixed or changing with ms
export function planSpray(
  from: Point | ((ms: number) => Point),
  aim: number | ((ms: number) => number),
  { startMs, endMs, spread = 0.22, reach, flightMs = 420 }: SprayPlan,
): Spray {
  return {
    startMs,
    endMs,
    from: fixed(from),
    aim: fixed(aim),
    spread,
    reach,
    flightMs,
  };
}

// an aim that sweeps from one point's direction to the next's in turn, each
// leg legMs long, seen from `from`: for raking a spray along a row of targets
export function sweepAim(
  from: Point,
  points: Point[],
  startMs: number,
  legMs: number,
): (ms: number) => number {
  const angles = points.map((p) => Math.atan2(p.y - from.y, p.x - from.x));
  return (ms) => {
    if (angles.length === 1) return angles[0];
    const u =
      clamp01((ms - startMs) / (legMs * (angles.length - 1))) *
      (angles.length - 1);
    const k = Math.min(angles.length - 2, Math.floor(u));
    return lerp([angles[k], angles[k + 1]], u - k);
  };
}

// where the spray's aim lands at ms: the middle of its far end
export function sprayLandsAt(spray: Spray, ms: number, into: Point): Point {
  const from = spray.from(ms);
  const a = spray.aim(ms);
  into.x = from.x + Math.cos(a) * spray.reach;
  into.y = from.y + Math.sin(a) * spray.reach;
  return into;
}

// droplets in flight at once; each slot is reused by a fresh one as its last lands
const DROPLETS = 44;
const GRAVITY = 0.35;
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);
const MIST_MS = 260;

// the spray at ms, `size` the droplets' scale: a hissing glow at the nozzle
// and a cone of droplets fanning out, slowing and drifting down as they go
export function drawSpray(
  ctx: CanvasRenderingContext2D,
  spray: Spray,
  ms: number,
  now: number,
  size: number,
): void {
  const { startMs, endMs, flightMs, spread, reach } = spray;
  if (ms < startMs || ms > endMs + flightMs) return;
  const interval = flightMs / DROPLETS;
  const newest = Math.floor((Math.min(ms, endMs) - startMs) / interval);
  if (ms <= endMs) {
    const from = spray.from(ms);
    const a = spray.aim(ms);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now * 0.05);
    drawGlow(
      ctx,
      GOLD,
      from.x + Math.cos(a) * size,
      from.y + Math.sin(a) * size,
      size * 1.6,
    );
    drawGlow(ctx, WHITE, from.x, from.y, size * 0.6);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
  }
  for (let n = newest; n > newest - DROPLETS && n >= 0; n--) {
    const born = startMs + n * interval;
    const t = (ms - born) / flightMs;
    if (t < 0 || t >= 1) continue;
    const from = spray.from(born);
    const a = spray.aim(born) + (hash01(n, 3) * 2 - 1) * spread;
    const d = reach * (0.75 + 0.3 * hash01(n, 5)) * easeOut(t);
    // widening as it flies, every few a bigger glinting drop
    const big = n % 4 === 0;
    drawGlitterLight(
      ctx,
      from.x + Math.cos(a) * d,
      from.y + Math.sin(a) * d + reach * GRAVITY * t * t,
      size * (big ? 0.24 : 0.14) * (0.6 + 0.8 * t),
      n,
      (1 - t * t) * (big ? 1 : 0.8),
      now,
    );
  }
}

// the mist billowing where a spray lands at `at`, msSince it started landing
// there, intensity 0..1
export function drawSprayMist(
  ctx: CanvasRenderingContext2D,
  at: Point,
  msSince: number,
  intensity: number,
  size: number,
  now: number,
): void {
  if (msSince < 0 || intensity <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = intensity * (0.55 + 0.25 * Math.sin(now * 0.03));
  drawGlow(
    ctx,
    GOLD,
    at.x,
    at.y,
    size * (1.2 + 0.3 * Math.sin(now * 0.02)),
    0.6,
  );
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  for (let i = 0; i < 8; i++) {
    const clock = msSince + hash01(i, 21) * MIST_MS;
    const life = Math.floor(clock / MIST_MS);
    const t = (clock % MIST_MS) / MIST_MS;
    const a = hash01(i, life) * Math.PI * 2;
    const r = size * 1.3 * t;
    drawGlitterLight(
      ctx,
      at.x + Math.cos(a) * r,
      at.y + Math.sin(a) * r * 0.5 - size * 0.4 * t,
      size * 0.12,
      i + 700,
      (1 - t) * intensity,
      now,
    );
  }
}

const COAT: FadeStops = [
  [0, `${COLOR.heavenlyGold}cc`],
  [0.55, `${COLOR.heavenlyGold}88`],
  [1, `${COLOR.heavenlyGold}00`],
];

// the gold coat a spray has built up over a w × h area centred on `at`,
// coverage 0..1; flash 0..1 whites it out as it's finished
export function drawSprayCoat(
  ctx: CanvasRenderingContext2D,
  at: Point,
  w: number,
  h: number,
  coverage: number,
  flash = 0,
): void {
  if (coverage <= 0 && flash <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp01(coverage);
  drawGlow(ctx, COAT, at.x, at.y, (w / 2) * (0.6 + 0.6 * coverage), h / w);
  if (flash > 0) {
    ctx.globalAlpha = flash;
    drawGlow(ctx, WHITE, at.x, at.y, (w / 2) * 1.1, h / w);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}
