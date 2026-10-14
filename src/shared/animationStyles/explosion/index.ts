// explosions for events, in the game's white and gold: a whole blast is
// eventFx's drawExplosion (white burst, shockwave ring, gold sparks) sized
// to the blast, and a lit bomb (a wisp) fizzes gold sparks and blinks gold
// ever faster as its fuse burns down
import { COLOR } from "../../../palette";
import { drawExplosion } from "../../eventFx";
import { drawGlow, fadeStops } from "../../glowSprite";
import { hash01, stampGlimmer } from "../../twinkle";
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
// a lit fuse spits FUSE_SPARKS sparks (more as it burns down), each living
// FUSE_SPARK_MS and flying FUSE_REACH px
const FUSE_SPARKS: [number, number] = [4, 16];
const FUSE_SPARK_MS = 240;
const FUSE_REACH = 46;
const FUSE_SPARK = 9;
// its glow blinks BLINK_HZ times a second, quickening
const BLINK_HZ: [number, number] = [2, 12];

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

// a lit bomb's fuse fizzing at `at` (draw its wisp over it): gold sparks
// sputtering out and a gold glow of `size` blinking, both wilder as `burn`
// runs 0..1 down to the blast
export function drawLitFuse(
  ctx: CanvasRenderingContext2D,
  at: Point,
  burn: number,
  size: number,
  now: number,
): void {
  const b = Math.min(1, Math.max(0, burn));
  const hz = lerp(BLINK_HZ, b * b);
  const blink = 0.5 + 0.5 * Math.sin((now / 1000) * hz * Math.PI * 2);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = blink * (0.35 + 0.65 * b);
  drawGlow(ctx, BLINK, at.x, at.y, size * (1 + 0.4 * b));
  ctx.globalAlpha = 1;
  const count = Math.round(lerp(FUSE_SPARKS, b));
  for (let i = 0; i < count; i++) {
    const clock = now + hash01(i, 7) * FUSE_SPARK_MS;
    const life = Math.floor(clock / FUSE_SPARK_MS);
    const t = (clock % FUSE_SPARK_MS) / FUSE_SPARK_MS;
    // mostly upward, like a fuse spitting off the top of the bomb
    const angle = -Math.PI / 2 + (hash01(life, i) - 0.5) * Math.PI * 1.4;
    const out = FUSE_REACH * (0.5 + 0.5 * hash01(i, life)) * t * (2 - t);
    stampGlimmer(
      ctx,
      at.x + Math.cos(angle) * out,
      at.y - size * 0.3 + Math.sin(angle) * out + FUSE_REACH * 0.6 * t * t,
      FUSE_SPARK * (1 - t),
      angle,
      i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
    );
  }
  ctx.restore();
}

// a time bomb: a bomb wisp ringed by a dial of pips of light that go out one
// by one as it counts down, every beep a flash, a tick and a jolt, the beeps
// closing up, the bomb trembling and swelling, until it blows. Plan it with
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
const PIPS = 12;
const DIAL = 1.15;
const PIP = 0.2;
const BEEP_FLASH_MS = 130;
const SWELL = 0.35;
const TREMBLE = 0.12;
const CORE = fadeStops(COLOR.white, 0.35);
const fuseAt: Point = { x: 0, y: 0 };

// the bomb at `at`, `size` px round, ms into its countdown: its dial of pips
// going out, a flash at every beep, fuse sparks, trembling and swelling
export function drawTimeBomb(
  ctx: CanvasRenderingContext2D,
  bomb: TimeBomb,
  at: Point,
  ms: number,
  now: number,
  size: number,
): void {
  if (ms < bomb.startMs || ms >= bomb.blowMs) return;
  const u = (ms - bomb.startMs) / (bomb.blowMs - bomb.startMs);
  const shiver = size * TREMBLE * u * u;
  const x = at.x + Math.sin(ms * (0.7 + u)) * shiver;
  const y = at.y + Math.cos(ms * (0.9 + u)) * shiver;
  const r = size * (1 + SWELL * u * u);
  // the flash of the last beep
  let since = Infinity;
  for (let k = bomb.beeps.length - 1; k >= 0; k--)
    if (bomb.beeps[k] <= ms) {
      since = ms - bomb.beeps[k];
      break;
    }
  const flash = Math.max(0, 1 - since / BEEP_FLASH_MS);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.5 + 0.5 * flash;
  drawGlow(ctx, BLINK, x, y, r * (1.3 + 0.6 * flash));
  ctx.globalAlpha = 1;
  drawGlow(ctx, CORE, x, y, r * 0.55);
  // the dial: the pips still lit, the next to go blinking
  const left = PIPS * (1 - u);
  const blink = 0.5 + 0.5 * Math.sin(now * 0.03);
  for (let i = 0; i < PIPS; i++) {
    if (i >= Math.ceil(left)) continue;
    const a = -Math.PI / 2 + (i / PIPS) * Math.PI * 2;
    const last = i === Math.ceil(left) - 1;
    stampGlimmer(
      ctx,
      x + Math.cos(a) * r * DIAL,
      y + Math.sin(a) * r * DIAL,
      r * PIP * (last ? 0.6 + 0.6 * blink : 1),
      i,
      last || flash > 0.5 ? COLOR.white : COLOR.heavenlyGold,
    );
  }
  ctx.restore();
  fuseAt.x = x;
  fuseAt.y = y - r * 0.8;
  drawLitFuse(ctx, fuseAt, u, size * 0.5, now);
}
