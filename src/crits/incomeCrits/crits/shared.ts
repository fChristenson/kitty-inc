// helpers more than one income crit plays with
import { drawDetonation } from "../../../shared/explosion";
import {
  drawText,
  type Point,
  type Running,
} from "../../floorCrits/critPlayer";
import { holeHash } from "../../floorCrits/critPlayer/shared";

const SHRINK_MS = 100;
const SHRINK = 0.6;

// the number shrinking away at the flash's spot as it turns into wisps
export function drawNumberShrink(
  ctx: CanvasRenderingContext2D,
  r: Running,
  ms: number,
): void {
  if (ms >= SHRINK_MS) return;
  const p = ms / SHRINK_MS;
  drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - SHRINK * p), {
    alpha: 1 - p,
  });
}

const READOUT_X = 300;
const READOUT_Y = 35;

// a cubic curve from a, pulled towards b then c, onto d, at t 0..1
export function cubic(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  t: number,
  into: Point,
): Point {
  const u = 1 - t;
  into.x =
    u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x;
  into.y =
    u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y;
  return into;
}

// a spot on the total's readout at `to`, spread across it
export const readoutSpot = (to: Point, k: number, salt: number): Point => ({
  x: to.x + (holeHash(k, salt) * 2 - 1) * READOUT_X,
  y: to.y + (holeHash(k, salt + 1) * 2 - 1) * READOUT_Y,
});

const FINALE_BLAST = 440;
const SIDE_BLAST = 170;
const SIDE_GAP = 130;
const SIDE_EVERY_MS = 45;
const SIDES = [-1, 1, -2, 2];
const side: Point = { x: 0, y: 0 };

// the huge last blast on the total, then blasts out along it 45ms apart
export function drawFinale(
  ctx: CanvasRenderingContext2D,
  to: Point,
  since: number,
  now: number,
): void {
  if (since < 0) return;
  drawDetonation(ctx, to, since, FINALE_BLAST, now);
  side.y = to.y;
  for (let k = 0; k < SIDES.length; k++) {
    side.x = to.x + SIDES[k] * SIDE_GAP;
    drawDetonation(ctx, side, since - SIDE_EVERY_MS * (k + 1), SIDE_BLAST, now);
  }
}
