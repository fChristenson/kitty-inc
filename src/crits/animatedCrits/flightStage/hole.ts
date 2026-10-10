// the white hole a flight-stage event's view falls into (Freefall, High
// Noon): the floors at its bottom framed in its white walls, so a fall
// through it lands the view right on them as the stage crashes
import { COLOR } from "../../../palette";
import { drawGlow, fadeStops } from "../../../shared/glowSprite";
import { stampGlimmer } from "../../../shared/twinkle";
import { clamp01 } from "../../../shared/easing";
import { drawScreenPart, type ScreenCopy } from "../../../shared/screenCopy";
import type { FlightView } from ".";
import { beginLightBatch, endLightBatch } from "../../../shared/lightBatch";

// the view's focal length (in screen widths), the hole's radius in screen
// widths, and the floors at its bottom: FLOORS_W wide, FLOORS_W * FOCAL
// below it, so they fill the view exactly as it drops through
export const HOLE_FOCAL = 1.2;
export const HOLE_SIZE = 0.3;
const FLOORS_W = 1;
const FLOORS_BELOW = FLOORS_W * HOLE_FOCAL;
const RIM = 24;
const RIM_SIZE = 0.04;
const RIM_SPIN = 0.003;
const HOLE_GLOW = fadeStops(COLOR.white);

// its radius seen from `depth` above, looking straight down at it
export const holeRadius = (view: FlightView, depth: number): number =>
  (HOLE_SIZE * view.w * HOLE_FOCAL) / depth;

// the hole at (view.cx, y), radius r, `depth` below the view, in its glow,
// ringed by spinning glimmers
export function drawFlightHole(
  ctx: CanvasRenderingContext2D,
  view: FlightView,
  floors: ScreenCopy,
  y: number,
  r: number,
  depth: number,
  alpha: number,
  now: number,
): void {
  if (alpha <= 0) return;
  const { cx } = view;
  const previous = ctx.globalCompositeOperation;
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  drawGlow(ctx, HOLE_GLOW, cx, y, r * 2.4);
  ctx.globalCompositeOperation = previous;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = COLOR.white;
  ctx.fillRect(cx - r, y - r, r * 2, r * 2);
  const fw = (FLOORS_W * HOLE_FOCAL * view.w) / (depth + FLOORS_BELOW);
  const fh = (fw * view.h) / view.w;
  drawScreenPart(
    ctx,
    floors,
    view.x,
    view.y,
    view.w,
    view.h,
    cx - fw / 2,
    y - fh / 2,
    fw,
    fh,
  );
  ctx.restore();
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < RIM; i++) {
    const a = (i / RIM) * Math.PI * 2 + now * RIM_SPIN;
    stampGlimmer(
      ctx,
      cx + Math.cos(a) * r * 1.1,
      y + Math.sin(a) * r * 1.1,
      Math.min(r, view.w) * RIM_SIZE * 4,
      a,
      i % 2 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
  ctx.globalAlpha = 1;
}

// the view dropping from `height` above the hole ever faster onto it and
// through it, ms into the flight, landing on the floors at landMs: the
// flight's flyMs plus the stage's arriveMs, with the stage's ownLanding
export function drawHoleFall(
  ctx: CanvasRenderingContext2D,
  view: FlightView,
  floors: ScreenCopy,
  ms: number,
  landMs: number,
  height: number,
  now: number,
): void {
  const u = clamp01(ms / landMs);
  const depth = Math.max(0.001, height * (1 - (u + u * u) / 2));
  drawFlightHole(
    ctx,
    view,
    floors,
    view.cy,
    holeRadius(view, depth),
    depth,
    1,
    now,
  );
}
