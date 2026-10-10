// the ceiling bounce income crit: the number balls up into a wisp flung at
// the screen's side; it banks off and bounces along under the total,
// smacking up into the readout on every bounce; off the other side, back in
// quicker, shorter bounces, then a last kick dunks it into the middle
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  drawBounceSplash,
  hops,
  type Bounce,
  type BouncePath,
} from "../../../../shared/bounce";
import type { Range } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink } from "../shared";

// each leg quicker than the last, dipping under its chord (a ceiling's hop)
const LEG_MS: Range = [130, 45];
const LIFT: Range = [-140, -90];
// the line under the readout it smacks up into, and the walls' spots under it
const UNDER = 50;
const EDGE = 50;
const FLING_DOWN = 160;
const WALL_DOWN = 110;
const OUT_HOPS = 6;
const BACK_HOPS = 8;
const BALL = WISP_SIZE * 1.5;
const BALL_HEAT = 1;
const SMACK_BLAST = 170;
const SPLASH = 160;
const WALL_SHAKE = 1.2;
// shakes by step: a smack, the dunk
const SHAKES = [0.7, 2.4];

interface Run {
  path: BouncePath;
  smacks: Point[];
  smackAt: number[];
  walls: Bounce[];
  endAt: number;
}
const runs = new WeakMap<Running, Run>();

function across(from: number, to: number, n: number, y: number): Point[] {
  const points: Point[] = [];
  for (let k = 1; k <= n; k++)
    points.push({ x: from + ((to - from) * k) / (n + 1), y });
  return points;
}

function planRun(to: Point, viewportWidth: number): Run {
  const y = to.y + UNDER;
  const left = -viewportWidth / 2 + EDGE;
  const right = viewportWidth / 2 - EDGE;
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: left, y: y + FLING_DOWN },
    ...across(left, right, OUT_HOPS, y),
    { x: right, y: y + WALL_DOWN },
    ...across(right, left, BACK_HOPS, y),
    { x: left, y: y + WALL_DOWN },
    to,
  ];
  const path = hops(points, LEG_MS, LIFT);
  const wallAt = new Set([0, OUT_HOPS + 1, OUT_HOPS + BACK_HOPS + 2]);
  const last = path.bounces.length - 1;
  const smacks: Point[] = [];
  const smackAt: number[] = [];
  const walls: Bounce[] = [];
  path.bounces.forEach((b, k) => {
    if (k === last) return;
    if (wallAt.has(k))
      walls.push({ at: b.at, ms: b.ms, normal: b.at.x < 0 ? 0 : Math.PI });
    else {
      smacks.push({ x: b.at.x, y: to.y });
      smackAt.push(b.ms);
    }
  });
  return { path, smacks, smackAt, walls, endAt: path.bounces[last].ms };
}

registerFloorCrit("ceilingBounceCrit", {
  plan(r, bars, hit) {
    const run = planRun(bars[0], r.viewportWidth);
    runs.set(r, run);
    for (const at of run.smackAt) hit(0, at);
    hit(0, run.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const run = runs.get(r);
    if (!run) return;
    const now = r.startedAt + ms;
    drawNumberShrink(ctx, r, ms);
    const { walls } = run;
    while (r.kicked < walls.length && ms >= walls[r.kicked].ms) {
      r.kicked++;
      r.shake(WALL_SHAKE);
    }
    for (let k = 0; k < walls.length; k++)
      drawBounceSplash(ctx, walls[k], ms - walls[k].ms, SPLASH, now);
    drawWispBetween(ctx, run.path.at, ms, now, BALL, BALL_HEAT, 0, run.endAt);
    for (let k = 0; k < run.smacks.length; k++)
      drawDetonation(ctx, run.smacks[k], ms - run.smackAt[k], SMACK_BLAST, now);
    drawFinale(ctx, bars[0], ms - run.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
