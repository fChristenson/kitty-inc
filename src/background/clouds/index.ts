// decorative clouds drifting slowly left-to-right. Drawn in plain WORLD coordinates —
// same as ground/floors in gameCanvas.ts — so the caller's existing camera transform
// positions them correctly with zero extra math here; no per-building offset, no
// screen-space repeat tiling. Purely time-based: no particle arrays or rAF loop of its
// own — gameCanvas.ts's existing perpetual redraw loop just calls drawClouds(now)
// every frame, same way worker.ts positions itself off `now`.

const CELL_H = 520; // world units; the vertical tile repeats every this many units
const CLOUD_SPACING = 360; // world units per cloud; keeps density constant as the world grows
const MAX_CLOUD_SIZE = 0.16 + 0.18; // matches the `size` range below

// the largest radius any cloud can have — callers clipping/culling a cloud-eligible
// band need to pad it by this much, or a cloud whose center sits right at the edge
// of the band gets sliced in half instead of rendering as a full circle
export const CLOUD_MAX_RADIUS = MAX_CLOUD_SIZE * CELL_H;

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  // a cluster of overlapping circles reads as a puffy cloud silhouette
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.arc(x - r * 0.7, y + r * 0.15, r * 0.45, 0, Math.PI * 2);
  ctx.arc(x + r * 0.7, y + r * 0.15, r * 0.5, 0, Math.PI * 2);
  ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.45, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y - r * 0.25, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
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
  if (worldWidth <= 0) return;
  const cellMin = Math.floor(visibleTop / CELL_H) - 1;
  const cellMax = Math.ceil(visibleBottom / CELL_H) + 1;
  const cloudsPerCell = Math.max(6, Math.round(worldWidth / CLOUD_SPACING));
  const slotWidth = worldWidth / cloudsPerCell;
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
      // this cloud's fixed home slot, spread evenly across the whole world width,
      // drifting left over time and wrapping around the world's own edges
      const baseX = i * slotWidth + phase * slotWidth;
      const x =
        (((baseX - now * speed) % worldWidth) + worldWidth) % worldWidth;
      if (x + r < visibleLeft || x - r > visibleRight) continue;
      drawCloud(ctx, x, y, r);
    }
  }
}
