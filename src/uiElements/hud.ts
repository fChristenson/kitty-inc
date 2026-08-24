import { drawCartoonText } from "../utils";
import { formatTotalIncome } from "./totalIncome";

// floating text overlaid on top of the floors (no panel/bar), pinned via CSS sticky
const HUD_MARGIN = 16;
export const HUD_H = 80;

export function drawHud(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  totalIncome: number,
): void {
  const x = HUD_MARGIN;
  const w = canvasWidth - HUD_MARGIN * 2;

  ctx.font = "900 64px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    `$${formatTotalIncome(totalIncome)}`,
    x + w / 2,
    HUD_H / 2,
    "#34D399",
  );
}
