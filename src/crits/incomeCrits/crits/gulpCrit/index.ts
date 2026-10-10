// the gulp income crit: the number blows apart into hundreds of glitter bits
// flung all over the screen; a gravity hole opens under the total and
// swallows them in brisk gulps, nearest first, each a swoosh, a jolt and a
// spurt of blasts up into the readout; the last gulp takes the hole with it
// in the huge blast
import { COLOR } from "../../../../palette";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawGravityHole } from "../../../../shared/clutter";
import { stampGlimmer } from "../../../../shared/twinkle";
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
const PULL_MS = 200;
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
const SWIRL = 2.2;
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
        let x: number;
        let y: number;
        if (ms < pull) {
          x = sx * fling;
          y = sy * fling;
        } else {
          const u = (ms - pull) / PULL_MS;
          if (u >= 1) continue;
          // swirling in, faster and faster
          const dx = sx - hole.x;
          const dy = sy - hole.y;
          const a = u * u * SWIRL;
          const s = 1 - u * u;
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          x = hole.x + (dx * cos - dy * sin) * s;
          y = hole.y + (dx * sin + dy * cos) * s;
        }
        stampGlimmer(
          ctx,
          x,
          y,
          BIT,
          i + ms * TWINKLE,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
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
