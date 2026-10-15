// Bumper Ring, an income crit: a studded pinball-bumper ring of light pops up
// round the total and the number shoots up into it as a ball, ricocheting off
// its inner wall chord to chord straight through the readout (every crossing
// a share), each strike a bumper flash, a ding and a jolt, quicker every bump
// and lighting the studs one by one; a second ball splits off, then a third,
// the bounces crowding, until the ring snaps shut and packs them all into the
// readout in the huge blast
import { COLOR } from "../../../../palette";
import {
  drawBounceSplash,
  ricochetThrough,
  SPLASH_MS,
  type Bounce,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import { DETONATION_MS } from "../../../../shared/animationStyles/explosion";
import {
  clamp01,
  easeIn,
  easeOutBack,
  type Range,
} from "../../../../shared/easing";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSpinTick } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink } from "../shared";

// the ring's radii round the readout, popping up over RING_IN_MS
const RX = 360;
const RY = 210;
const RING_IN_MS = 160;
const BALL_FROM_MS = 100;
// the ring snapping shut, packing the balls into PACKED of its size
const SHRINK_AT = 1450;
const SHRINK_MS = 170;
const END = SHRINK_AT + SHRINK_MS;
const PACKED = 0.06;
// how far past straight across (rad) each bounce turns: every chord runs
// close by the readout's middle
const SKEW = 0.45;
const MIN_SKEW = 0.12;
const SPLIT_SKEW: Range = [0.25, 0.45];
// each ball's legs, quickening across its run; ball b splits off ball b-1's
// strike SPLIT_AT[b]
const LEG_MS: Range[] = [
  [170, 70],
  [120, 55],
  [95, 45],
];
const SPLIT_AT = [0, 2, 2];
const BALL = WISP_SIZE * 1.3;
const STUDS = 18;
const STUD = 20;
const STUD_GLIMMER = 34;
const FLARE_MS = 160;
const RING_GLOW = 26;
const RING_CORE = 6;
// the ring's jolt on a strike, and its tremble into the climax
const JOLT = 0.05;
const JOLT_MS = 90;
const TREMBLE = 7;
const TREMBLE_MS = 300;
const CROSS = 120;
const CROSS_GLIMMER = 60;
const CROSS_MS = 150;
const SPLASH = 150;
const SPLIT_POP = 170;
const SPLIT_MS = 200;
const DING_RISE = 1.2;
const WALL_SHAKE = 0.35;
// shakes by step: a crossing, the packed blast
const SHAKES = [0.3, 2.8];

const GOLD = fadeStops(COLOR.heavenlyGold);
const PINK = fadeStops(COLOR.peppermintPink);
const DIM = fadeStops(COLOR.gold);
const WHITE = fadeStops(COLOR.white, 0.3);

// the studs round the ring from the top, clockwise
const STUD_COS = new Float64Array(STUDS);
const STUD_SIN = new Float64Array(STUDS);
for (let i = 0; i < STUDS; i++) {
  const a = -Math.PI / 2 + (i / STUDS) * Math.PI * 2;
  STUD_COS[i] = Math.cos(a);
  STUD_SIN[i] = Math.sin(a);
}

interface Ball {
  path: BouncePath;
  // its angle on the ring at each bounce
  angles: number[];
  points: Point[];
  fromMs: number;
  at: (ms: number) => Point;
}
interface Run {
  balls: Ball[];
  // wall strikes, from the readout, in order
  strikes: Bounce[];
  crossMs: number[];
  crossAt: Point[];
  crossed: number;
  splits: Bounce[];
}
const runs = new WeakMap<Running, Run>();

const shrinkScale = (ms: number): number =>
  ms <= SHRINK_AT
    ? 1
    : 1 - (1 - PACKED) * easeIn(clamp01((ms - SHRINK_AT) / SHRINK_MS));
const wall = (a: number): Point => ({
  x: RX * Math.cos(a),
  y: RY * Math.sin(a),
});
// the ellipse's normal at angle a, facing in
const inward = (a: number): number =>
  Math.atan2(-RX * Math.sin(a), -RY * Math.cos(a));

