// the glitter that bursts out round a crit's flash: hundreds of the wisp's
// own twinkling sparkles (see ../wisp) flung out from the middle, slowing
// and falling as they burn out, drawn in one WebGL batch (see
// ../spriteBatch); bigger crits throw more, further. Every sparkle is a
// pure function of its index and the time since the crit, so there are no
// particle arrays to update or collect. Without WebGL2 a few dozen are
// stamped the 2D way instead
import { COLOR } from "../../palette";
import { hash01, paintTwinkleAt } from "../../shared/twinkle";
import { drawGlitterLight } from "../../shared/wisp";
import { prepareSoon } from "../../shared/idle";
import {
  createSpriteTexture,
  drawSprites,
  SPRITE_FLOATS,
  type SpriteTexture,
} from "../../shared/spriteBatch";

// a crit, a mega (or special) and an ultra crit's burst
const LEVELS = [
  { sparks: 120, scale: 1 },
  { sparks: 200, scale: 1.25 },
  { sparks: 300, scale: 1.5 },
];
// tuned on a 360px-wide stage (tmp/_playground/critParticles), scaled to the
// flash's viewport width
const STAGE = 360;
const LIFE: [number, number] = [500, 900];
const SPEED: [number, number] = [0.35, 0.9];
const DRAG_MS = 260;
const GRAVITY = 0.0004;
const SIZE: [number, number] = [6, 14];
const FALLBACK_SPARKS = 24;
const CELL = 64;
// the wisp's sparkle looks: its colors in turn, the share that are twinkle
// crosses (GLINT_SIZE times their glow radius), and their flicker
const COLORS = [COLOR.white, COLOR.wispGlitter, COLOR.heavenlyGold];
const COLOR_TURN = [0, 1, 0, 2, 1];
const GLINTS = 0.3;
const GLINT_SIZE = 2.4;
const TWINKLE_MIN = 0.2;
const TWINKLE_MS: [number, number] = [90, 260];

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;

let startedAt: number | null = null;
let level = 0;

// sparkle i, t ms after the crit, at `scale`, local to the burst's middle:
// x, y, glow radius, alpha
const spark = new Float64Array(4);
function sparkAt(i: number, t: number, scale: number): boolean {
  const life = lerp(LIFE, hash01(i, 4));
  if (t < 0 || t >= life) return false;
  const a = hash01(i, 1) * Math.PI * 2;
  const d =
    lerp(SPEED, hash01(i, 2)) * scale * DRAG_MS * (1 - Math.exp(-t / DRAG_MS));
  const k = t / life;
  spark[0] = Math.cos(a) * d;
  spark[1] = Math.sin(a) * d + GRAVITY * scale * t * t;
  spark[2] = lerp(SIZE, hash01(i, 3) ** 2) * (1 - 0.5 * k) * Math.sqrt(scale);
  spark[3] = 1 - k * k;
  return true;
}

// sparkle i's twinkle t ms in: dim most of the time, flaring now and then
function twinkle(i: number, t: number): number {
  const rate = (Math.PI * 2) / lerp(TWINKLE_MS, hash01(i, 71));
  const wave = (0.5 + 0.5 * Math.sin(t * rate + i)) ** 4;
  return TWINKLE_MIN + (1 - TWINKLE_MIN) * wave;
}

// the wisp's sparkles for the batch: a glowing dot per color on the top row,
// a twinkle cross per color under it
let sheet: SpriteTexture | null = null;
function getSheet(): SpriteTexture | null {
  if (sheet) return sheet;
  const canvas = document.createElement("canvas");
  canvas.width = CELL * COLORS.length;
  canvas.height = CELL * 2;
  const c = canvas.getContext("2d")!;
  const half = CELL / 2;
  COLORS.forEach((color, k) => {
    const x = CELL * k + half;
    const g = c.createRadialGradient(x, half, 0, x, half, half);
    g.addColorStop(0, COLOR.white);
    g.addColorStop(0.15, COLOR.white);
    g.addColorStop(0.3, `${color}AA`);
    g.addColorStop(0.6, `${color}22`);
    g.addColorStop(1, `${color}00`);
    c.fillStyle = g;
    c.fillRect(CELL * k, 0, CELL, CELL);
    paintTwinkleAt(c, x, CELL + half, half - 2, 0, color);
  });
  sheet = createSpriteTexture(canvas);
  return sheet;
}

