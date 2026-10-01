// the Hourglass event's cartoon hourglass: two glass bulbs between wooden caps,
// filled with gold that settles in the lower bulb, or drains from the upper
// one through the neck
import { COLOR } from "../../palette";
import { fillOutlined, roundRect } from "../../utils";

const W = 170;
const H = 280;
const CAP_H = 22;
const POST_W = 12;
const BULB = W * 0.38; // each bulb's half width at its widest
const NECK = 8; // the neck's half width
const OUTLINE = 5;
const TOP = -H / 2 + CAP_H;
const BOTTOM = H / 2 - CAP_H;

export interface HourglassState {
  // how full (0..1) each bulb's gold is, settled towards the neck in the
  // upper one and towards the bottom in the lower one
  upper: number;
  lower: number;
  // gold running through the neck
  pouring: boolean;
  rotation: number;
  scale: number;
}

// where coins pour in (its top cap) and flow out (its lower bulb's floor), from its center
export const HOURGLASS_TOP = TOP - CAP_H / 2;
export const HOURGLASS_BOTTOM = BOTTOM;
export const HOURGLASS_WIDTH = W;
export const HOURGLASS_HEIGHT = H;

function glassPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(-BULB, TOP);
  ctx.bezierCurveTo(-BULB, TOP * 0.35, -NECK, TOP * 0.25, -NECK, 0);
  ctx.bezierCurveTo(-NECK, BOTTOM * 0.25, -BULB, BOTTOM * 0.35, -BULB, BOTTOM);
  ctx.lineTo(BULB, BOTTOM);
  ctx.bezierCurveTo(BULB, BOTTOM * 0.35, NECK, BOTTOM * 0.25, NECK, 0);
  ctx.bezierCurveTo(NECK, TOP * 0.25, BULB, TOP * 0.35, BULB, TOP);
  ctx.closePath();
}

export function drawHourglass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  { upper, lower, pouring, rotation, scale }: HourglassState,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.rect(side * (W / 2 - POST_W) - POST_W / 2, TOP, POST_W, BOTTOM - TOP);
    fillOutlined(ctx, COLOR.hourglassWoodDark, 4);
  }

  glassPath(ctx);
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = COLOR.white;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.save();
  glassPath(ctx);
  ctx.clip();
  ctx.fillStyle = COLOR.coinGold;
  if (upper > 0) ctx.fillRect(-BULB, TOP * upper, BULB * 2, -TOP * upper);
  const lowerTop = BOTTOM * (1 - lower);
  if (lower > 0) ctx.fillRect(-BULB, lowerTop, BULB * 2, BOTTOM - lowerTop);
  if (pouring) ctx.fillRect(-NECK / 2, 0, NECK, lowerTop);
  ctx.restore();

  glassPath(ctx);
  ctx.lineWidth = OUTLINE;
  ctx.strokeStyle = COLOR.black;
  ctx.stroke();
  // a glint down each bulb's left side
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = COLOR.white;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (const end of [TOP, BOTTOM]) {
    ctx.beginPath();
    ctx.moveTo(-BULB * 0.7, end * 0.8);
    ctx.quadraticCurveTo(-BULB * 0.72, end * 0.45, -BULB * 0.35, end * 0.25);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const capY of [TOP - CAP_H, BOTTOM]) {
    roundRect(ctx, -W / 2, capY, W, CAP_H, 8);
    fillOutlined(ctx, COLOR.hourglassWood, OUTLINE);
  }
  ctx.restore();
}