function skew(): number {
  const d = (Math.random() * 2 - 1) * SKEW;
  return d < 0 ? Math.min(d, -MIN_SKEW) : Math.max(d, MIN_SKEW);
}

// from `from` onto the wall at angle a, then chord to chord until the end
function planBall(from: Point, a: number, fromMs: number, legMs: Range): Ball {
  const legs = Math.ceil((END - fromMs) / ((legMs[0] + legMs[1]) / 2)) + 1;
  const points = [from, wall(a)];
  const angles = [a];
  for (let k = 1; k < legs; k++) {
    a += Math.PI + skew();
    angles.push(a);
    points.push(wall(a));
  }
  const path = ricochetThrough(points, legMs, fromMs);
  const spot: Point = { x: 0, y: 0 };
  return {
    path,
    angles,
    points,
    fromMs,
    at: (ms) => {
      const p = path.at(ms);
      const s = shrinkScale(ms);
      spot.x = p.x * s;
      spot.y = p.y * s;
      return spot;
    },
  };
}

function planRun(to: Point): Run {
  const first = planBall(
    { x: -to.x, y: -to.y },
    Math.atan2(to.y / RY, to.x / RX),
    BALL_FROM_MS,
    LEG_MS[0],
  );
  const balls = [first];
  const splits: Bounce[] = [];
  for (let b = 1; b < LEG_MS.length; b++) {
    const parent = balls[b - 1];
    const k = SPLIT_AT[b];
    const bounce = parent.path.bounces[k];
    const turned = parent.angles[k + 1] - parent.angles[k] - Math.PI;
    const a =
      parent.angles[k] +
      Math.PI -
      Math.sign(turned) *
        (SPLIT_SKEW[0] + Math.random() * (SPLIT_SKEW[1] - SPLIT_SKEW[0]));
    balls.push(planBall(parent.points[k + 1], a, bounce.ms, LEG_MS[b]));
    splits.push({
      at: bounce.at,
      ms: bounce.ms,
      normal: inward(parent.angles[k]),
    });
  }
  const strikes: Bounce[] = [];
  const crossings: { ms: number; at: Point }[] = [];
  for (const ball of balls) {
    const { bounces } = ball.path;
    for (let k = 0; k < bounces.length; k++) {
      const { ms } = bounces[k];
      if (ms >= END) break;
      const s = shrinkScale(ms);
      strikes.push({
        at: { x: bounces[k].at.x * s, y: bounces[k].at.y * s },
        ms,
        normal: inward(ball.angles[k]),
      });
      // where the leg into this strike passes nearest the readout's middle
      const from = ball.points[k];
      const dx = bounces[k].at.x - from.x;
      const dy = bounces[k].at.y - from.y;
      const u = clamp01(
        -(from.x * dx + from.y * dy) / (dx * dx + dy * dy || 1),
      );
      const starts = k === 0 ? ball.fromMs : bounces[k - 1].ms;
      const crossMs = starts + u * (ms - starts);
      if (crossMs < SHRINK_AT)
        crossings.push({
          ms: crossMs,
          at: { x: from.x + dx * u, y: from.y + dy * u },
        });
    }
  }
  strikes.sort((a, b) => a.ms - b.ms);
  crossings.sort((a, b) => a.ms - b.ms);
  return {
    balls,
    strikes,
    crossMs: crossings.map((c) => c.ms),
    crossAt: crossings.map((c) => c.at),
    crossed: 0,
    splits,
  };
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  strikes: Bounce[],
  struck: number,
  ms: number,
): void {
  const lastMs = struck > 0 ? strikes[struck - 1].ms : -JOLT_MS;
  const jolt = 1 + JOLT * Math.max(0, 1 - (ms - lastMs) / JOLT_MS);
  const s =
    (ms < RING_IN_MS ? easeOutBack(ms / RING_IN_MS) : shrinkScale(ms)) * jolt;
  if (s <= 0) return;
  const lit = clamp01(struck / STUDS);
  const shut = clamp01((ms - SHRINK_AT) / SHRINK_MS);
  const tremble =
    TREMBLE *
    clamp01((ms - (SHRINK_AT - TREMBLE_MS)) / TREMBLE_MS) *
    (1 - shut);
  const ox = Math.sin(ms * 0.11) * tremble;
  const oy = Math.cos(ms * 0.137) * tremble;
  const rx = RX * s;
  const ry = RY * s;
  ctx.beginPath();
  ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2);
  ctx.globalAlpha = 0.25 + 0.3 * lit + 0.45 * shut;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.lineWidth = RING_GLOW;
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = COLOR.white;
  ctx.lineWidth = RING_CORE;
  ctx.stroke();
  for (let i = 0; i < STUDS; i++) {
    const x = ox + STUD_COS[i] * rx;
    const y = oy + STUD_SIN[i] * ry;
    if (struck - 1 < i) {
      ctx.globalAlpha = 0.4;
      drawGlow(ctx, DIM, x, y, STUD * 0.7);
      continue;
    }
    // the last strike to light it: strikes light the studs in turn, round and round
    const j = i + STUDS * Math.floor((struck - 1 - i) / STUDS);
    const flare = Math.max(0, 1 - (ms - strikes[j].ms) / FLARE_MS);
    ctx.globalAlpha = 0.9;
    drawGlow(ctx, i % 2 ? PINK : GOLD, x, y, STUD * (1 + 1.5 * flare + shut));
    if (flare > 0)
      stampGlimmer(ctx, x, y, STUD_GLIMMER * (0.4 + flare), i, COLOR.white);
  }
}

