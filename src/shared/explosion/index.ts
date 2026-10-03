// explosions for events: a blast's fireball, shockwave and flung embers, and
// the fizz of a lit bomb (a wisp) burning down its fuse. All stamped from
// sprites built once, never per-frame gradients
import { COLOR } from "../../palette";
import { drawGlow, fadeStops, type FadeStops } from "../glowSprite";
import { hash01, stampGlimmer } from "../twinkle";
import { lerp } from "../easing";
import type { Point } from "../wisp";

const CORE = fadeStops(COLOR.white, 0.25);
const FLAME: FadeStops = [
  [0, "#FFE066"],
  [0.4, "#FF9A1F"],
  [0.75, "#E8411ACC"],
  [1, "#E8411A00"],
];
const SMOKE: FadeStops = [
  [0, "#2A1A14AA"],
  [0.6, "#2A1A1455"],
  [1, "#2A1A1400"],
];
const WARNING = fadeStops(COLOR.red);

// a detonation's parts each play out over their own span
const FIREBALL_MS = 700;
const SHOCK_MS = 450;
const EMBER_MS = 900;
export const DETONATION_MS = EMBER_MS;
// a fireball swells to `size` px, its smoke rising SMOKE_RISE of it
const SMOKE_RISE = 0.5;
// the shockwave races out to SHOCK_REACH times the fireball
const SHOCK_REACH = 3.2;
// EMBERS embers flung out to EMBER_REACH times the fireball, falling
// EMBER_FALL of it by the end
const EMBERS = 26;
const EMBER_REACH: [number, number] = [0.9, 2.6];
const EMBER_FALL = 0.8;
const EMBER_SIZE = 0.16;
// a lit fuse spits FUSE_SPARKS sparks (more as it burns down), each living
// FUSE_SPARK_MS and flying FUSE_REACH px
const FUSE_SPARKS: [number, number] = [4, 16];
const FUSE_SPARK_MS = 240;
const FUSE_REACH = 46;
const FUSE_SPARK = 9;
// its red warning glow blinks BLINK_HZ times a second, quickening
const BLINK_HZ: [number, number] = [2, 12];

// the fireball t 0..1 through it: a white-hot core, a swelling ball of flame
// and dark smoke billowing up behind it
export function drawFireball(
  ctx: CanvasRenderingContext2D,
  at: Point,
  t: number,
  size: number,
): void {
  if (t <= 0 || t >= 1) return;
  const out = 1 - (1 - t) ** 3;
  const r = size * (0.3 + 0.7 * out);
  ctx.save();
  ctx.globalAlpha = Math.sin(Math.PI * t) * 0.6;
  drawGlow(ctx, SMOKE, at.x, at.y - size * SMOKE_RISE * t, r * 1.3);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = (1 - t) ** 1.5;
  drawGlow(ctx, FLAME, at.x, at.y, r);
  ctx.globalAlpha = Math.max(0, 1 - t * 2.2);
  drawGlow(ctx, CORE, at.x, at.y, r * 0.55);
  ctx.restore();
}

// the shockwave ring t 0..1 through it, racing out from a fireball of `size`
export function drawShockwave(
  ctx: CanvasRenderingContext2D,
  at: Point,
  t: number,
  size: number,
): void {
  if (t <= 0 || t >= 1) return;
  const out = 1 - (1 - t) ** 3;
  const r = size * (0.4 + (SHOCK_REACH - 0.4) * out);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = COLOR.white;
  ctx.globalAlpha = (1 - t) * 0.9;
  ctx.lineWidth = size * 0.12 * (1 - t) + 2;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = COLOR.orange;
  ctx.globalAlpha = (1 - t) * 0.5;
  ctx.lineWidth = size * 0.3 * (1 - t) + 2;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// embers t 0..1 through their flight, flung out of a fireball of `size` and
// falling as they burn out; seed varies the spray between blasts
export function drawEmbers(
  ctx: CanvasRenderingContext2D,
  at: Point,
  t: number,
  size: number,
  now: number,
  seed = 0,
): void {
  if (t <= 0 || t >= 1) return;
  const out = 1 - (1 - t) ** 3;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < EMBERS; i++) {
    const angle = hash01(i, seed + 1) * Math.PI * 2;
    const reach = size * lerp(EMBER_REACH, hash01(i, seed + 2));
    stampGlimmer(
      ctx,
      at.x + Math.cos(angle) * reach * out,
      at.y + Math.sin(angle) * reach * out + size * EMBER_FALL * t * t,
      size * EMBER_SIZE * (0.5 + 0.5 * hash01(i, seed + 3)) * (1 - t),
      now / 120 + i,
      i % 3 === 0 ? COLOR.heavenlyGold : COLOR.orange,
    );
  }
  ctx.globalCompositeOperation = previous;
}

// a whole detonation ms after it went off at `at`: shockwave, fireball and
// embers; draws nothing outside its DETONATION_MS
export function drawDetonation(
  ctx: CanvasRenderingContext2D,
  at: Point,
  ms: number,
  size: number,
  now: number,
  seed = 0,
): void {
  if (ms < 0 || ms >= DETONATION_MS) return;
  drawShockwave(ctx, at, ms / SHOCK_MS, size);
  drawFireball(ctx, at, ms / FIREBALL_MS, size);
  drawEmbers(ctx, at, ms / EMBER_MS, size, now, seed);
}

// a lit bomb's fuse fizzing at `at` (draw its wisp over it): sparks
// sputtering out and a red warning glow of `size` blinking, both wilder as
// `burn` runs 0..1 down to the blast
export function drawLitFuse(
  ctx: CanvasRenderingContext2D,
  at: Point,
  burn: number,
  size: number,
  now: number,
): void {
  const b = Math.min(1, Math.max(0, burn));
  const hz = lerp(BLINK_HZ, b * b);
  const blink = 0.5 + 0.5 * Math.sin((now / 1000) * hz * Math.PI * 2);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = blink * (0.35 + 0.65 * b);
  drawGlow(ctx, WARNING, at.x, at.y, size * (1 + 0.4 * b));
  ctx.globalAlpha = 1;
  const count = Math.round(lerp(FUSE_SPARKS, b));
  for (let i = 0; i < count; i++) {
    const clock = now + hash01(i, 7) * FUSE_SPARK_MS;
    const life = Math.floor(clock / FUSE_SPARK_MS);
    const t = (clock % FUSE_SPARK_MS) / FUSE_SPARK_MS;
    // mostly upward, like a fuse spitting off the top of the bomb
    const angle = -Math.PI / 2 + (hash01(life, i) - 0.5) * Math.PI * 1.4;
    const out = FUSE_REACH * (0.5 + 0.5 * hash01(i, life)) * t * (2 - t);
    stampGlimmer(
      ctx,
      at.x + Math.cos(angle) * out,
      at.y - size * 0.3 + Math.sin(angle) * out + FUSE_REACH * 0.6 * t * t,
      FUSE_SPARK * (1 - t),
      angle,
      i % 2 === 0 ? COLOR.heavenlyGold : COLOR.orange,
    );
  }
  ctx.restore();
}
