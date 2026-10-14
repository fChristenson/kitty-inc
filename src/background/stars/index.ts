// twinkling starfield, visible only above a global altitude threshold (see
// gameCanvas.ts's STAR_START_ALTITUDE). Same deterministic-seeded-hash + vertical
// cell-tiling technique as ../clouds: each cell's stars are hashed once and
// kept, and the twinkle itself is purely a function of `now`
import {
  beginLightBatch,
  endLightBatch,
  queueLight,
} from "../../shared/lightBatch";

const CELL_H = 300; // world units; the vertical tile repeats every this many units
const STARS_PER_UNIT_WIDTH = 1 / 90; // keeps density roughly constant as the world grows
const DOT = 16;

// deterministic pseudo-random in [0,1), so a given (seed, salt) always yields the
// same star position/size/twinkle across frames
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// per cell: x, y, radius, twinkle speed, phase for each star
const STRIDE = 5;
const cells = new Map<number, Float32Array>();
let cellsWidth = 0;
let dot: HTMLCanvasElement | null = null;

function starDot(): HTMLCanvasElement {
  if (dot) return dot;
  dot = document.createElement("canvas");
  dot.width = dot.height = DOT;
  const c = dot.getContext("2d")!;
  c.fillStyle = "#fff";
  c.beginPath();
  c.arc(DOT / 2, DOT / 2, DOT / 2, 0, Math.PI * 2);
  c.fill();
  return dot;
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
    stars[o + 3] = 0.0015 + rand(seed, 4) * 0.003; // ms^-1
    stars[o + 4] = rand(seed, 5) * Math.PI * 2;
  }
  if (cells.size > 64) cells.clear();
  cells.set(cell, stars);
  return stars;
}

// every star within the visible world rect at its current twinkle
export function drawStars(
  ctx: CanvasRenderingContext2D,
  worldWidth: number,
  now: number,
  visibleLeft: number,
  visibleRight: number,
  visibleTop: number,
  visibleBottom: number,
): void {
  if (worldWidth <= 0) return;
  const cellMin = Math.floor(visibleTop / CELL_H) - 1;
  const cellMax = Math.ceil(visibleBottom / CELL_H) + 1;
  const sprite = starDot();
  const alpha = ctx.globalAlpha;
  // white on the dark sky: added light looks the same, and goes in one pass
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);

  for (let cell = cellMin; cell <= cellMax; cell++) {
    const stars = cellStars(cell, worldWidth);
    for (let o = 0; o < stars.length; o += STRIDE) {
      const y = stars[o + 1];
      if (y < visibleTop || y > visibleBottom) continue;
      const x = stars[o];
      if (x < visibleLeft || x > visibleRight) continue;
      const radius = stars[o + 2];
      const twinkle = 0.5 + 0.5 * Math.sin(now * stars[o + 3] + stars[o + 4]);
      const a = alpha * (0.25 + twinkle * 0.75);
      const d = radius * 2;
      if (
        !queueLight(
          ctx,
          sprite,
          0,
          0,
          DOT,
          DOT,
          x - radius,
          y - radius,
          d,
          d,
          a,
        )
      ) {
        ctx.globalAlpha = a;
        ctx.drawImage(sprite, x - radius, y - radius, d, d);
      }
    }
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
  ctx.globalAlpha = alpha;
}
