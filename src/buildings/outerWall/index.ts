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
// the 4 wall/divider regions pre-rendered ONCE from wallPattern, drawn every
// frame via a cheap drawImage() instead of re-tiling a CanvasPattern fill —
// measured via the perf overlay + a direct drawFloorContent timing harness:
// each pattern-filled fillRect averaged ~1.46ms (vs ~0ms for an identically-
// sized flat-color fillRect) — 4 of these EVERY floor EVERY frame was the
// actual dominant cost behind a reported "lags even with zero particles"
// mobile bug, not anything particle-related
let leftWallCanvas: HTMLCanvasElement | null = null;
let rightWallCanvas: HTMLCanvasElement | null = null;
let topWallCanvas: HTMLCanvasElement | null = null;
let dividerCanvas: HTMLCanvasElement | null = null;

// renders pattern tiled exactly as `ctx.fillRect(offsetX, offsetY, w, h)` would
// have (translating first so the pattern's own tiling phase anchors to that
// same logical offset) onto a small w x h canvas of its own, so the one-time
// render lands identically to the original per-frame fill but only ever runs once
function renderPatternTile(
  pattern: CanvasPattern,
  offsetX: number,
  offsetY: number,
  w: number,
  h: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(-offsetX, -offsetY);
  ctx.fillStyle = pattern;
  ctx.fillRect(offsetX, offsetY, w, h);
  return canvas;
}

// loads (or reuses, once already loaded) the tileable facade texture and makes
// it the active one drawOuterWall reads from. A pattern isn't tied to the canvas
// it was created from, so a throwaway offscreen context is enough here
export async function loadWallMaterial(): Promise<void> {
  if (wallPattern) return;
  const image = await loadImageByName("wallMaterial");
  if (!image) return;
  const patternCtx = document.createElement("canvas").getContext("2d")!;
  wallPattern = patternCtx.createPattern(image, "repeat");
  if (!wallPattern) return;
  leftWallCanvas = renderPatternTile(
    wallPattern,
    0,
    0,
    SIDE_WALL_WIDTH,
    FLOOR_H,
  );
  rightWallCanvas = renderPatternTile(
    wallPattern,
    FLOOR_W - SIDE_WALL_WIDTH,
    0,
    SIDE_WALL_WIDTH,
    FLOOR_H,
  );
  topWallCanvas = renderPatternTile(wallPattern, 0, 0, FLOOR_W, TOP_WALL_WIDTH);
  dividerCanvas = renderPatternTile(
    wallPattern,
    0,
    FLOOR_H - DIVIDER_H,
    FLOOR_W,
    DIVIDER_H,
  );
}

// draws the building's exterior walls (all four edges) for one floor's own canvas;
// call right after drawFloor so the income panel/upgrade button (drawn after this,
// sized to fit within DIVIDER_H) render mounted on top of the divider band, not
// hidden underneath it
export function drawOuterWall(ctx: CanvasRenderingContext2D): void {
  if (leftWallCanvas && rightWallCanvas && topWallCanvas && dividerCanvas) {
    ctx.drawImage(leftWallCanvas, 0, 0);
    ctx.drawImage(rightWallCanvas, FLOOR_W - SIDE_WALL_WIDTH, 0);
    ctx.drawImage(topWallCanvas, 0, 0);
    ctx.drawImage(dividerCanvas, 0, FLOOR_H - DIVIDER_H);
  } else {
    // flat fallback before the material image (and its pre-rendered tiles above)
    // has finished loading — cheap regardless, no pattern involved yet
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
