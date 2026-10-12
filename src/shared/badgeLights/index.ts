// the lights behind a badge (a badge crit's flash, a spawn's badge prize):
// the gold shimmer in a light gold, swaying like searchlights at a gala
import { COLOR } from "../../palette";
import { drawGoldShimmer } from "../goldShimmer";

const SWAY_MS = 900;
const SWAY_RAD = 0.12;
const STRENGTH = 0.4;

// rays reaching about 1.3x radius round (x, y); ms drives the sway
export function drawBadgeLights(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  ms: number,
  now: number,
): void {
  const sway = SWAY_RAD * Math.sin(((ms % SWAY_MS) / SWAY_MS) * Math.PI * 2);
  ctx.translate(x, y);
  ctx.rotate(sway);
  drawGoldShimmer(
    ctx,
    0,
    0,
    radius,
    STRENGTH,
    0,
    now,
    COLOR.coinSpriteHighlight,
  );
  ctx.rotate(-sway);
  ctx.translate(-x, -y);
}
