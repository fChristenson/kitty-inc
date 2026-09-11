import type { Floor } from "../../gameState";
import {
  type FloatingTextParticle,
  FLOATING_TEXT_MAX_LIFE_TICKS,
  createFloatingTextParticle,
  updateFloatingTextParticles,
  drawFloatingTextParticle,
} from "../../shared/floatingText";
import { createParticlePool } from "../../shared/particlePool";

// a single "+$X"-style label that fades in, floats straight up, then fades back
// out — spawned on the income bar for a "Sale" boost click (see
// floorInteractions/index.ts), a readable alternative to coins/coinFloat's
// particles for a number that actually needs to be read, not just felt.
// Per-Floor filtering + this module's own rAF loop are the only things NOT
// shared with shared/floatingText's own flat minigame-reward consumer — the
// actual rise/fade math lives there once, reused here (see repo notes on
// coinBurst.ts's Floor-anchored/flat split for why this shape)

interface FloatingIncomeText extends FloatingTextParticle {
  floor: Floor;
}

const pool = createParticlePool<FloatingIncomeText>(100);

// total distance it rises over its whole lifetime, spread evenly per tick
const TOTAL_RISE_PX = 100;
const RISE_PER_TICK = TOTAL_RISE_PX / FLOATING_TEXT_MAX_LIFE_TICKS;
// starts this far above whatever spawn point it's given, so it doesn't spawn
// buried inside the upgrade button itself
const SPAWN_Y_OFFSET = 100;
const BASE_FONT_PX = 60;
const EMPHASIZED_SCALE = 1.5; // crit payouts render this much bigger than normal

export function drawIncomeFloatText(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  for (const t of pool.list) {
    if (t.floor !== floor) continue;
    drawFloatingTextParticle(ctx, t, BASE_FONT_PX, EMPHASIZED_SCALE);
  }
}

// spawns "+text" rising from (x, y) — floor-local coordinates — and drives its own
// rAF loop until every active label has fully faded, same self-contained pattern
// coinFloat/index.ts's spawnFloatingCoins uses. `emphasized` renders it
// EMPHASIZED_SCALE bigger, for a crit's payout
export function spawnIncomeFloatText(
  floor: Floor,
  x: number,
  y: number,
  text: string,
  emphasized = false,
): void {
  pool.spawn({
    ...createFloatingTextParticle(x, y - SPAWN_Y_OFFSET, text, emphasized),
    floor,
  });

  pool.ensureTicking((dt) => {
    updateFloatingTextParticles(pool.list, dt, RISE_PER_TICK);
  });
}