registerFloorCrit("bumperRingCrit", {
  plan(r, bars, hit) {
    const run = planRun(bars[0]);
    runs.set(r, run);
    for (let k = 0; k < run.crossMs.length; k++) hit(0, run.crossMs[k]);
    hit(0, END, 1);
  },
  draw(ctx, r, ms, bars) {
    const run = runs.get(r);
    if (!run) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { strikes, crossMs, crossAt, splits, balls } = run;
    drawNumberShrink(ctx, r, ms);
    while (r.kicked < strikes.length && ms >= strikes[r.kicked].ms) {
      r.kicked++;
      r.shake(WALL_SHAKE);
      playSpinTick(1 + (DING_RISE * r.kicked) / strikes.length);
    }
    while (run.crossed < crossMs.length && ms >= crossMs[run.crossed])
      run.crossed++;
    ctx.save();
    ctx.translate(to.x, to.y);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (ms < END) drawRing(ctx, strikes, r.kicked, ms);
    for (let k = run.crossed - 1; k >= 0 && ms - crossMs[k] < CROSS_MS; k--) {
      const p = 1 - (ms - crossMs[k]) / CROSS_MS;
      const at = crossAt[k];
      ctx.globalAlpha = p;
      drawGlow(ctx, GOLD, at.x, at.y, CROSS * (1.5 - 0.5 * p), 0.45);
      stampGlimmer(ctx, at.x, at.y, CROSS_GLIMMER * p, k, COLOR.white);
    }
    for (let k = 0; k < splits.length; k++) {
      const since = ms - splits[k].ms;
      if (since < 0 || since >= SPLIT_MS) continue;
      const p = 1 - since / SPLIT_MS;
      const { at } = splits[k];
      ctx.globalAlpha = p;
      drawGlow(ctx, WHITE, at.x, at.y, SPLIT_POP * (1.2 - 0.6 * p));
      stampGlimmer(ctx, at.x, at.y, SPLIT_POP * 0.6 * p, k, COLOR.heavenlyGold);
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    for (let k = r.kicked - 1; k >= 0 && ms - strikes[k].ms < SPLASH_MS; k--)
      drawBounceSplash(ctx, strikes[k], ms - strikes[k].ms, SPLASH, now);
    const heat = strikes.length ? r.kicked / strikes.length : 0;
    for (let b = 0; b < balls.length; b++)
      drawWispBetween(
        ctx,
        balls[b].at,
        ms,
        now,
        BALL,
        heat,
        balls[b].fromMs,
        END,
      );
    ctx.restore();
    drawFinale(ctx, to, ms - END, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
