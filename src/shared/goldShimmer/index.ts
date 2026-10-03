// the gold "reward" shimmer: a soft glow with spinning light rays around a
// point, used behind a coin stream's target and behind special crit images
import { COLOR } from "../../palette";

const RAY_COUNT = 14;

// color at (x, y) fading to transparent at radius, staying solid out to the
// `solid` share of it; color must be "#rrggbb"
export function radialFade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  solid = 0,
): CanvasGradient {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  if (solid > 0) gradient.addColorStop(solid, color);
  gradient.addColorStop(1, `${color}00`);
  return gradient;
}

// strength 0..1 brightens it; the rays reach 1.3x radius and turn
// spinPerSec radians a second. Multiplies into the caller's globalAlpha.
// Glow and rays are baked into one sprite per color and strength (the glow is
// round, so it turns with the rays unchanged): one big additive stamp a frame
// instead of two, as it covers most of the screen behind a crit image
export function drawGoldShimmer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strength: number,
  spinPerSec: number,
  now: number,
  color: string = COLOR.coinGold,
): void {
  if (radius <= 0) return;
  const sprite = getShimmer(color, strength);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  // wrapped: canvas rotates in float precision, so a Date.now()-sized angle
  // snaps to a few fixed steps and the rays look frozen
  const spin = ((now / 1000) * spinPerSec) % (Math.PI * 2);
  const reach = radius * RAY_REACH;
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.drawImage(sprite, -reach, -reach, reach * 2, reach * 2);
  ctx.rotate(-spin);
  ctx.translate(-x, -y);
  ctx.globalCompositeOperation = previous;
}

const SPRITE_HALF = 256;
const RAY_REACH = 1.3;
const STRENGTH_STEPS = 10;
const spriteCache = new Map<
  string,
  { glow: HTMLCanvasElement; rays: HTMLCanvasElement }
>();
const shimmerCache = new Map<string, HTMLCanvasElement>();

function getShimmer(color: string, strength: number): HTMLCanvasElement {
  const step = Math.round(
    Math.min(1, Math.max(0, strength)) * STRENGTH_STEPS,
  );
  const key = `${color}|${step}`;
  let sprite = shimmerCache.get(key);
  if (sprite) return sprite;
  const s = step / STRENGTH_STEPS;
  const { glow, rays } = getSprites(color);
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = SPRITE_HALF * 2;
  const spriteCtx = sprite.getContext("2d")!;
  spriteCtx.globalCompositeOperation = "lighter";
  spriteCtx.globalAlpha = 0.15 + 0.35 * s;
  spriteCtx.drawImage(rays, 0, 0);
  const glowHalf = SPRITE_HALF / RAY_REACH;
  spriteCtx.globalAlpha = 0.35 + 0.45 * s;
  spriteCtx.drawImage(
    glow,
    SPRITE_HALF - glowHalf,
    SPRITE_HALF - glowHalf,
    glowHalf * 2,
    glowHalf * 2,
  );
  shimmerCache.set(key, sprite);
  return sprite;
}

function getSprites(color: string): {
  glow: HTMLCanvasElement;
  rays: HTMLCanvasElement;
} {
  let sprites = spriteCache.get(color);
  if (sprites) return sprites;
  const make = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SPRITE_HALF * 2;
    return canvas;
  };
  const glow = make();
  const glowCtx = glow.getContext("2d")!;
  glowCtx.fillStyle = radialFade(
    glowCtx,
    SPRITE_HALF,
    SPRITE_HALF,
    SPRITE_HALF,
    color,
  );
  glowCtx.fillRect(0, 0, SPRITE_HALF * 2, SPRITE_HALF * 2);

  const rays = make();
  const raysCtx = rays.getContext("2d")!;
  raysCtx.fillStyle = radialFade(
    raysCtx,
    SPRITE_HALF,
    SPRITE_HALF,
    SPRITE_HALF,
    color,
  );
  const halfWidth = Math.PI / RAY_COUNT / 2;
  raysCtx.beginPath();
  for (let i = 0; i < RAY_COUNT; i++) {
    const angle = (i / RAY_COUNT) * Math.PI * 2;
    raysCtx.moveTo(SPRITE_HALF, SPRITE_HALF);
    raysCtx.lineTo(
      SPRITE_HALF + Math.cos(angle - halfWidth) * SPRITE_HALF,
      SPRITE_HALF + Math.sin(angle - halfWidth) * SPRITE_HALF,
    );
    raysCtx.lineTo(
      SPRITE_HALF + Math.cos(angle + halfWidth) * SPRITE_HALF,
      SPRITE_HALF + Math.sin(angle + halfWidth) * SPRITE_HALF,
    );
    raysCtx.closePath();
  }
  raysCtx.fill();

  sprites = { glow, rays };
  spriteCache.set(color, sprites);
  return sprites;
}
