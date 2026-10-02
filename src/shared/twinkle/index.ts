// an old-school twinkle: a soft core glow, a long thin cross and a smaller
// diagonal one, `size` from its center to a tip. color must be "#rrggbb";
// additive light suits white glints, plain paint keeps a colored one true.
// Rendered once per color and stamped, since trails and glitter draw hundreds
import { COLOR } from "../../palette";

const SPRITE_HALF = 128;
const bigSprites = new Map<string, HTMLCanvasElement>();

// paints a twinkle of `half` centered at (cx, cy), turned by rotation
export function paintTwinkleAt(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  half: number,
  rotation: number,
  color: string,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - half, cy - half, half * 2, half * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, half * 0.5);
  core.addColorStop(0, color);
  core.addColorStop(1, `${color}00`);
  ctx.fillStyle = core;
  ctx.fillRect(-half * 2, -half * 2, half * 4, half * 4);
  ctx.fillStyle = color;
  drawCross(ctx, half, 0.08);
  ctx.rotate(Math.PI / 4);
  drawCross(ctx, half * 0.45, 0.12);
  ctx.restore();
}

function paintTwinkle(
  half: number,
  rotation: number,
  color: string,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = half * 2;
  paintTwinkleAt(canvas.getContext("2d")!, half, half, half, rotation, color);
  return canvas;
}

function getSprite(color: string): HTMLCanvasElement {
  let sprite = bigSprites.get(color);
  if (!sprite)
    bigSprites.set(color, (sprite = paintTwinkle(SPRITE_HALF, 0, color)));
  return sprite;
}

// small stamps come pre-rotated at a size near their own, so the hundreds a
// trail draws are plain unscaled-ish copies: no transform, no big downscale
const SMALL_HALVES = [8, 16, 32, 64];
// a twinkle looks the same turned a quarter turn
const TURN_STEPS = 32;
const QUARTER = Math.PI / 2;
// per color: per size level, per turn step
const smallSprites = new Map<string, HTMLCanvasElement[][]>();

function getSmallSprite(
  color: string,
  level: number,
  step: number,
): HTMLCanvasElement {
  let levels = smallSprites.get(color);
  if (!levels) smallSprites.set(color, (levels = SMALL_HALVES.map(() => [])));
  return (levels[level][step] ??= paintTwinkle(
    SMALL_HALVES[level],
    (step / TURN_STEPS) * QUARTER,
    color,
  ));
}

// a twinkle stamp in whatever composite ctx is already set to
export function stampTwinkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
): void {
  // sprite px per world unit to spare, for canvases scaled up to 2x
  const need = size * 2;
  let level = 0;
  while (level < SMALL_HALVES.length && SMALL_HALVES[level] < need) level++;
  if (level === SMALL_HALVES.length) {
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(getSprite(color), -size, -size, size * 2, size * 2);
    ctx.rotate(-rotation);
    ctx.translate(-x, -y);
    return;
  }
  const turn = ((rotation % QUARTER) + QUARTER) % QUARTER;
  const step = Math.round((turn / QUARTER) * TURN_STEPS) % TURN_STEPS;
  ctx.drawImage(
    getSmallSprite(color, level, step),
    x - size,
    y - size,
    size * 2,
    size * 2,
  );
}

export function drawTwinkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string = COLOR.white,
  additive = true,
): void {
  if (size <= 0) return;
  const previous = ctx.globalCompositeOperation;
  if (additive) ctx.globalCompositeOperation = "lighter";
  stampTwinkle(ctx, x, y, size, rotation, color);
  ctx.globalCompositeOperation = previous;
}

// a colored star with a white-hot center
export function drawGlimmer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
): void {
  drawTwinkle(ctx, x, y, size, rotation, color);
  drawTwinkle(ctx, x, y, size * 0.5, rotation, COLOR.white);
}

// drawGlimmer in whatever composite ctx is already set to ("lighter"), for
// loops stamping many
export function stampGlimmer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
): void {
  if (size <= 0) return;
  stampTwinkle(ctx, x, y, size, rotation, color);
  stampTwinkle(ctx, x, y, size * 0.5, rotation, COLOR.white);
}

export function hash01(a: number, b: number): number {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

const AURA_GLIMMERS = 5;
const AURA_GLIMMER_MS = 1000;

// glimmers forever twinkling in and out at random spots of a width x height
// area centered on x and rising from bottom, each at most `size`
export function drawGlimmerAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  bottom: number,
  width: number,
  height: number,
  size: number,
  color: string,
  seed: number,
  now: number,
): void {
  for (let i = 0; i < AURA_GLIMMERS; i++) {
    const cycles = now / AURA_GLIMMER_MS + i / AURA_GLIMMERS;
    const t = cycles % 1;
    // a new spot every time this glimmer comes back
    const n = Math.floor(cycles) * AURA_GLIMMERS + i;
    drawGlimmer(
      ctx,
      x + (hash01(seed, n) - 0.5) * width,
      bottom - height * hash01(seed, n + 0.5),
      size * (0.4 + 0.6 * hash01(seed, n + 0.25)) * Math.sin(Math.PI * t),
      t * 1.5,
      color,
    );
  }
}

function drawCross(
  ctx: CanvasRenderingContext2D,
  size: number,
  thickness: number,
): void {
  const inner = size * thickness;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? size : inner;
    const a = (i * Math.PI) / 4;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}
