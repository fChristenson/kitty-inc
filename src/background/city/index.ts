// a distant city skyline silhouette, drawn once per frame across whatever world-x
// range is currently visible. Deterministic per building "slot" (seeded hash, same
// trick as ../clouds/index.ts) so the skyline never needs any stored state and always
// redraws identically frame to frame without an rAF loop of its own.

const SLOT_W = 220; // world units per city-building slot
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 520;
const BUILDING_COLOR = "#7c8fb0"; // muted blue-gray silhouette, reads as atmospheric distance
const WINDOW_COLOR = "rgba(255, 255, 255, 0.35)";

// the tallest a city building can ever be — callers clipping/culling this layer to
// the visible viewport need this to know how far above groundY it can reach
export const CITY_MAX_HEIGHT = MAX_HEIGHT;

// deterministic pseudo-random in [0,1), so a given (seed, salt) always yields the
// same building shape/window pattern across frames without keeping any array state
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// draws every city building silhouette whose slot overlaps [visibleLeft,
// visibleRight] (world units), each one sitting with its base at groundY and rising
// upward (more negative world-Y) by its own random height
export function drawCity(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  visibleLeft: number,
  visibleRight: number,
): void {
  const slotMin = Math.floor(visibleLeft / SLOT_W) - 1;
  const slotMax = Math.ceil(visibleRight / SLOT_W) + 1;

  for (let slot = slotMin; slot <= slotMax; slot++) {
    const seed = slot * 7919; // arbitrary large prime, decorrelates neighboring slots
    const width = SLOT_W * (0.5 + rand(seed, 1) * 0.4);
    const height = MIN_HEIGHT + rand(seed, 2) * (MAX_HEIGHT - MIN_HEIGHT);
    const x = slot * SLOT_W + (SLOT_W - width) / 2;
    if (x + width < visibleLeft || x > visibleRight) continue;
    const y = groundY - height;

    ctx.fillStyle = BUILDING_COLOR;
    ctx.fillRect(x, y, width, height);

    // a handful of small lit windows, deterministic per building — most stay dark so
    // the ones that are lit read as scattered, not a uniform grid
    const cols = Math.max(2, Math.floor(width / 34));
    const rows = Math.max(2, Math.floor(height / 34));
    ctx.fillStyle = WINDOW_COLOR;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rand(seed, 10 + c * rows + r) < 0.55) continue;
        const wx = x + 10 + c * ((width - 20) / cols);
        const wy = y + 10 + r * ((height - 20) / rows);
        ctx.fillRect(wx, wy, 10, 14);
      }
    }
  }
}
