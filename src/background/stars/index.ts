// still starfield, visible only above a global altitude threshold (see
// gameCanvas.ts's STAR_START_ALTITUDE). Same deterministic-seeded-hash + vertical
// cell-tiling technique as ../clouds: each cell's stars are hashed once and
// kept. Stamped straight on the 2D canvas, never a light batch: a batch's
// light may go on the light overlay, over the floors drawn after
const CELL_H = 300; // world units; the vertical tile repeats every this many units
const STARS_PER_UNIT_WIDTH = 1 / 90; // keeps density roughly constant as the world grows
const DOT = 16;
// each star's brightness is one of these, baked into its own dot
const BRIGHTNESS = [0.35, 0.55, 0.75, 1];

// deterministic pseudo-random in [0,1), so a given (seed, salt) always yields the
// same star position/size/brightness across frames
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// per cell: x, y, radius, brightness index for each star
const STRIDE = 4;
const cells = new Map<number, Float32Array>();
let cellsWidth = 0;
let dots: HTMLCanvasElement[] | null = null;

function starDots(): HTMLCanvasElement[] {
  if (dots) return dots;
  dots = [];
  for (const brightness of BRIGHTNESS) {
    const dot = document.createElement("canvas");
    dot.width = dot.height = DOT;
    const c = dot.getContext("2d")!;
    c.globalAlpha = brightness;
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(DOT / 2, DOT / 2, DOT / 2, 0, Math.PI * 2);
    c.fill();
    dots.push(dot);
  }
  return dots;
}

function cellStars(cell: number, worldWidth: number): Float32Array {
  if (cellsWidth !== worldWidth) {
    cells.clear();
    cellsWidth = worldWidth;
  }
  let stars = cells.get(cell);
  if (stars) return stars;
  const count = Math.max(20, Math.round(worldWidth * STARS_PER_UNIT_WIDTH));
  stars = new Float32Array(count * STRIDE);
  for (let i = 0; i < count; i++) {
    const seed = cell * 104729 + i; // arbitrary large prime, decorrelates neighboring cells
    const o = i * STRIDE;
    stars[o] = rand(seed, 2) * worldWidth;
    stars[o + 1] = cell * CELL_H + rand(seed, 1) * CELL_H;
    stars[o + 2] = 0.6 + rand(seed, 3) * 1.4;
    stars[o + 3] = Math.floor(rand(seed, 4) * BRIGHTNESS.length);
  }
  if (cells.size > 64) cells.clear();
  cells.set(cell, stars);
  return stars;
}

// every star within the visible world rect, but those wholly inside the
// hidden rect (the building, drawn over them later)
export function drawStars(
  ctx: CanvasRenderingContext2D,
  worldWidth: number,
  visibleLeft: number,
  visibleRight: number,
  visibleTop: number,
  visibleBottom: number,
  hiddenLeft: number,
  hiddenRight: number,
  hiddenTop: number,
): void {
  if (worldWidth <= 0) return;
  const cellMin = Math.floor(visibleTop / CELL_H) - 1;
  const cellMax = Math.ceil(visibleBottom / CELL_H) + 1;
  const sprites = starDots();

  for (let cell = cellMin; cell <= cellMax; cell++) {
    const stars = cellStars(cell, worldWidth);
    for (let o = 0; o < stars.length; o += STRIDE) {
      const y = stars[o + 1];
      if (y < visibleTop || y > visibleBottom) continue;
      const x = stars[o];
      if (x < visibleLeft || x > visibleRight) continue;
      const radius = stars[o + 2];
      if (
        y - radius > hiddenTop &&
        x - radius > hiddenLeft &&
        x + radius < hiddenRight
      )
        continue;
      const d = radius * 2;
      ctx.drawImage(sprites[stars[o + 3]], x - radius, y - radius, d, d);
    }
  }
}
