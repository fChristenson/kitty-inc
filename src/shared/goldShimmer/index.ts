// the gold "reward" shimmer: a soft glow with spinning light rays around a
// point, used behind a coin stream's target and behind special crit images
import { COLOR } from "../../palette";
import { prepareSoon } from "../idle";

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
// Glow and rays are baked into one sprite per color (the glow is round, so it
// turns with the rays unchanged): one big additive stamp a frame instead of
// two, as it covers most of the screen behind a crit image. Strength is its
// alpha: a sprite per strength step meant a new 512px canvas every few
// frames of a fading slam, each a stall
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
  const sprite = getShimmer(color);
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha =
    alpha * (GLOW_ALPHA + GLOW_GAIN * Math.min(1, Math.max(0, strength)));
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
  ctx.globalAlpha = alpha;
}

const SPRITE_HALF = 256;
const RAY_REACH = 1.3;
// the sprite is baked at full strength: glow at 0.8, rays at 0.5 of it
const GLOW_ALPHA = 0.35 / 0.8;
const GLOW_GAIN = 0.45 / 0.8;
const shimmerCache = new Map<string, HTMLCanvasElement>();

// the reward golds, ready before their first slam
prepareSoon(() => {
  getShimmer(COLOR.coinGold);
  getShimmer(COLOR.coinSpriteGold);
});

function getShimmer(color: string): HTMLCanvasElement {
  let sprite = shimmerCache.get(color);
  if (sprite) return sprite;
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
  const glowHalf = SPRITE_HALF / RAY_REACH;
  c.globalAlpha = 0.8;
  c.fillStyle = radialFade(c, SPRITE_HALF, SPRITE_HALF, glowHalf, color);
  c.fillRect(0, 0, SPRITE_HALF * 2, SPRITE_HALF * 2);
  shimmerCache.set(color, sprite);
  return sprite;
}
