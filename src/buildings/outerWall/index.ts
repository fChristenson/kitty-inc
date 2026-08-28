import { FLOOR_H, FLOOR_W, DIVIDER_H, SIDE_WALL_WIDTH } from "../../floors";
import { COLOR } from "../../palette";
import { loadImage } from "../../utils";
import wallMaterialUrl from "../../assets/wallMaterial.png";

// a thin facade strip along each side of every floor row, masking bg.png's raw
// left/right image edges (now that the blue sky/clouds show past the canvas) so the
// building reads as having an actual exterior wall instead of the interior art cutting
// off abruptly against open sky. Also masks the top edge — floors stack with zero gap
// (see floorWorldY in gameCanvas/index.ts), so without this a floor's raw image edge
// touches the one above it directly, which reads as a visible seam now that each floor
// can have a completely different background. The bottom edge uses the much taller
// DIVIDER_H instead — several rows of the same tileable material, reading as a real
// structural floor-divider band rather than just an edge mask (see DIVIDER_H's own
// comment in floors/constants.ts for why only the bottom edge needs to be this tall)
const WALL_WIDTH = 28;
// side walls get one extra tile of the material stacked on (2x WALL_WIDTH, see
// SIDE_WALL_WIDTH in floors/constants.ts) so they read as noticeably thicker than
// the thin top edge mask, which stays a single tile
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
// call right after drawFloor so the income panel/upgrade button (drawn after this,
// sized to fit within DIVIDER_H) render mounted on top of the divider band, not
// hidden underneath it
export function drawOuterWall(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = wallPattern ?? WALL_COLOR;
  ctx.fillRect(0, 0, SIDE_WALL_WIDTH, FLOOR_H);
  ctx.fillRect(FLOOR_W - SIDE_WALL_WIDTH, 0, SIDE_WALL_WIDTH, FLOOR_H);
  ctx.fillRect(0, 0, FLOOR_W, WALL_WIDTH);
  ctx.fillRect(0, FLOOR_H - DIVIDER_H, FLOOR_W, DIVIDER_H);

  const shadowWidth = 5;
  ctx.fillStyle = WALL_SHADOW_COLOR;
  ctx.fillRect(SIDE_WALL_WIDTH - shadowWidth, 0, shadowWidth, FLOOR_H);
  ctx.fillRect(FLOOR_W - SIDE_WALL_WIDTH, 0, shadowWidth, FLOOR_H);
  ctx.fillRect(0, WALL_WIDTH - shadowWidth, FLOOR_W, shadowWidth);
  ctx.fillRect(0, FLOOR_H - DIVIDER_H, FLOOR_W, shadowWidth);
}
