// twinkling starfield, visible only above a global altitude threshold (see
// gameCanvas.ts's STAR_START_ALTITUDE). Same deterministic-seeded-hash + vertical
// cell-tiling technique as ../clouds, so it needs no stored state and redraws
// identically every frame without an rAF loop of its own — the twinkle itself is
// purely a function of `now`, not any per-star animation state.

const CELL_H = 300; // world units; the vertical tile repeats every this many units
const STARS_PER_UNIT_WIDTH = 1 / 90; // keeps density roughly constant as the world grows

// deterministic pseudo-random in [0,1), so a given (seed, salt) always yields the
// same star position/size/twinkle across frames without keeping any array state
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// draws every star currently within [visibleLeft, visibleRight] x [visibleTop,
// visibleBottom] (world units) at its current twinkle brightness. Each star's x/y is a
// fixed position derived from its (cell, i) seed — the whole starfield is one
// continuous field spanning the literal world width, same as ../clouds, not a
// per-building repeat. Vertically, CELL_H-tall cells repeat forever upward.
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
  const starsPerCell = Math.max(20, Math.round(worldWidth * STARS_PER_UNIT_WIDTH));

  for (let cell = cellMin; cell <= cellMax; cell++) {
    const cellTop = cell * CELL_H;
    for (let i = 0; i < starsPerCell; i++) {
      const seed = cell * 104729 + i; // arbitrary large prime, decorrelates neighboring cells
      const y = cellTop + rand(seed, 1) * CELL_H;
      if (y < visibleTop || y > visibleBottom) continue;
      const x = rand(seed, 2) * worldWidth;
      if (x < visibleLeft || x > visibleRight) continue;

      const radius = 0.6 + rand(seed, 3) * 1.4;
      const twinkleSpeed = 0.0015 + rand(seed, 4) * 0.003; // ms^-1
      const phase = rand(seed, 5) * Math.PI * 2;
      const twinkle = 0.5 + 0.5 * Math.sin(now * twinkleSpeed + phase);
      const alpha = 0.25 + twinkle * 0.75;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
