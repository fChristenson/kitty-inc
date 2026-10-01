// the wisp: a will-o'-the-wisp of spirit light — one small white-hot head
// trailing a long stream of tiny twinkling sparkles that starts tight behind
// it and scatters wider and sinks a little as it dims. Shared by every event
// that sends one flitting about, with the playful swoop it flies along
import { COLOR } from "../../palette";
import { radialFade } from "../goldShimmer";
import { drawTwinkle, hash01 } from "../twinkle";

export type Point = { x: number; y: number };

// every wisp's size, passed as drawWisp's `size` (times any grow-in)
export const WISP_SIZE = 40;

// the head: a white-hot core, smeared back along its last few ms of flight,
// in a soft gold halo, with a few sparkles packed tight round it
const CORE = 0.7; // its glow radius, of the wisp's size
const SMEAR = 6;
const SMEAR_MS = 12;
const HALO = 2.6;
const HALO_ALPHA = 0.3;
const HUDDLE = 10;
const HUDDLE_REACH = 0.5;
// the trail: a sparkle shed every TAIL_MS living TAIL_LIFE_MS, scattering out
// to SPREAD of the wisp's size and sinking SINK of it by the end
const TAIL_MS = 3;
const TAIL_LIFE_MS = 1_200;
// how long a wisp's trail lingers after it's gone
export const WISP_TRAIL_MS = TAIL_LIFE_MS;
const SPREAD = 2.4;
const SINK = 0.8;
// a sparkle's glow radius, of the wisp's size; GLINTS of them are tiny crosses
const SPARKLE: [number, number] = [0.08, 0.3];
const GLINTS = 0.3;
const GLINT_SIZE = 2.4; // of its glow radius
// each flickers between TWINKLE_MIN and full brightness
const TWINKLE_MIN = 0.2;
const TWINKLE_MS: [number, number] = [90, 260];
const SPARKLE_COLORS = [
  COLOR.white,
  COLOR.wispGlitter,
  COLOR.white,
  COLOR.heavenlyGold,
  COLOR.wispGlitter,
] as const;

// a soft glowing dot with a tiny white-hot middle; rendered once per color
const SPRITE_HALF = 32;
const sprites = new Map<string, HTMLCanvasElement>();

function glowSprite(color: string): HTMLCanvasElement {
  let canvas = sprites.get(color);
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.width = canvas.height = SPRITE_HALF * 2;
  const ctx = canvas.getContext("2d")!;
  const glow = ctx.createRadialGradient(
    SPRITE_HALF,
    SPRITE_HALF,
    0,
    SPRITE_HALF,
    SPRITE_HALF,
    SPRITE_HALF,
  );
  glow.addColorStop(0, COLOR.white);
  glow.addColorStop(0.15, COLOR.white);
  glow.addColorStop(0.3, `${color}AA`);
  glow.addColorStop(0.6, `${color}22`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SPRITE_HALF * 2, SPRITE_HALF * 2);
  sprites.set(color, canvas);
  return canvas;
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
}

// one tiny twinkling sparkle of glow radius r at (x, y); seed picks its
// color, its rhythm and whether it glints as a cross. Brightens what's behind it
export function drawGlitterLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  alpha: number,
  now: number,
): void {
  if (r <= 0 || alpha <= 0) return;
  const period =
    TWINKLE_MS[0] + (TWINKLE_MS[1] - TWINKLE_MS[0]) * hash01(seed, 71);
  const flicker =
    TWINKLE_MIN +
    (1 - TWINKLE_MIN) *
      (0.5 + 0.5 * Math.sin((now / period) * Math.PI * 2 + seed)) ** 4;
  const color = SPARKLE_COLORS[Math.abs(seed) % SPARKLE_COLORS.length];
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, alpha * flicker);
  if (hash01(seed, 72) < GLINTS)
    drawTwinkle(ctx, x, y, r * GLINT_SIZE, hash01(seed, 73), color);
  else drawGlow(ctx, x, y, r, color);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

