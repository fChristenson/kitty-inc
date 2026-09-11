import {
  FLOOR_H,
  FLOOR_W,
  DIVIDER_H,
  SIDE_WALL_WIDTH,
  TOP_WALL_WIDTH,
} from "../../floors";
import { COLOR } from "../../palette";
import { loadImageByName } from "../../loadAssets";

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
// side walls get one extra tile of the material stacked on (2x TOP_WALL_WIDTH, see
// SIDE_WALL_WIDTH in floors/constants.ts) so they read as noticeably thicker than
// the thin top edge mask, which stays a single tile
const WALL_COLOR = COLOR.wall; // flat fallback used until loadWallMaterial resolves
const WALL_SHADOW_COLOR = COLOR.wallShadow; // inner-edge shading toward the room, for a hint of depth

let wallPattern: CanvasPattern | null = null;
// the 4 wall/divider regions pre-rendered ONCE from wallPattern into ONE shared
// atlas canvas (stacked top-to-bottom), drawn every frame via a cheap drawImage()
// instead of re-tiling a CanvasPattern fill — measured via the perf overlay + a
// direct drawFloorContent timing harness: each pattern-filled fillRect averaged
// ~1.46ms (vs ~0ms for an identically-sized flat-color fillRect) — 4 of these
// EVERY floor EVERY frame was the actual dominant cost behind a reported "lags
// even with zero particles" mobile bug, not anything particle-related. Sharing
// ONE atlas (instead of 4 separate canvases) means all 4 draws sample from the
// same source image — cuts per-floor texture binds from 4 to 1, a real cost on
// weaker/software-rendered mobile GPUs even though each individual draw is cheap
let wallAtlas: HTMLCanvasElement | null = null;
let leftWallRect: { sy: number; w: number; h: number } | null = null;
let rightWallRect: { sy: number; w: number; h: number } | null = null;
let topWallRect: { sy: number; w: number; h: number } | null = null;
let dividerRect: { sy: number; w: number; h: number } | null = null;

// loads (or reuses, once already loaded) the tileable facade texture and makes
// it the active one drawOuterWall reads from. A pattern isn't tied to the canvas
// it was created from, so a throwaway offscreen context is enough here
export async function loadWallMaterial(): Promise<void> {
  if (wallAtlas) return;
  const image = await loadImageByName("wallMaterial");
  if (!image) return;
  const patternCtx = document.createElement("canvas").getContext("2d")!;
  wallPattern = patternCtx.createPattern(image, "repeat");
  if (!wallPattern) return;

  // stacked vertically: left wall, right wall, top wall, divider — atlas width is
  // whichever region is widest (always FLOOR_W, since it's > SIDE_WALL_WIDTH)
  const atlasW = FLOOR_W;
  leftWallRect = { sy: 0, w: SIDE_WALL_WIDTH, h: FLOOR_H };
  rightWallRect = { sy: FLOOR_H, w: SIDE_WALL_WIDTH, h: FLOOR_H };
  topWallRect = { sy: FLOOR_H * 2, w: FLOOR_W, h: TOP_WALL_WIDTH };
  dividerRect = {
    sy: FLOOR_H * 2 + TOP_WALL_WIDTH,
    w: FLOOR_W,
    h: DIVIDER_H,
  };
  const atlasH = dividerRect.sy + dividerRect.h;

  const atlas = document.createElement("canvas");
  atlas.width = atlasW;
  atlas.height = atlasH;
  const actx = atlas.getContext("2d")!;

  // each region's pattern phase is anchored to the SAME logical offset the
  // original per-frame fillRect used (right wall started at x=FLOOR_W-
  // SIDE_WALL_WIDTH, divider at y=FLOOR_H-DIVIDER_H) — translate before filling
  // so the tiling lines up identically to before, just rendered once here instead
  // of every frame
  function fillRegion(
    destY: number,
    logicalOffsetX: number,
    logicalOffsetY: number,
    w: number,
    h: number,
  ): void {
    actx.save();
    actx.translate(-logicalOffsetX, destY - logicalOffsetY);
    actx.fillStyle = wallPattern!;
    actx.fillRect(logicalOffsetX, logicalOffsetY, w, h);
    actx.restore();
  }
  fillRegion(leftWallRect.sy, 0, 0, SIDE_WALL_WIDTH, FLOOR_H);
  fillRegion(rightWallRect.sy, FLOOR_W - SIDE_WALL_WIDTH, 0, SIDE_WALL_WIDTH, FLOOR_H);
  fillRegion(topWallRect.sy, 0, 0, FLOOR_W, TOP_WALL_WIDTH);
  fillRegion(dividerRect.sy, 0, FLOOR_H - DIVIDER_H, FLOOR_W, DIVIDER_H);

  wallAtlas = atlas;
}

// draws the building's exterior walls (all four edges) for one floor's own canvas;
// call right after drawFloor so the income panel/upgrade button (drawn after this,
// sized to fit within DIVIDER_H) render mounted on top of the divider band, not
// hidden underneath it
export function drawOuterWall(ctx: CanvasRenderingContext2D): void {
  if (wallAtlas && leftWallRect && rightWallRect && topWallRect && dividerRect) {
    ctx.drawImage(
      wallAtlas,
      0,
      leftWallRect.sy,
      leftWallRect.w,
      leftWallRect.h,
      0,
      0,
      leftWallRect.w,
      leftWallRect.h,
    );
    ctx.drawImage(
      wallAtlas,
      0,
      rightWallRect.sy,
      rightWallRect.w,
      rightWallRect.h,
      FLOOR_W - SIDE_WALL_WIDTH,
      0,
      rightWallRect.w,
      rightWallRect.h,
    );
    ctx.drawImage(
      wallAtlas,
      0,
      topWallRect.sy,
      topWallRect.w,
      topWallRect.h,
      0,
      0,
      topWallRect.w,
      topWallRect.h,
    );
    ctx.drawImage(
      wallAtlas,
      0,
      dividerRect.sy,
      dividerRect.w,
      dividerRect.h,
      0,
      FLOOR_H - DIVIDER_H,
      dividerRect.w,
      dividerRect.h,
    );
  } else {
    // flat fallback before the material image (and the atlas above) has finished
    // loading — cheap regardless, no pattern involved yet
    ctx.fillStyle = WALL_COLOR;
    ctx.fillRect(0, 0, SIDE_WALL_WIDTH, FLOOR_H);
    ctx.fillRect(FLOOR_W - SIDE_WALL_WIDTH, 0, SIDE_WALL_WIDTH, FLOOR_H);
    ctx.fillRect(0, 0, FLOOR_W, TOP_WALL_WIDTH);
    ctx.fillRect(0, FLOOR_H - DIVIDER_H, FLOOR_W, DIVIDER_H);
  }

  const shadowWidth = 5;
  ctx.fillStyle = WALL_SHADOW_COLOR;
  ctx.fillRect(SIDE_WALL_WIDTH - shadowWidth, 0, shadowWidth, FLOOR_H);
  ctx.fillRect(FLOOR_W - SIDE_WALL_WIDTH, 0, shadowWidth, FLOOR_H);
  ctx.fillRect(0, TOP_WALL_WIDTH - shadowWidth, FLOOR_W, shadowWidth);
  ctx.fillRect(0, FLOOR_H - DIVIDER_H, FLOOR_W, shadowWidth);
}
