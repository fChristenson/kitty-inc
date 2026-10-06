// glowing claw tears: tapered marks, pointed at both ends and bowed to one
// side, a white core in a gold glow (Scratch's swipes)
import { COLOR } from "../../palette";
import type { Point } from "../wisp";

export interface ClawTear {
  from: Point;
  to: Point;
  // the bow's sideways push at its middle
  bow: Point;
}

// how one tear looks this frame: raked in `reach` 0..1 of the way, its glow
// `glow` × the width, shaken by jitter
export interface TearLook {
  reach: number;
  alpha: number;
  glow: number;
  jitter: Point;
}

const STEPS = 10;
const GLOW_ALPHA = 0.45;
const left: Point[] = Array.from({ length: STEPS + 1 }, () => ({ x: 0, y: 0 }));
const right: Point[] = Array.from({ length: STEPS + 1 }, () => ({
  x: 0,
  y: 0,
}));
const look: TearLook = { reach: 0, alpha: 0, glow: 1, jitter: { x: 0, y: 0 } };

// a tear's spine point share u along it
export function tearSpine(tear: ClawTear, u: number): Point {
  const lift = 4 * u * (1 - u);
  return {
    x: tear.from.x + (tear.to.x - tear.from.x) * u + tear.bow.x * lift,
    y: tear.from.y + (tear.to.y - tear.from.y) * u + tear.bow.y * lift,
  };
}

// a tapered tear from its start to `reach` along it, `width` at its thickest
function traceTear(
  ctx: CanvasRenderingContext2D,
  tear: ClawTear,
  reach: number,
  width: number,
  jitter: Point,
): void {
  const dx = tear.to.x - tear.from.x;
  const dy = tear.to.y - tear.from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  for (let i = 0; i <= STEPS; i++) {
    const u = (i / STEPS) * reach;
    const lift = 4 * u * (1 - u);
    const px = tear.from.x + dx * u + tear.bow.x * lift + jitter.x;
    const py = tear.from.y + dy * u + tear.bow.y * lift + jitter.y;
    // pointed at both ends, thickest a third of the way in
    const w = (width / 2) * Math.sin(Math.PI * Math.min(1, u ** 0.8));
    left[i].x = px + nx * w;
    left[i].y = py + ny * w;
    right[i].x = px - nx * w;
    right[i].y = py - ny * w;
  }
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  for (let i = STEPS; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
}

// every tear `width` at its thickest, each as styleOf sets it (false skips
// it): all the gold glows, then the white cores over them
export function drawClawTears<T extends ClawTear>(
  ctx: CanvasRenderingContext2D,
  tears: readonly T[],
  width: number,
  styleOf: (tear: T, look: TearLook) => boolean,
): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = COLOR.heavenlyGold;
  for (const tear of tears) {
    if (!styleOf(tear, look) || look.alpha <= 0) continue;
    ctx.globalAlpha = GLOW_ALPHA * look.alpha;
    ctx.beginPath();
    traceTear(ctx, tear, look.reach, width * look.glow, look.jitter);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = COLOR.white;
  for (const tear of tears) {
    if (!styleOf(tear, look) || look.alpha <= 0) continue;
    ctx.globalAlpha = Math.min(1, look.alpha);
    ctx.beginPath();
    traceTear(ctx, tear, look.reach, width, look.jitter);
    ctx.fill();
  }
  ctx.restore();
}