// the wisp at at(ms) with its sparkle trail through where it just was; at
// returns null while it's off stage (a fixed point makes a hovering wisp
// fizzing in place). size sets its scale; heat 0..1 swells its white core
export function drawWisp(
  ctx: CanvasRenderingContext2D,
  at: (ms: number) => Point | null,
  ms: number,
  now: number,
  size: number,
  heat = 0,
): void {
  drawWispTrail(ctx, at, ms, now, size);
  drawWispHead(ctx, at, ms, now, size, heat);
}

// just the sparkle trail, for a caller drawing the head under its own transform
export function drawWispTrail(
  ctx: CanvasRenderingContext2D,
  at: (ms: number) => Point | null,
  ms: number,
  now: number,
  size: number,
): void {
  if (size <= 0) return;
  const first = Math.floor((ms - TAIL_LIFE_MS) / TAIL_MS);
  for (let e = first + 1; e <= Math.floor(ms / TAIL_MS); e++) {
    const bornAt = e * TAIL_MS;
    const from = at(bornAt);
    if (!from) continue;
    const age = (ms - bornAt) / TAIL_LIFE_MS;
    // tight behind the head, scattering wider (mostly near the middle) as it ages
    const angle = hash01(e, 31) * Math.PI * 2;
    const spread =
      size * SPREAD * age ** 0.7 * Math.abs(hash01(e, 32) + hash01(e, 33) - 1);
    drawGlitterLight(
      ctx,
      from.x + Math.cos(angle) * spread,
      from.y + Math.sin(angle) * spread + size * SINK * age * age,
      size *
        (SPARKLE[0] + (SPARKLE[1] - SPARKLE[0]) * hash01(e, 34) ** 2) *
        (1 - 0.4 * age),
      e,
      (1 - age) ** 1.2,
      now,
    );
  }
}

// just the head, smeared back along at() over its last few ms of flight
export function drawWispHead(
  ctx: CanvasRenderingContext2D,
  at: (ms: number) => Point | null,
  ms: number,
  now: number,
  size: number,
  heat = 0,
): void {
  const head = at(ms);
  if (!head || size <= 0) return;
  const halo = size * HALO * (1 + 0.5 * heat);
  ctx.globalAlpha = Math.min(1, HALO_ALPHA * (1 + heat));
  ctx.fillStyle = radialFade(ctx, head.x, head.y, halo, COLOR.heavenlyGold);
  ctx.fillRect(head.x - halo, head.y - halo, halo * 2, halo * 2);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  const core = size * CORE * (1 + 0.6 * heat);
  for (let k = SMEAR; k >= 0; k--) {
    const p = at(ms - k * SMEAR_MS) ?? head;
    ctx.globalAlpha = 1 - k / (SMEAR + 1);
    drawGlow(ctx, p.x, p.y, core * (1 - (0.6 * k) / SMEAR), COLOR.white);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  for (let i = 0; i < HUDDLE; i++) {
    const angle =
      hash01(i, 41) * Math.PI * 2 + now / (300 + 200 * hash01(i, 42));
    const reach = size * HUDDLE_REACH * Math.sqrt(hash01(i, 43));
    drawGlitterLight(
      ctx,
      head.x + Math.cos(angle) * reach,
      head.y + Math.sin(angle) * reach,
      size * SPARKLE[1],
      i + 1000,
      1,
      now,
    );
  }
}

// a playful swoop from a to b, t 0..1: bowed out to one side by up to `bend`
// of its length (picked by seed) and wiggling `wiggles` times
export function swoop(
  a: Point,
  b: Point,
  t: number,
  seed: number,
  bend: number,
  wiggles: number,
  wiggleAmp: number,
): Point {
  const e = t * t * (3 - 2 * t);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const bow = (hash01(seed, 1) - 0.5) * 2 * bend;
  const wiggle =
    Math.sin(t * wiggles * Math.PI * 2) * wiggleAmp * Math.sin(Math.PI * t);
  const side = bow * length * 4 * e * (1 - e) + wiggle;
  return {
    x: a.x + dx * e - (dy / length) * side,
    y: a.y + dy * e + (dx / length) * side,
  };
}
