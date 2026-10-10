import { loadImageByName } from "../../loadAssets";
import { prepareEachSoon } from "../../shared/idle";
import { hash01 } from "../../shared/twinkle";

// a boosted worker's coin bubbles: small coins trickling up off it, swaying
// in toward the middle as they fade. Baked once into a looping flipbook, so a
// boosted worker costs one stamp a frame instead of a drawImage per coin

// coin.png is kept at full resolution for the PWA icon; the bubbles are at
// most ~48px across, so they're baked from a small copy
const COIN_CANVAS_SIZE = 64;
let coinCanvas: HTMLCanvasElement | null = null;

export async function loadFloatingCoinImage(): Promise<HTMLImageElement> {
  const image = await loadImageByName("coin");
  const canvas = document.createElement("canvas");
  canvas.width = COIN_CANVAS_SIZE;
  canvas.height = COIN_CANVAS_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, COIN_CANVAS_SIZE, COIN_CANVAS_SIZE);
  coinCanvas = canvas;
  bakeFlipbook();
  return image;
}

// a coin leaves every SPAWN_MS (three per 300ms) and lives 110-150 ticks
const TICK_MS = 1000 / 60;
const SPAWN_MS = 100;
const LOOP_MS = 2400;
const FRAMES = 60;
const COLS = 10;
// world px round the column, its spawn point FRAME_X/FRAME_Y in from the top-left
const FRAME_W = 124;
const FRAME_H = 245;
const FRAME_X = FRAME_W / 2;
const FRAME_Y = 210;
// sprite px per world unit, a touch over the canvas's own on a phone
const RES = 0.65;
const CELL_W = Math.ceil(FRAME_W * RES);
const CELL_H = Math.ceil(FRAME_H * RES);

const bubble = { dx: 0, dy: 0, r: 0, alpha: 0 };

// coin k, age ms after it left the spawn point; false once it's gone
function bubbleAt(k: number, age: number): boolean {
  const life = (110 + 40 * hash01(k, 1)) * TICK_MS;
  if (age >= life) return false;
  const ticks = age / TICK_MS;
  const t = age / life;
  const startOffset = ((k % 3) - 1) * 22 + (hash01(k, 2) - 0.5) * 15;
  const vy = -(0.6 + 0.6 * hash01(k, 3));
  const phase = hash01(k, 4) * Math.PI * 2;
  // a cone: in from its offset toward the middle as it rises, with a sway
  bubble.dx = startOffset * (1 - t) + Math.sin(ticks * 0.15 + phase) * 6;
  bubble.dy = (hash01(k, 5) - 0.5) * 20 + vy * ticks;
  bubble.r = (16 + 8 * hash01(k, 6)) * (1 - t * 0.3);
  bubble.alpha = 1 - t;
  return true;
}

let flipbook: HTMLCanvasElement | null = null;
let baked = 0;

function bakeFlipbook(): void {
  if (flipbook) return;
  const canvas = document.createElement("canvas");
  canvas.width = CELL_W * COLS;
  canvas.height = CELL_H * Math.ceil(FRAMES / COLS);
  flipbook = canvas;
  baked = 0;
  // a lost GPU (a phone backgrounding the browser) comes back with this big
  // canvas blank, and every bubble with it: baked again
  canvas.addEventListener("contextrestored", () => {
    flipbook = null;
    bakeFlipbook();
  });
  const c = canvas.getContext("2d")!;
  const coins = LOOP_MS / SPAWN_MS;
  const frames = Array.from({ length: FRAMES }, (_, f) => f);
  prepareEachSoon(frames, (f) => {
    if (flipbook !== canvas) return;
    const ms = (f / FRAMES) * LOOP_MS;
    c.setTransform(
      RES,
      0,
      0,
      RES,
      (f % COLS) * CELL_W,
      Math.floor(f / COLS) * CELL_H,
    );
    for (let k = 0; k < coins; k++) {
      // wrapped round the loop, so it has no seam
      const age = (ms - k * SPAWN_MS + LOOP_MS) % LOOP_MS;
      if (!bubbleAt(k, age)) continue;
      c.globalAlpha = bubble.alpha;
      c.drawImage(
        coinCanvas!,
        FRAME_X + bubble.dx - bubble.r,
        FRAME_Y + bubble.dy - bubble.r,
        bubble.r * 2,
        bubble.r * 2,
      );
    }
    baked++;
  });
}

// the bubbles rising off (x, y), floor-local; seed staggers each worker's loop
export function drawBoostBubbles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alpha: number,
  seed: number,
  now: number,
): void {
  if (!flipbook || baked < FRAMES || alpha <= 0) return;
  const ms = (now + seed * 731) % LOOP_MS;
  const f = Math.floor((ms / LOOP_MS) * FRAMES);
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * alpha;
  ctx.drawImage(
    flipbook,
    (f % COLS) * CELL_W,
    Math.floor(f / COLS) * CELL_H,
    CELL_W,
    CELL_H,
    Math.round(x - FRAME_X),
    Math.round(y - FRAME_Y),
    FRAME_W,
    FRAME_H,
  );
  ctx.globalAlpha = previous;
}
