// explosions for events, in the game's white and gold: a whole blast is
// eventFx's drawExplosion (white burst, shockwave ring, gold sparks) sized
// to the blast, and a lit bomb (a wisp) fizzes gold sparks and blinks gold
// ever faster as its fuse burns down
import { COLOR } from "../../palette";
import { drawExplosion } from "../eventFx";
import { drawGlow, fadeStops } from "../glowSprite";
import { hash01, stampGlimmer } from "../twinkle";
import { lerp } from "../easing";
import type { Point } from "../wisp";

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
