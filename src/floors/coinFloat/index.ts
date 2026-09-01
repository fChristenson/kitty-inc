import { randomInt } from "../../utils";
import type { Floor } from "../../gameState";
import { loadThemeImage } from "../../loadAssets";

// a handful of small coins that bubble straight up from a point, gently swaying,
// and fade out — a quieter alternative to coins.ts's outward/gravity burst

let coinImage: HTMLImageElement | null = null;

export async function loadFloatingCoinImage(): Promise<HTMLImageElement> {
  coinImage = await loadThemeImage("references", "coin");
  return coinImage!;
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

const coins: FloatingCoin[] = [];
let animationFrameId: number | null = null;
let lastTick = 0;

export function hasActiveFloatingCoins(): boolean {
  return coins.length > 0;
}

// how fast an urgent coin blinks (radians/tick, matching the life-based phase
// other per-particle wobble/spin uses elsewhere in this file)
const BLINK_RATE = 0.525;

export function drawFloatingCoins(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  for (const c of coins) {
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

    if (coinImage) {
      const size = radius * 2;
      ctx.drawImage(coinImage, c.x - radius, y - radius, size, size);
    }
  }
  ctx.globalAlpha = 1;
}

function updateFloatingCoins(dt: number): void {
  for (const c of coins) {
    c.y += c.vy * dt;
    c.life += dt;
    // cone shape: each coin converges from its wide starting offset toward the
    // center as it rises, with a small sway layered on top for an organic wobble
    const t = Math.min(c.life / c.maxLife, 1);
    const coneOffset = c.startOffset * (1 - t);
    const wobble = Math.sin(c.life * 0.15 + c.wobblePhase) * 6;
    c.x = c.originX + coneOffset + wobble;
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    if (coins[i].life >= coins[i].maxLife) coins.splice(i, 1);
  }
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
    coins.push({
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

  if (animationFrameId !== null) return;
  lastTick = performance.now();
  const tick = (now: number) => {
    const dt = Math.max(0, Math.min((now - lastTick) / 16.67, 3));
    lastTick = now;
    updateFloatingCoins(dt);
    onFrame();
    animationFrameId = coins.length > 0 ? requestAnimationFrame(tick) : null;
  };
  animationFrameId = requestAnimationFrame(tick);
}
