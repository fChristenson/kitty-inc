// a lightning arc for events: a jagged channel of lightning from a source to
// a target that re-strikes in a new shape every FLICKER_MS, flickering in
// brightness, with a thinner second strand, short forks and specks of light
// spitting off it; it can fire, its head racing from the source onto the
// target. Drawn with ../beam's sections and glimmer stamps: call it inside a
// light batch (beginLightBatch on a "lighter" ctx) at the caller
import { COLOR } from "../../palette";
import { drawBeam } from "../beam";
import { hash01, stampGlimmer } from "../twinkle";
import type { Point } from "../wisp";

// the main strand's points (2^LEVELS segments) and the second's (half as many)
const LEVELS = 3;
const SEGMENTS = 1 << LEVELS;
const WIDTH = 22;
// each halving of a segment kinks its middle up to ROUGH of the arc's length
// times the segment's share, so it's jagged at every scale
const ROUGH = 0.32;
// a strike's bow, up to BOW of its length either way
const BOW = 0.12;
const STRAND_WIDTH = 0.4;
const STRAND_ALPHA = 0.6;
const FLICKER_MS = 40;
// a strike's brightness, and the odd dim one between
const BRIGHT: [number, number] = [0.75, 1];
const DIM_CHANCE = 0.15;
const DIM = 0.4;
const FORKS = 2;
const FORK_SEGMENTS = 3;
const FORK_REACH = 0.12;
const FORK_WIDTH = 0.35;
// specks spat off each strike, flying SPECK_SPEED px a ms for SPECK_MS
const SPECKS = 3;
const SPECK = 12;
const SPECK_MS = 160;
const SPECK_SPEED: [number, number] = [0.25, 0.7];

const xs = new Float64Array(SEGMENTS + 1);
const ys = new Float64Array(SEGMENTS + 1);
const a: Point = { x: 0, y: 0 };
const b: Point = { x: 0, y: 0 };

// a jagged run from `from` along (dx, dy) in `count` segments (a power of
// two, at most SEGMENTS) into xs/ys, its kinks set by key
function strike(
  from: Point,
  dx: number,
  dy: number,
  count: number,
  bow: number,
  key: number,
): void {
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  xs[0] = from.x;
  ys[0] = from.y;
  xs[count] = from.x + dx;
  ys[count] = from.y + dy;
  for (let step = count; step >= 2; step >>= 1) {
    const half = step >> 1;
    const amp = length * ROUGH * (step / SEGMENTS);
    for (let i = half; i < count; i += step) {
      const off = (hash01(i + key * 0.37, key) * 2 - 1) * amp;
      xs[i] = (xs[i - half] + xs[i + half]) / 2 + nx * off;
      ys[i] = (ys[i - half] + ys[i + half]) / 2 + ny * off;
    }
  }
  if (bow)
    for (let i = 1; i < count; i++) {
      const pinch = Math.sin((Math.PI * i) / count) * bow * length;
      xs[i] += nx * pinch;
      ys[i] += ny * pinch;
    }
}

function drawRun(
  ctx: CanvasRenderingContext2D,
  count: number,
  width: number,
  alpha: number,
): void {
  for (let i = 1; i <= count; i++) {
    a.x = xs[i - 1];
    a.y = ys[i - 1];
    b.x = xs[i];
    b.y = ys[i];
    drawBeam(ctx, a, b, width, alpha);
  }
}

// the arc from `from` to `to`, `scale` as thick as usual, at alpha; `reach`
// (0..1) of the way there while it fires; `seed` sets its strikes apart from
// other arcs'
export function drawLightningArc(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  alpha = 1,
  scale = 1,
  now = performance.now(),
  seed = 0,
  reach = 1,
): void {
  if (alpha <= 0 || reach <= 0) return;
  const dx = (to.x - from.x) * reach;
  const dy = (to.y - from.y) * reach;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  const tick = Math.floor(now / FLICKER_MS);
  const key = tick * 7.13 + seed * 101.7;
  const width = WIDTH * scale;
  const flicker =
    hash01(key, 3) < DIM_CHANCE
      ? DIM
      : BRIGHT[0] + (BRIGHT[1] - BRIGHT[0]) * hash01(key, 4);
  const shine = alpha * flicker;
  const bow = (hash01(key, 5) * 2 - 1) * BOW;

  // the second, thinner strand, then the main one over it
  strike(from, dx, dy, SEGMENTS >> 1, -bow, key + 0.5);
  drawRun(ctx, SEGMENTS >> 1, width * STRAND_WIDTH, shine * STRAND_ALPHA);
  strike(from, dx, dy, SEGMENTS, bow, key);
  drawRun(ctx, SEGMENTS, width, shine);

  // short forks off the main strand
  const heading = Math.atan2(dy, dx);
  const step = (length * FORK_REACH) / FORK_SEGMENTS;
  for (let f = 0; f < FORKS; f++) {
    const k = 2 + Math.floor(hash01(key + f, 6) * (SEGMENTS - 4));
    const turn =
      (hash01(key + f, 7) < 0.5 ? -1 : 1) * (0.4 + 0.5 * hash01(key + f, 8));
    b.x = xs[k];
    b.y = ys[k];
    for (let j = 1; j <= FORK_SEGMENTS; j++) {
      a.x = b.x;
      a.y = b.y;
      const angle = heading + turn + (hash01(key + f * 5 + j, 9) - 0.5) * 0.9;
      b.x = a.x + Math.cos(angle) * step;
      b.y = a.y + Math.sin(angle) * step;
      drawBeam(ctx, a, b, width * FORK_WIDTH, shine);
    }
  }

  // specks spat off the last few strikes, flying out and dying away
  const ticks = Math.ceil(SPECK_MS / FLICKER_MS);
  for (let t = tick - ticks + 1; t <= tick; t++) {
    const age = now - t * FLICKER_MS;
    const life = 1 - age / SPECK_MS;
    if (life <= 0) continue;
    const speckKey = t * 7.13 + seed * 101.7;
    for (let s = 0; s < SPECKS; s++) {
      const i = 1 + Math.floor(hash01(speckKey + s, 10) * (SEGMENTS - 1));
      const angle = hash01(speckKey + s, 11) * Math.PI * 2;
      const speed =
        (SPECK_SPEED[0] +
          (SPECK_SPEED[1] - SPECK_SPEED[0]) * hash01(speckKey + s, 12)) *
        scale;
      stampGlimmer(
        ctx,
        xs[i] + Math.cos(angle) * speed * age,
        ys[i] + Math.sin(angle) * speed * age,
        SPECK * scale * life,
        speckKey + s,
        s % 2 ? COLOR.white : COLOR.heavenlyGold,
      );
    }
  }
}
