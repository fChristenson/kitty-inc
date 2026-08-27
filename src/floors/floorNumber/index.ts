import { drawCartoonText } from "../../utils";

// top-left corner of each floor, no panel background, nudged 20px right/down
const MARGIN = 44;
// horizontal-only nudge, another 40px right of MARGIN (vertical position unchanged)
const MARGIN_X = MARGIN + 40;
// vertical-only nudge, another 20px down from MARGIN (horizontal position unchanged)
const MARGIN_Y = MARGIN + 20;

export function drawFloorNumber(
  ctx: CanvasRenderingContext2D,
  floorNumber: number,
  totalFloors: number,
): void {
  const x = MARGIN_X;
  const y = MARGIN_Y;

  ctx.font = '900 34px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  drawCartoonText(ctx, `${floorNumber} / ${totalFloors}`, x, y);
}
