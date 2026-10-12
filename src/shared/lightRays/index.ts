// the game's one set of light rays (Overtime's): a soft glow with spinning
// rays round a point, behind a stream's target, a badge, a reward. build 0..1
// brightens them, as Overtime's bar fills
import { COLOR } from "../../palette";
import { prepareSoon } from "../idle";

const RAY_COUNT = 14;
const RAY_REACH = 1.3;
const SPIN_PER_SEC = 1.2;
const SPRITE_HALF = 256;
// the sprite is baked at full build: glow at 0.8, rays at 0.5 of it
const GLOW_ALPHA = 0.35 / 0.8;
const GLOW_GAIN = 0.45 / 0.8;

// a see-through layer (the HUD/flash canvas) and the opaque canvas under it
const bases = new Map<CanvasRenderingContext2D, CanvasRenderingContext2D>();

// rays asked for on `layer` add onto `base` instead: "lighter" on a
// see-through canvas adds onto nothing and shows flat yellow
export function setLightRaysBase(
  layer: CanvasRenderingContext2D,
  base: CanvasRenderingContext2D,
): void {
  bases.set(layer, base);
}

// the rays reach RAY_REACH x radius round (x, y); multiplies into the
// caller's globalAlpha. Glow and rays are one baked sprite, build is its
// alpha (a sprite per build step meant a new 512px canvas every few frames
// of a fade)
export function drawLightRays(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  build: number,
  now: number,
): void {
  if (radius <= 0) return;
  const base = bases.get(ctx);
  if (base) {
    base.save();
    base.setTransform(ctx.getTransform());
    base.globalAlpha = ctx.globalAlpha;
    drawRays(base, x, y, radius, build, now);
    base.restore();
  } else drawRays(ctx, x, y, radius, build, now);
}

function drawRays(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  build: number,
  now: number,
): void {
  const b = Math.min(1, Math.max(0, build));
  const sprite = raysSprite();
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * (GLOW_ALPHA + GLOW_GAIN * b);
  const spin = ((now / 1000) * SPIN_PER_SEC) % (Math.PI * 2);
  const reach = radius * RAY_REACH;
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.drawImage(sprite, -reach, -reach, reach * 2, reach * 2);
  ctx.rotate(-spin);
  ctx.translate(-x, -y);
  ctx.globalCompositeOperation = previous;
  ctx.globalAlpha = alpha;
}

// color at (x, y) fading out at radius; color must be "#rrggbb"
function radialFade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): CanvasGradient {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, `${color}00`);
  return gradient;
}

// the reward gold, ready before its first use
prepareSoon(raysSprite);

let sprite: HTMLCanvasElement | null = null;
function raysSprite(): HTMLCanvasElement {
  if (sprite) return sprite;
  const color = COLOR.coinGold;
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = SPRITE_HALF * 2;
  const c = sprite.getContext("2d")!;
  c.globalCompositeOperation = "lighter";
  c.globalAlpha = 0.5;
  c.fillStyle = radialFade(c, SPRITE_HALF, SPRITE_HALF, SPRITE_HALF, color);
  const halfWidth = Math.PI / RAY_COUNT / 2;
  c.beginPath();
  for (let i = 0; i < RAY_COUNT; i++) {
    const angle = (i / RAY_COUNT) * Math.PI * 2;
    c.moveTo(SPRITE_HALF, SPRITE_HALF);
    c.lineTo(
      SPRITE_HALF + Math.cos(angle - halfWidth) * SPRITE_HALF,
      SPRITE_HALF + Math.sin(angle - halfWidth) * SPRITE_HALF,
    );
    c.lineTo(
      SPRITE_HALF + Math.cos(angle + halfWidth) * SPRITE_HALF,
      SPRITE_HALF + Math.sin(angle + halfWidth) * SPRITE_HALF,
    );
    c.closePath();
  }
  c.fill();
  c.globalAlpha = 0.8;
  c.fillStyle = radialFade(
    c,
    SPRITE_HALF,
    SPRITE_HALF,
    SPRITE_HALF / RAY_REACH,
    color,
  );
  c.fillRect(0, 0, SPRITE_HALF * 2, SPRITE_HALF * 2);
  return sprite;
}
