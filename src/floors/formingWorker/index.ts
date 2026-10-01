// a new hire forming out of a golden glow at its spot (floor-local, (x, y) its
// center): it grows in, washed white, then lands at formedAt with a white
// burst as the white fades (Recruit, Fireflies)
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { drawWhiteBurst } from "../../shared/eventFx";
import { drawGoldShimmer } from "../../shared/goldShimmer";
import { drawWorkerSpotlight, WORKER_HEIGHT } from "../worker";

// it grows from this share of its size up to full
const FORM_SCALE = 0.6;
// its white glow fades out over this long once it lands
const WHITE_FADE_MS = 350;
const GLOW = WORKER_HEIGHT * 0.7;
const BURST_MS = 600;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// form 0..1 is how far it's grown in; glow 0..1 the shimmer behind it
// before it lands
export function drawFormingWorker(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  workerIndex: number,
  x: number,
  y: number,
  form: number,
  glow: number,
  formedAt: number | null,
  now: number,
): void {
  const feetY = y + WORKER_HEIGHT / 2;
  // nothing shows at the spot until the glow starts
  ctx.save();
  if (formedAt === null) ctx.globalAlpha *= clamp01(glow);
  drawGoldShimmer(
    ctx,
    x,
    y,
    GLOW * (0.5 + 0.5 * form),
    formedAt === null ? glow : 0,
    2,
    now,
    COLOR.heavenlyGold,
  );
  ctx.restore();
  ctx.save();
  const scale = FORM_SCALE + (1 - FORM_SCALE) * form;
  ctx.globalAlpha = form;
  ctx.translate(x, feetY);
  ctx.scale(scale, scale);
  ctx.translate(-x, -feetY);
  const white =
    formedAt === null ? 1 : 1 - clamp01((now - formedAt) / WHITE_FADE_MS);
  drawWorkerSpotlight(ctx, floor, workerIndex, white, 0);
  ctx.restore();
  if (formedAt !== null)
    drawWhiteBurst(ctx, x, y, (now - formedAt) / BURST_MS, 0.4);
}
