import { shadeColor, drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";

export interface CritTextStyle {
  fontSize: number;
  strokeWidth: number;
}

// a flash label is a light gradient fill inside a white outline, drawn over a
// white bloom layer — so a proc whose own color is already near-white (The
// White Whisker, the frosts, the golds) had nothing left to read against.
// Those flip to a black outline instead of being recolored, which keeps each
// proc's identity colour exactly as registered.
const LIGHT_COLOR_LUMINANCE = 0.7;

function isLightColor(hex: string): boolean {
  const value = parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > LIGHT_COLOR_LUMINANCE;
}

export function critFont(fontSize: number): string {
  return `900 ${fontSize}px "Fredoka", system-ui, sans-serif`;
}

export function drawCritText(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  { fontSize, strokeWidth }: CritTextStyle,
): void {
  ctx.font = critFont(fontSize);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const gradient = ctx.createLinearGradient(
    x,
    y - fontSize / 2,
    x,
    y + fontSize / 2,
  );
  gradient.addColorStop(0, shadeColor(color, 0.6));
  gradient.addColorStop(1, color);
  drawCartoonText(
    ctx,
    label,
    x,
    y,
    gradient,
    isLightColor(color) ? COLOR.black : COLOR.white,
    strokeWidth,
  );
}

const POP_MS = 300;
const POP_SCALE = 0.4;

// an event's reward label landing at (x, y): it pops in big at poppedAt
// (performance.now()) and settles
export function drawPoppingCritText(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  poppedAt: number,
  now: number,
  style: CritTextStyle,
): void {
  const pop = 1 + POP_SCALE * Math.max(0, 1 - (now - poppedAt) / POP_MS);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  drawCritText(ctx, label, 0, 0, color, style);
  ctx.restore();
}
