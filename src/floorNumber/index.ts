import { drawCartoonText } from "../utils";

// top-left corner of each floor, no panel background
const MARGIN = 24;

export function drawFloorNumber(
  ctx: CanvasRenderingContext2D,
  floorNumber: number,
  totalFloors: number,
): void {
  const x = MARGIN;
  const y = MARGIN;

  ctx.font = "900 34px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  drawCartoonText(ctx, `${floorNumber} / ${totalFloors}`, x, y);
}
