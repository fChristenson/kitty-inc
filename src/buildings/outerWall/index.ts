import { FLOOR_H, FLOOR_W } from "../../floors";

// a thin facade strip along each side of every floor row, masking bg.png's raw
// left/right image edges (now that the blue sky/clouds show past the canvas) so the
// building reads as having an actual exterior wall instead of the interior art cutting
// off abruptly against open sky
const WALL_WIDTH = 28;
const WALL_COLOR = "#9AA5B1"; // flat concrete-gray exterior facade
const WALL_SHADOW_COLOR = "#7C8794"; // inner-edge shading toward the room, for a hint of depth

// draws the building's exterior side walls for one floor's own canvas; call right
// after drawFloor so it overlaps the image's raw edges before anything else is drawn
export function drawOuterWall(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = WALL_COLOR;
  ctx.fillRect(0, 0, WALL_WIDTH, FLOOR_H);
  ctx.fillRect(FLOOR_W - WALL_WIDTH, 0, WALL_WIDTH, FLOOR_H);

  const shadowWidth = 5;
  ctx.fillStyle = WALL_SHADOW_COLOR;
  ctx.fillRect(WALL_WIDTH - shadowWidth, 0, shadowWidth, FLOOR_H);
  ctx.fillRect(FLOOR_W - WALL_WIDTH, 0, shadowWidth, FLOOR_H);
}
