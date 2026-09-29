// the gold "reward" shimmer: a soft glow with spinning light rays around a
// point, used behind a coin stream's target and behind special crit images
import { COLOR } from "../../palette";

const RAY_COUNT = 14;

// color at (x, y) fading to transparent at radius; color must be "#rrggbb"
export function radialFade(
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

// strength 0..1 brightens it; the rays reach 1.3x radius and turn
// spinPerSec radians a second. Multiplies into the caller's globalAlpha.
// Glow and rays are each rendered once per color and stamped every frame:
// rebuilding their gradients and ray paths per frame stuttered under bursts
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
  const { glow, rays } = getSprites(color);
  const alpha = ctx.globalAlpha;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * (0.35 + 0.45 * strength);
  ctx.drawImage(glow, x - radius, y - radius, radius * 2, radius * 2);

  // wrapped: canvas rotates in float precision, so a Date.now()-sized angle
  // snaps to a few fixed steps and the rays look frozen
  const spin = ((now / 1000) * spinPerSec) % (Math.PI * 2);
  const rayLength = radius * 1.3;
  ctx.globalAlpha = alpha * (0.15 + 0.35 * strength);
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.drawImage(rays, -rayLength, -rayLength, rayLength * 2, rayLength * 2);
  ctx.rotate(-spin);
  ctx.translate(-x, -y);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = previous;
}

const SPRITE_HALF = 256;
const spriteCache = new Map<
  string,
  { glow: HTMLCanvasElement; rays: HTMLCanvasElement }
>();

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
