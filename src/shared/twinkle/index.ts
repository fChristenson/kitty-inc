// an old-school twinkle: a soft core glow, a long thin cross and a smaller
// diagonal one, `size` from its center to a tip. color must be "#rrggbb";
// additive light suits white glints, plain paint keeps a colored one true.
// Rendered once per color and stamped, since trails and glitter draw hundreds
import { COLOR } from "../../palette";

const SPRITE_HALF = 128;
const sprites = new Map<string, HTMLCanvasElement>();

function getSprite(color: string): HTMLCanvasElement {
  let sprite = sprites.get(color);
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = SPRITE_HALF * 2;
  const ctx = sprite.getContext("2d")!;
  ctx.translate(SPRITE_HALF, SPRITE_HALF);
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, SPRITE_HALF * 0.5);
  core.addColorStop(0, color);
  core.addColorStop(1, `${color}00`);
  ctx.fillStyle = core;
  ctx.fillRect(-SPRITE_HALF, -SPRITE_HALF, SPRITE_HALF * 2, SPRITE_HALF * 2);
  ctx.fillStyle = color;
  drawCross(ctx, SPRITE_HALF, 0.08);
  ctx.rotate(Math.PI / 4);
  drawCross(ctx, SPRITE_HALF * 0.45, 0.12);
  sprites.set(color, sprite);
  return sprite;
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
  const sprite = getSprite(color);
  const previous = ctx.globalCompositeOperation;
  if (additive) ctx.globalCompositeOperation = "lighter";
  // undone by hand: save()/restore() per stamp is the costly part
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(sprite, -size, -size, size * 2, size * 2);
  ctx.rotate(-rotation);
  ctx.translate(-x, -y);
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

function hash01(a: number, b: number): number {
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
