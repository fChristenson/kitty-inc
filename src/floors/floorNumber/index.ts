import { drawCartoonText } from "../../utils";

// drawn OUTSIDE the room, in the gutter left of the building's own left outer wall
// (wall sits at floor-local x=[0, wall width), so any negative x lands in that
// gutter) — right-aligned so its right edge sits a fixed gap before the wall
const GAP_BEFORE_WALL = 40;
const MARGIN_Y = 44 + 20;

export function drawFloorNumber(
  ctx: CanvasRenderingContext2D,
  floorNumber: number,
  totalFloors: number,
): void {
  const x = -GAP_BEFORE_WALL;
  const y = MARGIN_Y;

  ctx.font = '900 51px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  drawCartoonText(ctx, `${floorNumber} / ${totalFloors}`, x, y);
}
