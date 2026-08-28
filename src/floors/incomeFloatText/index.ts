import { drawCartoonText } from "../../utils";
import type { Floor } from "../../gameState";

// a single "+$X"-style label that fades in, floats straight up, then fades back
// out — spawned on the income bar for a "Sale" boost click (see
// floorInteractions/index.ts), a readable alternative to coins/coinFloat's
// particles for a number that actually needs to be read, not just felt

interface FloatingIncomeText {
  floor: Floor;
  x: number;
  y: number; // floor-local; rises from here each tick
  text: string;
  life: number; // ticks elapsed (~16.67ms each, see spawnIncomeFloatText's tick)
  maxLife: number;
  emphasized: boolean; // crit payouts render EMPHASIZED_SCALE bigger than normal
}

const texts: FloatingIncomeText[] = [];
let animationFrameId: number | null = null;
let lastTick = 0;

const FADE_IN_TICKS = 8; // ~133ms
const FLOAT_HOLD_TICKS = 30; // ~500ms fully visible before fading out
const FADE_OUT_TICKS = 22; // ~367ms
const FADE_OUT_START = FADE_IN_TICKS + FLOAT_HOLD_TICKS;
const MAX_LIFE_TICKS = FADE_OUT_START + FADE_OUT_TICKS; // ~1000ms total
// total distance it rises over its whole lifetime, spread evenly per tick
const TOTAL_RISE_PX = 100;
const RISE_PER_TICK = TOTAL_RISE_PX / MAX_LIFE_TICKS;
// starts this far above whatever spawn point it's given, so it doesn't spawn
// buried inside the upgrade button itself
const SPAWN_Y_OFFSET = 100;
const BASE_FONT_PX = 60;
const EMPHASIZED_SCALE = 1.5;

export function drawIncomeFloatText(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const t of texts) {
    if (t.floor !== floor) continue;
    ctx.save();
    const fontPx = BASE_FONT_PX * (t.emphasized ? EMPHASIZED_SCALE : 1);
    ctx.font = `900 ${fontPx}px "Fredoka", system-ui, sans-serif`;
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
}

function updateIncomeFloatText(dt: number): void {
  for (const t of texts) {
    t.y -= RISE_PER_TICK * dt;
    t.life += dt;
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    if (texts[i].life >= texts[i].maxLife) texts.splice(i, 1);
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
  texts.push({
    floor,
    x,
    y: y - SPAWN_Y_OFFSET,
    text,
    life: 0,
    maxLife: MAX_LIFE_TICKS,
    emphasized,
  });

  if (animationFrameId !== null) return;
  lastTick = performance.now();
  const tick = (now: number) => {
    const dt = Math.max(0, Math.min((now - lastTick) / 16.67, 3));
    lastTick = now;
    updateIncomeFloatText(dt);
    animationFrameId = texts.length > 0 ? requestAnimationFrame(tick) : null;
  };
  animationFrameId = requestAnimationFrame(tick);
}
