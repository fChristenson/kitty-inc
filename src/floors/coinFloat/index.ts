import { randomInt } from "../../utils";
import type { Floor } from "../../gameState";
import { loadImageByName } from "../../loadAssets";
import { createParticlePool } from "../../shared/particlePool";

// a handful of small coins that bubble straight up from a point, gently swaying,
// and fade out — a quieter alternative to coins.ts's outward/gravity burst

// coin.png is kept at its full AI-generated resolution (~700x700) so
// process-pwa-icons.mjs can still generate a crisp 512px PWA icon from it —
// but these bubbles only ever render at a ~48px max diameter, so drawing the
// full-res source every animation frame would resample it down from scratch
// on every single frame. Downscaled once here onto an offscreen canvas sized
// with generous headroom for high-DPI screens, then THAT small canvas is what
// every frame actually draws
const COIN_CANVAS_SIZE = 160;
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
  return image;
}

interface FloatingCoin {
  floor: Floor; // which floor's canvas these coins belong to
  x: number;
  originX: number; // fixed horizontal spawn point; x is computed from this each frame
  startOffset: number; // how far out this coin starts, at the wide base of the cone
  y: number; // floor-local y
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  wobblePhase: number;
  // 0-1, how close the boost that spawned this coin was to expiring (see
  // gameState.ts's BOOST_URGENT_THRESHOLD_MS) — scales how hard it blinks instead
  // of just fading; 0 means no blink at all
  blinkIntensity: number;
}

const pool = createParticlePool<FloatingCoin>(200);

export function hasActiveFloatingCoins(): boolean {
  return pool.hasActive();
}

export function getActiveFloatingCoinsCount(): number {
  return pool.count();
}

// how fast an urgent coin blinks (radians/tick, matching the life-based phase
// other per-particle wobble/spin uses elsewhere in this file)
const BLINK_RATE = 0.525;

export function drawFloatingCoins(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  for (const c of pool.list) {
    if (c.floor !== floor) continue;
    const y = c.y;
    const t = c.life / c.maxLife;
    const radius = c.size * (1 - t * 0.3);
    // urgent coins blink on top of the normal fade-out instead of just fading
    // smoothly like a routine collection; blinkIntensity scales the swing's
    // amplitude, so the blink gets more dramatic the closer the boost was to
    // running out (0 = steady, 1 = alpha swings all the way down to ~0.15)
    const blinkAmplitude = 0.425 * c.blinkIntensity;
    const blinkFactor =
      blinkAmplitude > 0
        ? 1 - blinkAmplitude + blinkAmplitude * Math.sin(c.life * BLINK_RATE)
        : 1;
    ctx.globalAlpha = Math.max(0, 1 - t) * blinkFactor;

    if (coinCanvas) {
      const size = radius * 2;
      ctx.drawImage(coinCanvas, c.x - radius, y - radius, size, size);
    }
  }
  ctx.globalAlpha = 1;
}

function advanceFloatingCoin(c: FloatingCoin, dt: number): void {
  c.y += c.vy * dt;
  c.life += dt;
  // cone shape: each coin converges from its wide starting offset toward the
  // center as it rises, with a small sway layered on top for an organic wobble
  const t = Math.min(c.life / c.maxLife, 1);
  const coneOffset = c.startOffset * (1 - t);
  const wobble = Math.sin(c.life * 0.15 + c.wobblePhase) * 6;
  c.x = c.originX + coneOffset + wobble;
}

// spawns a few coins that bubble up from (x, y) — floor-local coordinates — and
// disappear; drives its own rAF loop, calling onFrame after each physics step.
// `blinkIntensity` (0-1) marks them as spawned for a worker whose boost is close
// to expiring, scaling how hard they blink (see FloatingCoin.blinkIntensity)
export function spawnFloatingCoins(
  floor: Floor,
  x: number,
  y: number,
  onFrame: () => void,
  blinkIntensity = 0,
): void {
  const count = randomInt(2, 4);
  const spacing = 22; // gap between each coin's starting column, i.e. the cone's base width
  for (let i = 0; i < count; i++) {
    const startOffset =
      (i - (count - 1) / 2) * spacing + (Math.random() - 0.5) * 15;
    pool.spawn({
      floor,
      x: x + startOffset,
      originX: x,
      startOffset,
      y: y + (Math.random() - 0.5) * 20,
      vy: -(0.6 + Math.random() * 0.6),
      life: 0,
      maxLife: 110 + Math.random() * 40,
      size: 16 + Math.random() * 8,
      wobblePhase: Math.random() * Math.PI * 2,
      blinkIntensity,
    });
  }

  pool.ensureTicking((dt) => {
    pool.update(dt, advanceFloatingCoin);
    onFrame();
  });
}
