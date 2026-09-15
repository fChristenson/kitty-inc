import { shadeColor, drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";

export interface CritTextStyle {
  fontSize: number;
  strokeWidth: number;
}

export function drawCritText(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  { fontSize, strokeWidth }: CritTextStyle,
): void {
  ctx.font = `900 ${fontSize}px "Fredoka", system-ui, sans-serif`;
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
  drawCartoonText(ctx, label, x, y, gradient, COLOR.white, strokeWidth);
}
