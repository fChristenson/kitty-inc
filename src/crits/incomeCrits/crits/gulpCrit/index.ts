// the gulp income crit: the number blows apart into hundreds of glitter bits
// flung all over the screen; a gravity hole opens under the total and
// swallows them in brisk gulps, nearest first, each a swoosh, a jolt and a
// spurt of blasts up into the readout; the last gulp takes the hole with it
// in the huge blast
import { COLOR } from "../../../../palette";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawGravityHole } from "../../../../shared/clutter";
import { stampGlimmer } from "../../../../shared/twinkle";
import { smoothstep } from "../../../../shared/easing";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const FLING_MS = 220;
const BITS = 420;
const COLS = 14;
const OPEN_MS = FLING_MS + 40;
const GROW_MS = 120;
const GULPS = 5;
const GAPS_MS = [230, 200, 170, 140];
const STAGGER_MS = 70;
const PULL_MS = 340;
// before its gulp a bit leans this share of the way towards the hole, trembling
const LEAN_MS = 220;
const LEAN = 0.12;
const TREMBLE = 6;
const TREMBLE_RATE = 0.09;
const SPURTS = 3;
const SPURT_EVERY_MS = 45;
// the bits' spread: off the screen's sides, and from under the hole down
const EDGE = 50;
const BITS_FROM = 190;
const JITTER = 0.8;
// the hole: under the total, its size, how it swells on a gulp and grows
const HOLE_DOWN = 160;
const HOLE = 160;
const GULP_SWELL = 0.4;
const SWELL_MS = 90;
const HOLE_GROWTH_MS = 2000;
// laps round the hole on the way in, the streak trailing a pulled bit (as
// shares of its pull) and how small it is by the time it's swallowed
const SWIRL = 4;
const TRAIL = [0.05, 0.1];
const TRAIL_SIZE = [0.75, 0.5];
const SWALLOWED = 0.35;
const BIT = 26;
const TWINKLE = 0.004;
const OPEN_BLAST = 300;
const SPURT_BLAST = 150;
const GULP_SHAKE = 1.2;
// shakes by step: a spurt, the last gulp
const SHAKES = [0.6, 2.4];

interface Gulp {
  hole: Point;
  // each bit's spot, packed x, y
  spots: Float32Array;
  pullAt: Float32Array;
  gulpAt: number[];
  spurts: Point[];
  spurtAt: number[];
  endAt: number;
}
const gulps = new WeakMap<Running, Gulp>();
const origin: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };

// a bit u (0..1) of the way through its pull, from (dx, dy) off the hole:
// spiralling in, faster and faster
function pulled(hole: Point, dx: number, dy: number, u: number): Point {
  const a = u * u * SWIRL;
  const s = 1 - u * u;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  bit.x = hole.x + (dx * cos - dy * sin) * s;
  bit.y = hole.y + (dx * sin + dy * cos) * s;
  return bit;
}

function planGulp(to: Point, viewportWidth: number): Gulp {
  const hole = { x: to.x, y: to.y + HOLE_DOWN };
  const left = -viewportWidth / 2 + EDGE;
  const right = viewportWidth / 2 - EDGE;
  const top = to.y + BITS_FROM;
  // the screen's bottom sits as far under its middle as its top is over it
  const bottom = -to.y;
  const rows = Math.ceil(BITS / COLS);
  const spots = new Float32Array(BITS * 2);
  const order: { i: number; d: number }[] = [];
  for (let i = 0; i < BITS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = lerp(
      left,
      right,
      (col + 0.5 + (holeHash(i, 111) - 0.5) * JITTER) / COLS,
    );
    const y = lerp(
      top,
      bottom,
      (row + 0.5 + (holeHash(i, 112) - 0.5) * JITTER) / rows,
    );
    spots[i * 2] = x;
    spots[i * 2 + 1] = y;
    order.push({ i, d: Math.hypot(x - hole.x, y - hole.y) });
  }
  order.sort((a, b) => a.d - b.d);
  const gulpAt = [OPEN_MS + GROW_MS + 80];
  for (const gap of GAPS_MS) gulpAt.push(gulpAt[gulpAt.length - 1] + gap);
  const pullAt = new Float32Array(BITS);
  const perGulp = BITS / GULPS;
  order.forEach(({ i }, rank) => {
    const k = Math.floor(rank / perGulp);
    pullAt[i] = gulpAt[k] + ((rank - k * perGulp) / perGulp) * STAGGER_MS;
  });
  const landAt = (k: number) => gulpAt[k] + STAGGER_MS + PULL_MS;
  const spurts: Point[] = [];
  const spurtAt: number[] = [];
  for (let k = 0; k < GULPS - 1; k++)
    for (let j = 0; j < SPURTS; j++) {
      spurts.push(readoutSpot(to, k * SPURTS + j, 113));
      spurtAt.push(landAt(k) + j * SPURT_EVERY_MS);
    }
  return {
    hole,
    spots,
    pullAt,
    gulpAt,
    spurts,
    spurtAt,
    endAt: landAt(GULPS - 1),
  };
}

