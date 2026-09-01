import { loadThemeClouds } from "../../loadAssets";

// decorative clouds drifting slowly left-to-right. Drawn in plain WORLD coordinates —
// same as ground/floors in gameCanvas.ts — so the caller's existing camera transform
// positions them correctly with zero extra math here; no per-building offset, no
// screen-space repeat tiling. Purely time-based: no particle arrays or rAF loop of its
// own — gameCanvas.ts's existing perpetual redraw loop just calls drawClouds(now)
// every frame, same way worker.ts positions itself off `now`.

const CELL_H = 520; // world units; the vertical tile repeats every this many units
const CLOUD_SPACING = 1440; // world units per cloud; keeps density constant as the world grows (halved cloud count, twice)
const MAX_CLOUD_SIZE = 0.16 + 0.18; // matches the `size` range below

// the largest radius any cloud can have — callers clipping/culling a cloud-eligible
// band need to pad it by this much, or a cloud whose center sits right at the edge
// of the band gets sliced in half instead of rendering as a full circle
export const CLOUD_MAX_RADIUS = MAX_CLOUD_SIZE * CELL_H;

let cloudImages: HTMLImageElement[] = [];

// loads every cloud shape once; main.ts awaits this alongside loadFloorBackgrounds
// before the first frame ever needs to draw one
export async function loadCloudImages(): Promise<HTMLImageElement[]> {
  cloudImages = await loadThemeClouds("references");
  return cloudImages;
}

// draws one of the loaded cloud shapes (picked by variantIndex) centered at (x, y),
// sized so its larger dimension matches 2r — aspect-locked to that shape's own art
// instead of forcing every cloud into a uniform square
function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  variantIndex: number,
): void {
  const image = cloudImages[variantIndex] ?? cloudImages[0];
  if (!image) return;
  const scale = (r * 2) / Math.max(image.naturalWidth, image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
}

// deterministic pseudo-random in [0,1), so a given (seed, salt) always yields the
// same cloud shape/speed/position across frames without keeping any array state
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// draws every cloud currently within [visibleLeft, visibleRight] x [visibleTop,
// visibleBottom] (world units) at its current drift position. Each cloud's x slot is
// a fixed fraction of the literal world width — the whole world's width is the range
// of x positions a cloud can have, not one building's slot repeated — so clouds read
// as one continuous background spread across every building, not per-building slices.
// Vertically, CELL_H-tall cells repeat forever upward so scrolling never runs out of sky.
export function drawClouds(
  ctx: CanvasRenderingContext2D,
  worldWidth: number,
  now: number,
  visibleLeft: number,
  visibleRight: number,
  visibleTop: number,
  visibleBottom: number,
): void {
  // no clearRect here: gameCanvas.ts already clears the whole shared canvas and
  // paints the sky-blue backdrop behind this band once per frame before calling in —
  // clearing here would just punch a transparent hole back through that fill
  if (worldWidth <= 0 || cloudImages.length === 0) return;
  const cellMin = Math.floor(visibleTop / CELL_H) - 1;
  const cellMax = Math.ceil(visibleBottom / CELL_H) + 1;
  // the wrap period is padded by a cloud's own radius (worst case) on each side, so
  // a cloud spends genuine time fully past the visible left/right edges before it
  // wraps back around — without this padding, worldWidth alone as the wrap period
  // made a cloud's exit-left and re-entry-at-right happen in the very same frame
  // (the wrap point sat exactly on the clipped viewport's own edges), reading as an
  // abrupt pop-in instead of drifting in from off-screen
  const wrapMargin = CLOUD_MAX_RADIUS * 2;
  const wrapWidth = worldWidth + wrapMargin * 2;
  const cloudsPerCell = Math.max(2, Math.round(wrapWidth / CLOUD_SPACING));
  const slotWidth = wrapWidth / cloudsPerCell;
  for (let cell = cellMin; cell <= cellMax; cell++) {
    const cellTop = cell * CELL_H;
    for (let i = 0; i < cloudsPerCell; i++) {
      const seed = cell * 977 + i; // decorrelates every (cell, i) combination
      const y = cellTop + rand(seed, 1) * CELL_H;
      if (y < visibleTop || y > visibleBottom) continue;
      const size = 0.16 + rand(seed, 2) * 0.18;
      const r = size * CELL_H;
      const speed = 0.004 + rand(seed, 3) * 0.014;
      const phase = rand(seed, 4);
      const variantIndex = Math.floor(rand(seed, 5) * cloudImages.length);
      // this cloud's fixed home slot, spread evenly across the padded wrap width,
      // drifting left over time and wrapping around at the padded edges (not the
      // visible viewport's own edges) — then shifted back so the visible range
      // [0, worldWidth) sits centered inside the padded cycle
      const baseX = i * slotWidth + phase * slotWidth;
      const x =
        ((((baseX - now * speed) % wrapWidth) + wrapWidth) % wrapWidth) -
        wrapMargin;
      if (x + r < visibleLeft || x - r > visibleRight) continue;
      drawCloud(ctx, x, y, r, variantIndex);
    }
  }
}
