// snowballs for events and crits: a ball rolling over things, every speck it
// touches sticking on and turning with it as it rolls, the ball growing
// bigger and faster. Plan the passes and the specks once (planSnowball),
// then each frame place the ball with rollAt and drawSnowball the specks
import { COLOR } from "../../../palette";
import { clamp01 } from "../../easing";
import { beginLightBatch, endLightBatch } from "../../lightBatch";
import { hash01, stampGlimmer } from "../../twinkle";
import type { Point } from "../../wisp";

// a pass speeds up from rest: its share of the way is t^ROLL
const ROLL = 1.4;
// a stuck speck pops POP bigger for POP_MS, sitting CRUST of the radius out
const POP = 1.2;
const POP_MS = 100;
const CRUST: [number, number] = [0.85, 1.1];
const STUCK = 1.2;

export interface RollPass {
  from: Point;
  to: Point;
  startMs: number;
  endMs: number;
}

export interface Snowball {
  passes: RollPass[];
  specks: Point[];
  // when each speck sticks on (Infinity: never), its angle on the crust
  picks: Float64Array;
  angles: Float32Array;
  // the path's length before each pass
  before: number[];
}

// where along pass p the ball is at ms, 0..1
const progress = (p: RollPass, ms: number) =>
  clamp01((ms - p.startMs) / (p.endMs - p.startMs)) ** ROLL;

// a ball rolling the passes in order, picking up every speck within reach of
// its line
export function planSnowball(
  passes: RollPass[],
  specks: Point[],
  reach: number,
): Snowball {
  const picks = new Float64Array(specks.length).fill(Infinity);
  const angles = new Float32Array(specks.length);
  for (let i = 0; i < specks.length; i++) {
    angles[i] = hash01(i, 71) * Math.PI * 2;
    const s = specks[i];
    for (const p of passes) {
      const dx = p.to.x - p.from.x;
      const dy = p.to.y - p.from.y;
      const len2 = dx * dx + dy * dy || 1;
      const u = clamp01(((s.x - p.from.x) * dx + (s.y - p.from.y) * dy) / len2);
      const d = Math.hypot(p.from.x + dx * u - s.x, p.from.y + dy * u - s.y);
      if (d > reach) continue;
      picks[i] = p.startMs + (p.endMs - p.startMs) * u ** (1 / ROLL);
      break;
    }
  }
  const before: number[] = [];
  let length = 0;
  for (const p of passes) {
    before.push(length);
    length += Math.hypot(p.to.x - p.from.x, p.to.y - p.from.y);
  }
  return { passes, specks, picks, angles, before };
}

// where the ball is at ms (at the first pass's start before it, the last's
// end after), into `into`
export function rollAt(ball: Snowball, ms: number, into: Point): Point {
  const { passes } = ball;
  let k = 0;
  while (k < passes.length - 1 && ms >= passes[k].endMs) k++;
  const p = passes[k];
  const u = progress(p, ms);
  into.x = p.from.x + (p.to.x - p.from.x) * u;
  into.y = p.from.y + (p.to.y - p.from.y) * u;
  return into;
}

// how far it has rolled by ms
export function rolledAt(ball: Snowball, ms: number): number {
  const { passes } = ball;
  let k = 0;
  while (k < passes.length - 1 && ms >= passes[k].endMs) k++;
  const p = passes[k];
  return (
    ball.before[k] +
    Math.hypot(p.to.x - p.from.x, p.to.y - p.from.y) * progress(p, ms)
  );
}

// how many specks it has picked up by ms
export function stuckAt(ball: Snowball, ms: number): number {
  let n = 0;
  for (let i = 0; i < ball.picks.length; i++) if (ball.picks[i] <= ms) n++;
  return n;
}

// its radius by ms: `base`, growing `grow` px a sqrt of a speck
export const snowballRadius = (
  ball: Snowball,
  ms: number,
  base: number,
  grow: number,
): number => base + grow * Math.sqrt(stuckAt(ball, ms));

// the specks at ms, `size` px each: lying where they are, or stuck on the
// crust of the ball at `at`, `radius` round, turning as it rolls; `alpha`
// fades the stuck ones (once it's gone)
export function drawSnowball(
  ctx: CanvasRenderingContext2D,
  ball: Snowball,
  ms: number,
  at: Point,
  radius: number,
  size: number,
  alpha = 1,
): void {
  const roll = rolledAt(ball, ms) / Math.max(1, radius);
  const previous = ctx.globalCompositeOperation;
  const base = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < ball.specks.length; i++) {
    const color = i % 3 ? COLOR.heavenlyGold : COLOR.white;
    const pick = ball.picks[i];
    if (ms < pick) {
      ctx.globalAlpha = base;
      stampGlimmer(ctx, ball.specks[i].x, ball.specks[i].y, size, i, color);
      continue;
    }
    if (alpha <= 0) continue;
    const a = ball.angles[i] + roll;
    const out = radius * (CRUST[0] + (CRUST[1] - CRUST[0]) * hash01(i, 72));
    const pop = Math.max(0, 1 - (ms - pick) / POP_MS);
    ctx.globalAlpha = base * alpha;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * out,
      at.y + Math.sin(a) * out,
      size * (STUCK + POP * pop),
      i,
      color,
    );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = base;
  ctx.globalCompositeOperation = previous;
}
