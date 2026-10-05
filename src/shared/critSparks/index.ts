// the glitter that bursts out round a crit's flash: hundreds of gold and white
// sparks flung out from the middle, slowing and falling as they burn out,
// drawn in one WebGL batch (see ../spriteBatch); bigger crits throw more,
// further. Every spark is a
// pure function of its index and the time since the crit, so there are no
// particle arrays to update or collect. Without WebGL2 a few dozen are
// stamped the 2D way instead
import { COLOR } from "../../palette";
import { stampGlimmer, hash01 } from "../twinkle";
import { runWhenIdle } from "../idle";
import {
  createSpriteTexture,
  drawSprites,
  SPRITE_FLOATS,
  type SpriteTexture,
} from "../spriteBatch";

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

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;

let startedAt: number | null = null;
let level = 0;

// sparks i, t ms after the crit, at `scale`, local to the burst's middle
const spark = new Float64Array(4);
let sparkWhite = false;
function sparkAt(i: number, t: number, scale: number): boolean {
  const life = lerp(LIFE, hash01(i, 4));
  if (t < 0 || t >= life) return false;
  const a = hash01(i, 1) * Math.PI * 2;
  const d =
    lerp(SPEED, hash01(i, 2)) * scale * DRAG_MS * (1 - Math.exp(-t / DRAG_MS));
  const k = t / life;
  spark[0] = Math.cos(a) * d;
  spark[1] = Math.sin(a) * d + GRAVITY * scale * t * t;
  spark[2] = lerp(SIZE, hash01(i, 3)) * (1 - 0.5 * k) * Math.sqrt(scale);
  spark[3] = 1 - k * k;
  sparkWhite = i % 3 === 0;
  return true;
}

// a gold and a white glimmer side by side, for the batch
let sheet: SpriteTexture | null = null;
function getSheet(): SpriteTexture | null {
  if (sheet) return sheet;
  const canvas = document.createElement("canvas");
  canvas.width = CELL * 2;
  canvas.height = CELL;
  const c = canvas.getContext("2d")!;
  c.globalCompositeOperation = "lighter";
  stampGlimmer(c, CELL / 2, CELL / 2, CELL * 0.44, 0, COLOR.heavenlyGold);
  stampGlimmer(c, CELL * 1.5, CELL / 2, CELL * 0.44, 0, COLOR.white);
  sheet = createSpriteTexture(canvas);
  return sheet;
}

runWhenIdle(getSheet);

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
    const s = spark[2] * px;
    const turn = i + t * 0.004;
    const cos = Math.cos(turn) * s;
    const sin = Math.sin(turn) * s;
    const o = n * SPRITE_FLOATS;
    data[o] = cx;
    data[o + 1] = cy;
    data[o + 2] = cos;
    data[o + 3] = sin;
    data[o + 4] = -sin;
    data[o + 5] = cos;
    data[o + 6] = sparkWhite ? 0.5 : 0;
    data[o + 7] = 0;
    data[o + 8] = sparkWhite ? 1 : 0.5;
    data[o + 9] = 1;
    data[o + 10] = spark[3];
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
    ctx.globalAlpha = spark[3];
    stampGlimmer(
      ctx,
      x + spark[0],
      y + spark[1],
      spark[2],
      i + t * 0.004,
      sparkWhite ? COLOR.white : COLOR.heavenlyGold,
    );
  }
  ctx.globalAlpha = 1;
}
