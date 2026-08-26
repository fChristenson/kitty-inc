import { FLOOR_H, FLOOR_W } from "../../floors";
import { COLOR } from "../../palette";
import { loadImage } from "../../utils";
import wallMaterialUrl from "../../assets/wallMaterial.png";

// a thin facade strip along each side of every floor row, masking bg.png's raw
// left/right image edges (now that the blue sky/clouds show past the canvas) so the
// building reads as having an actual exterior wall instead of the interior art cutting
// off abruptly against open sky. Also masks the top/bottom edges — floors stack with
// zero gap (see floorWorldY in gameCanvas/index.ts), so without this a floor's raw
// image edge touches the one above/below it directly, which reads as a visible seam
// now that each floor can have a completely different background
const WALL_WIDTH = 28;
const WALL_COLOR = COLOR.wall; // flat fallback used until loadWallMaterial resolves
const WALL_SHADOW_COLOR = COLOR.wallShadow; // inner-edge shading toward the room, for a hint of depth

let wallPattern: CanvasPattern | null = null;

// loads the tileable facade texture once; main.ts awaits this alongside the other
// image loads before the first redraw ever needs it. A pattern isn't tied to the
// canvas it was created from, so a throwaway offscreen context is enough here
export async function loadWallMaterial(): Promise<void> {
  const image = await loadImage(wallMaterialUrl);
  const patternCtx = document.createElement("canvas").getContext("2d")!;
  wallPattern = patternCtx.createPattern(image, "repeat");
}

// draws the building's exterior walls (all four edges) for one floor's own canvas;
// call right after drawFloor so it overlaps the image's raw edges before anything
// else is drawn
export function drawOuterWall(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = wallPattern ?? WALL_COLOR;
  ctx.fillRect(0, 0, WALL_WIDTH, FLOOR_H);
  ctx.fillRect(FLOOR_W - WALL_WIDTH, 0, WALL_WIDTH, FLOOR_H);
  ctx.fillRect(0, 0, FLOOR_W, WALL_WIDTH);
  ctx.fillRect(0, FLOOR_H - WALL_WIDTH, FLOOR_W, WALL_WIDTH);

  const shadowWidth = 5;
  ctx.fillStyle = WALL_SHADOW_COLOR;
  ctx.fillRect(WALL_WIDTH - shadowWidth, 0, shadowWidth, FLOOR_H);
  ctx.fillRect(FLOOR_W - WALL_WIDTH, 0, shadowWidth, FLOOR_H);
  ctx.fillRect(0, WALL_WIDTH - shadowWidth, FLOOR_W, shadowWidth);
  ctx.fillRect(0, FLOOR_H - WALL_WIDTH, FLOOR_W, shadowWidth);
}
