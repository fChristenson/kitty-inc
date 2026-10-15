// explosions for events, in the game's white and gold: a whole blast is
// eventFx's drawExplosion (white burst, shockwave ring, gold sparks) sized
// to the blast, and a lit bomb (a wisp) throbs white and gold ever faster as
// its fuse burns down
import { COLOR } from "../../../palette";
import { drawExplosion } from "../../eventFx";
import { drawGlow, fadeStops } from "../../glowSprite";
import { lerp } from "../../easing";
import type { Point } from "../../wisp";
import { playSpinTick } from "../../../sound";

// drawExplosion's sparks are the last of it to fade
export const DETONATION_MS = 800;
// a blast FINALE_SIZE px across matches the wisp cover's finale
const FINALE_SIZE = 230;
const FINALE_SCALE = 1.9;
const FINALE_REACH = 380;
const FINALE_SPARK = 22;
const MIN_SPARK = 8;
const BLINK = fadeStops(COLOR.heavenlyGold);
// a lit bomb throbs IDLE_HZ a second plus PULSES more over its burn, so the
// beats quicken as it burns down (phase from burn: no jumps as the rate rises)
const IDLE_HZ = 2.5;
const PULSES = 4;
const CORE = fadeStops(COLOR.white, 0.35);

// a blast `size` px across, ms after it went off at `at`: the game's own
// white burst and gold sparks; draws nothing outside its DETONATION_MS
export function drawDetonation(
  ctx: CanvasRenderingContext2D,
  at: Point,
  ms: number,
  size: number,
  now: number,
): void {
  if (ms < 0 || ms >= DETONATION_MS) return;
  const k = size / FINALE_SIZE;
  drawExplosion(
    ctx,
    at.x,
    at.y,
    ms,
    now,
    FINALE_SCALE * k,
    FINALE_REACH * k,
    Math.max(MIN_SPARK, FINALE_SPARK * k),
  );
}

// a lit bomb at `at` (draw its wisp over it): a gold glow of `size` and a
// white core throbbing, quicker, bigger and brighter as `burn` runs 0..1
// down to the blast
export function drawLitFuse(
  ctx: CanvasRenderingContext2D,
  at: Point,
  burn: number,
  size: number,
  now: number,
): void {
  const b = Math.min(1, Math.max(0, burn));
  const phase = (now / 1000) * IDLE_HZ + PULSES * b * b;
  const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  const beat = wave * wave;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = (0.45 + 0.55 * beat) * (0.5 + 0.5 * b);
  drawGlow(ctx, BLINK, at.x, at.y, size * (0.9 + (0.5 + 0.6 * b) * beat));
  ctx.globalAlpha = beat;
  drawGlow(
    ctx,
    CORE,
    at.x,
    at.y,
    size * 0.5 * (0.7 + 0.6 * beat) * (1 + 0.3 * b),
  );
  ctx.restore();
}

// a time bomb: a ball of light throbbing at every beep, each a tick and a
// jolt, the beeps closing up, the bomb trembling and swelling, until it
// blows. Plan it with
// planTimeBomb, tick it every frame (tickTimeBomb: true the frame it blows)
// and draw it with drawTimeBomb, then drawDetonation from its blowMs
export interface TimeBomb {
  startMs: number;
  blowMs: number;
  // when each beep goes, closing up
  beeps: number[];
  beeped: number;
  blown: boolean;
}

// beeps from `beeps` beeps over fuseMs, each gap CLOSE of the one before
export function planTimeBomb(
  startMs: number,
  fuseMs: number,
  beeps = 12,
): TimeBomb {
  const times: number[] = [];
  for (let k = 0; k < beeps; k++)
    times.push(startMs + fuseMs * (1 - (1 - k / beeps) ** BEEP_CLOSE));
  return {
    startMs,
    blowMs: startMs + fuseMs,
    beeps: times,
    beeped: 0,
    blown: false,
  };
}

// the beeps due by ms, each a tick and a jolt through `shake`, harder as
// it runs down; true on the frame it blows (the caller's blast and bang)
export function tickTimeBomb(
  bomb: TimeBomb,
  ms: number,
  shake: (intensity: number) => void,
): boolean {
  while (bomb.beeped < bomb.beeps.length && ms >= bomb.beeps[bomb.beeped]) {
    const u = bomb.beeped / Math.max(1, bomb.beeps.length - 1);
    playSpinTick(1 + u);
    shake(lerp(BEEP_SHAKE, u));
    bomb.beeped++;
  }
  if (bomb.blown || ms < bomb.blowMs) return false;
  bomb.blown = true;
  return true;
}

const BEEP_SHAKE: [number, number] = [0.15, 0.7];
const BEEP_CLOSE = 1.8;
const BEEP_FLASH_MS = 130;
const SWELL = 0.35;
const BEEP_PULSE = 0.45;
const TREMBLE = 0.12;

// the bomb at `at`, `size` px round, ms into its countdown: a throb at every
// beep, trembling and swelling
export function drawTimeBomb(
  ctx: CanvasRenderingContext2D,
  bomb: TimeBomb,
  at: Point,
  ms: number,
  _now: number,
  size: number,
): void {
  if (ms < bomb.startMs || ms >= bomb.blowMs) return;
  const u = (ms - bomb.startMs) / (bomb.blowMs - bomb.startMs);
  const shiver = size * TREMBLE * u * u;
  const x = at.x + Math.sin(ms * (0.7 + u)) * shiver;
  const y = at.y + Math.cos(ms * (0.9 + u)) * shiver;
  // the throb of the last beep
  let since = Infinity;
  for (let k = bomb.beeps.length - 1; k >= 0; k--)
    if (bomb.beeps[k] <= ms) {
      since = ms - bomb.beeps[k];
      break;
    }
  const flash = Math.max(0, 1 - since / BEEP_FLASH_MS);
  const r = size * (1 + SWELL * u * u) * (1 + BEEP_PULSE * flash * flash);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.5 + 0.5 * flash;
  drawGlow(ctx, BLINK, x, y, r * (1.3 + 0.6 * flash));
  ctx.globalAlpha = 1;
  drawGlow(ctx, CORE, x, y, r * (0.55 + 0.25 * flash));
  ctx.restore();
}