prepareSoon(getSheet);

// a crit's flash just started (level 0 crit, 1 mega or special, 2 ultra), at
// `now` on the flash's own clock
export function startCritSparks(crit: number, now: number): void {
  startedAt = now;
  level = Math.max(0, Math.min(LEVELS.length - 1, crit));
}

export function stopCritSparks(): void {
  startedAt = null;
}

let data = new Float32Array(LEVELS[LEVELS.length - 1].sparks * SPRITE_FLOATS);

// the burst round (x, y) in ctx's space, sized to a viewportWidth-wide flash
export function drawCritSparks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  viewportWidth: number,
  now: number,
): void {
  if (startedAt === null) return;
  const t = now - startedAt;
  if (t < 0) return;
  if (t >= LIFE[1]) {
    startedAt = null;
    return;
  }
  const { sparks, scale: grow } = LEVELS[level];
  const scale = grow * (viewportWidth / STAGE);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  const texture = getSheet();
  if (texture) drawBatch(ctx, texture, x, y, sparks, t, scale);
  else drawFallback(ctx, x, y, t, scale);
  ctx.globalCompositeOperation = previous;
}

function drawBatch(
  ctx: CanvasRenderingContext2D,
  texture: SpriteTexture,
  x: number,
  y: number,
  sparks: number,
  t: number,
  scale: number,
): void {
  // the batch draws in the canvas's own device pixels
  const m = ctx.getTransform();
  const px = Math.hypot(m.a, m.b);
  if (data.length < sparks * SPRITE_FLOATS)
    data = new Float32Array(sparks * SPRITE_FLOATS);
  let n = 0;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let i = 0; i < sparks; i++) {
    if (!sparkAt(i, t, scale)) continue;
    const lx = x + spark[0];
    const ly = y + spark[1];
    const cx = m.a * lx + m.c * ly + m.e;
    const cy = m.b * lx + m.d * ly + m.f;
    const glint = hash01(i, 72) < GLINTS;
    const s = spark[2] * px * (glint ? GLINT_SIZE : 1);
    // crosses sit at their own still turn, like the wisp's trail
    const turn = hash01(i, 73) * (Math.PI / 2);
    const cos = Math.cos(turn) * s;
    const sin = Math.sin(turn) * s;
    const col = COLOR_TURN[i % COLOR_TURN.length];
    const o = n * SPRITE_FLOATS;
    data[o] = cx;
    data[o + 1] = cy;
    data[o + 2] = cos;
    data[o + 3] = sin;
    data[o + 4] = -sin;
    data[o + 5] = cos;
    data[o + 6] = col / COLORS.length;
    data[o + 7] = glint ? 0.5 : 0;
    data[o + 8] = (col + 1) / COLORS.length;
    data[o + 9] = glint ? 1 : 0.5;
    data[o + 10] = spark[3] * twinkle(i, t);
    n++;
    const reach = s * 1.42;
    if (cx - reach < left) left = cx - reach;
    if (cy - reach < top) top = cy - reach;
    if (cx + reach > right) right = cx + reach;
    if (cy + reach > bottom) bottom = cy + reach;
  }
  if (n === 0) return;
  if (!drawSprites(ctx, texture, data, n, left, top, right, bottom))
    drawFallback(ctx, x, y, t, scale);
}

function drawFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  scale: number,
): void {
  for (let i = 0; i < FALLBACK_SPARKS; i++) {
    if (!sparkAt(i, t, scale)) continue;
    drawGlitterLight(ctx, x + spark[0], y + spark[1], spark[2], i, spark[3], t);
  }
}