registerFloorCrit("gulpCrit", {
  plan(r, bars, hit) {
    const gulp = planGulp(bars[0], r.viewportWidth);
    gulps.set(r, gulp);
    for (const at of gulp.spurtAt) hit(0, at);
    hit(0, gulp.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const gulp = gulps.get(r);
    if (!gulp) return;
    const now = r.startedAt + ms;
    const { hole, spots, pullAt, gulpAt, endAt } = gulp;
    drawNumberShrink(ctx, r, ms);
    drawDetonation(ctx, origin, ms, OPEN_BLAST, now);
    // a swoosh and a jolt on every gulp
    while (r.kicked < gulpAt.length && ms >= gulpAt[r.kicked]) {
      r.kicked++;
      r.shake(GULP_SHAKE);
      playSwoosh();
    }
    if (ms >= OPEN_MS && ms < endAt) {
      let swell = 1;
      for (let k = 0; k < gulpAt.length; k++)
        if (ms >= gulpAt[k])
          swell = Math.max(
            swell,
            1 + GULP_SWELL * Math.exp(-(ms - gulpAt[k]) / SWELL_MS),
          );
      const size =
        HOLE *
        clamp01((ms - OPEN_MS) / GROW_MS) *
        swell *
        (1 + (ms - OPEN_MS) / HOLE_GROWTH_MS);
      ctx.save();
      drawGravityHole(ctx, hole, size, 1, ms, now);
      ctx.restore();
    }
    if (ms < endAt) {
      const fling = 1 - (1 - clamp01(ms / FLING_MS)) ** 3;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < BITS; i++) {
        const sx = spots[i * 2];
        const sy = spots[i * 2 + 1];
        const pull = pullAt[i];
        const color = i % 3 ? COLOR.heavenlyGold : COLOR.white;
        const spin = i + ms * TWINKLE;
        if (ms < pull) {
          // leaning towards the hole and trembling as its gulp nears
          const lean =
            LEAN * smoothstep(clamp01((ms - pull + LEAN_MS) / LEAN_MS));
          const tremble =
            lean > 0 ? Math.sin(ms * TREMBLE_RATE + i) * TREMBLE : 0;
          stampGlimmer(
            ctx,
            lerp(sx * fling, hole.x, lean) + tremble,
            lerp(sy * fling, hole.y, lean),
            BIT,
            spin,
            color,
          );
          continue;
        }
        const u = (ms - pull) / PULL_MS;
        if (u >= 1) continue;
        const dx = (sx - hole.x) * (1 - LEAN);
        const dy = (sy - hole.y) * (1 - LEAN);
        const size = BIT * lerp(1, SWALLOWED, u * u);
        // a streak dragged out behind it, then the bit itself, white-hot
        for (let j = TRAIL.length - 1; j >= 0; j--) {
          if (u < TRAIL[j]) continue;
          const p = pulled(hole, dx, dy, u - TRAIL[j]);
          stampGlimmer(ctx, p.x, p.y, size * TRAIL_SIZE[j], spin, color);
        }
        const p = pulled(hole, dx, dy, u);
        stampGlimmer(ctx, p.x, p.y, size, spin, u > 0.5 ? COLOR.white : color);
      }
      ctx.restore();
    }
    const { spurts, spurtAt } = gulp;
    for (let k = 0; k < spurts.length; k++)
      drawDetonation(ctx, spurts[k], ms - spurtAt[k], SPURT_BLAST, now);
    drawFinale(ctx, bars[0], ms - endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
