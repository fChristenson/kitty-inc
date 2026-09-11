import { drawCartoonText } from "../../utils";
import { createParticlePool, clampedDtSince } from "../particlePool";

// a "+X"-style label that fades in, floats up, then fades back out — the one
// shared implementation for BOTH floors/incomeFloatText's per-Floor "+$X"
// Sale payout AND this module's own flat, no-Floor "+X%" minigame reward
// (same "generic particle math lives here once, each consumer keeps its own
// list/loop" split as coinBurst.ts's createCoinBurstParticles/
// updateCoinBurstParticles/drawCoinBurstFrame, reused by both floors/coins
// and coinBurst's own flat spawnCoinBurstAt)

export interface FloatingTextParticle {
  x: number;
  y: number;
  text: string;
  life: number; // ticks elapsed (~16.67ms each)
  maxLife: number;
  emphasized: boolean;
}

const FADE_IN_TICKS = 8; // ~133ms
const FLOAT_HOLD_TICKS = 30; // ~500ms fully visible before fading out
const FADE_OUT_TICKS = 22; // ~367ms
const FADE_OUT_START = FADE_IN_TICKS + FLOAT_HOLD_TICKS;
export const FLOATING_TEXT_MAX_LIFE_TICKS = FADE_OUT_START + FADE_OUT_TICKS; // ~1000ms total

export function createFloatingTextParticle(
  x: number,
  y: number,
  text: string,
  emphasized = false,
): FloatingTextParticle {
  return {
    x,
    y,
    text,
    life: 0,
    maxLife: FLOATING_TEXT_MAX_LIFE_TICKS,
    emphasized,
  };
}

// advances every particle by dt (in ~16.67ms "ticks") and prunes any that
// have died; mutates particles in place, same convention as
// coinBurst.ts's updateCoinBurstParticles
export function updateFloatingTextParticles(
  particles: FloatingTextParticle[],
  dt: number,
  risePerTick: number,
): void {
  for (const t of particles) {
    t.y -= risePerTick * dt;
    t.life += dt;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life >= particles[i].maxLife) particles.splice(i, 1);
  }
}

// draws one label at its own current (x, y) — basePx/emphasizedScale let each
// consumer pick its own size (floors/incomeFloatText's Sale payout reads much
// bigger than a minigame's own reward label)
export function drawFloatingTextParticle(
  ctx: CanvasRenderingContext2D,
  t: FloatingTextParticle,
  basePx: number,
  emphasizedScale = 1,
): void {
  ctx.save();
  const fontPx = basePx * (t.emphasized ? emphasizedScale : 1);
  ctx.font = `900 ${fontPx}px "Fredoka", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const alpha =
    t.life < FADE_IN_TICKS
      ? t.life / FADE_IN_TICKS
      : t.life > FADE_OUT_START
        ? Math.max(
            0,
            1 - (t.life - FADE_OUT_START) / (t.maxLife - FADE_OUT_START),
          )
        : 1;
  ctx.globalAlpha = alpha;
  drawCartoonText(ctx, t.text, t.x, t.y);
  ctx.restore();
}

// the flat, no-Floor consumer for minigame rewards — every active label
// lives in this one pool, ticked/drawn by drawActiveFloatingTexts below (same
// shape as coinBurst.ts's own spawnCoinBurstAt/drawActiveCoinBursts)
const FONT_PX = 16;
const TOTAL_RISE_PX = 80;
const RISE_PER_TICK = TOTAL_RISE_PX / FLOATING_TEXT_MAX_LIFE_TICKS;

const pool = createParticlePool<FloatingTextParticle>(100);
let lastActiveUpdateAt: number | null = null;

export function hasActiveFloatingTexts(): boolean {
  return pool.hasActive();
}

export function getActiveFloatingTextsCount(): number {
  return pool.count();
}

// shifts every currently-active label by dx — for a minigame whose own world
// scrolls left under a fixed head/camera, call this every step with the same
// per-frame scroll delta already applied to that game's own world elements
// (market events/platforms), so a spawned label scrolls off exactly like
// everything else instead of hovering in place while the world moves past it
export function shiftActiveFloatingTexts(dx: number): void {
  for (const t of pool.list) t.x -= dx;
}

// spawns a "+X%" label (always leading with a +, since every caller today is
// a positive reward) rising from (x, y) — whatever coordinate space the
// caller's own canvas already draws in
export function spawnFloatingText(x: number, y: number, percent: number): void {
  pool.spawn(createFloatingTextParticle(x, y, `+${percent.toFixed(2)}%`));
}

// call once per frame from the caller's own render loop, same convention as
// drawActiveCoinBursts — advances every active label by however long it's
// been since the last call, then draws them all straight onto ctx
export function drawActiveFloatingTexts(
  ctx: CanvasRenderingContext2D,
  now: number,
): void {
  if (!pool.hasActive()) {
    lastActiveUpdateAt = null;
    return;
  }
  const dt = clampedDtSince(lastActiveUpdateAt, now);
  lastActiveUpdateAt = now;
  updateFloatingTextParticles(pool.list, dt, RISE_PER_TICK);
  for (const t of pool.list) drawFloatingTextParticle(ctx, t, FONT_PX);
}
