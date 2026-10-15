// Hairballs, a floor crit: the number bursts into a ball of glitter on the
// left end of every bar in view, which rolls along it from rest, its top row
// of glitter sticking on and turning with it, then drops a row and rolls back,
// then the bottom row, bigger and quicker each pass, a jolt and levels at
// every end; then they all leap off their bars into one spot over its own
// bar, merging into a giant hairball, swelling and trembling with each that
// joins, which slams down onto its own bar in a huge blast and a rattle of
// blasts along it
import {
  drawSnowball,
  planSnowball,
  rollAt,
  snowballRadius,
  type RollPass,
  type Snowball,
} from "../../../../shared/animationStyles/snowball";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { clamp01 } from "../../../../shared/easing";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 200;
// each ball rolls ROWS rows of its bar INSET in from its ends, ROLLS_MS each
// (quickening), dropping a row in DROP_MS; each bar STAGGER_MS after the one
// above
const INSET = 60;
const ROWS = [-0.55, 0, 0.55];
const ROLLS_MS = [420, 300, 210];
const DROP_MS = 50;
const STAGGER_MS = 45;
// the glitter: SPECKS a row, picked up within REACH of the ball's line
const SPECKS = 8;
const SPECK = 18;
const REACH = 22;
// the ball: BALL px, growing GROW px a sqrt of a speck
const BALL = 18;
const GROW = 6;
const BALL_WISP = 60;
const END_BLAST = 70;
// the leap: LEAP_MS onto a spot UP px over its own bar, bowed ARC px up;
// the giant ball BIG px, growing BIG_GROW a sqrt of a ball, trembling
// TREMBLE px, held HANG_MS after the last joins, then slammed down SLAM_MS
const LEAP_MS = 200;
const UP = 300;
const ARC = 220;
const BIG = 50;
const BIG_GROW = 28;
const TREMBLE = 7;
const HANG_MS = 90;
const SLAM_MS = 110;
const GONE_MS = 80;
const JOIN_BLAST = 90;
const SLAM_BLAST = 320;
const CLUSTER = [-0.6, 0.6, -0.3, 0.3, -0.85, 0.85];
const CLUSTER_GAP_MS = 45;
const CLUSTER_BLAST = 100;
const TAIL_MS = 900;
// shakes by step: a bar's end, the slam
const SHAKES = [0.5, 3];

interface Ball {
  bar: number;
  ball: Snowball;
  // where it ends up on its bar, from its middle
  end: Point;
  leapMs: number;
  joinMs: number;
  // its spot at ms on its bar (pure in ms, for its wisp's trail)
  rollAt: (ms: number) => Point;
  // its spot at ms once it leaps, on screen
  flyAt: (ms: number) => Point;
}
interface State {
  balls: Ball[];
  joins: number[];
  slamMs: number;
}
const states = new WeakMap<Running, State>();
// the bars this frame, for the balls' flights
let frameBars: Point[] = [];
const gather: Point = { x: 0, y: 0 };
const giant: Point = { x: 0, y: 0 };
const atGiant = () => giant;
const spot: Point = { x: 0, y: 0 };

// the spot the balls gather at, over its own bar
function gatherAt(into: Point): Point {
  into.x = frameBars[0].x;
  into.y = frameBars[0].y - UP;
  return into;
}

registerFloorCrit("hairballsCrit", {
  // a share of the crit's levels at each end it rolls to
  levels: (count) => Math.ceil(count / ROWS.length),
  plan(r, bars, hit) {
    const reach = r.play.barHalfWidth - INSET;
    const balls: Ball[] = ownLast(bars).map((bar, k) => {
      const passes: RollPass[] = [];
      const specks: Point[] = [];
      let t = IN_MS + k * STAGGER_MS;
      let dir = 1;
      ROWS.forEach((row, j) => {
        const y = row * BAR_HALF_H;
        const from = { x: -dir * reach, y };
        if (j > 0) {
          passes.push({
            from: passes[passes.length - 1].to,
            to: from,
            startMs: t,
            endMs: t + DROP_MS,
          });
          t += DROP_MS;
        }
        const to = { x: dir * reach, y };
        passes.push({ from, to, startMs: t, endMs: t + ROLLS_MS[j] });
        t += ROLLS_MS[j];
        hit(bar, t, 0);
        for (let i = 0; i < SPECKS; i++)
          specks.push({
            x: ((i + 0.5) / SPECKS) * 2 * reach - reach,
            y: y + (holeHash(i + j * 13 + k * 41, 4410) - 0.5) * REACH,
          });
        dir = -dir;
      });
      const ball = planSnowball(passes, specks, REACH);
      const end = passes[passes.length - 1].to;
      const leapMs = t;
      const joinMs = t + LEAP_MS;
      const roll: Point = { x: 0, y: 0 };
      const fly: Point = { x: 0, y: 0 };
      return {
        bar,
        ball,
        end,
        leapMs,
        joinMs,
        rollAt: (ms: number) => rollAt(ball, ms, roll),
        flyAt: (ms: number) => {
          const from = frameBars[bar];
          gatherAt(gather);
          const u = clamp01((ms - leapMs) / LEAP_MS);
          const e = u * u;
          const w = 1 - e;
          const sx = from.x + end.x;
          const sy = from.y + end.y;
          const cx = (sx + gather.x) / 2;
          const cy = Math.min(sy, gather.y) - ARC;
          fly.x = w * w * sx + 2 * w * e * cx + e * e * gather.x;
          fly.y = w * w * sy + 2 * w * e * cy + e * e * gather.y;
          return fly;
        },
      };
    });
    const joins = balls.map((b) => b.joinMs).sort((a, b) => a - b);
    const slamMs = joins[joins.length - 1] + HANG_MS + SLAM_MS;
    hit(0, slamMs, 1);
    states.set(r, { balls, joins, slamMs });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    frameBars = bars;
    gatherAt(gather);
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const { balls, joins, slamMs } = state;
    // the giant ball: swelling with every ball that joins it, trembling,
    // then slammed down onto its own bar
    let joined = 0;
    while (joined < joins.length && ms >= joins[joined]) joined++;
    const bigR = BIG + BIG_GROW * Math.sqrt(joined);
    const shiver = joined > 0 ? TREMBLE * Math.sqrt(joined / joins.length) : 0;
    gatherAt(giant);
    giant.x += Math.sin(ms * 0.9) * shiver;
    giant.y += Math.cos(ms * 1.3) * shiver;
    const slam = clamp01((ms - (slamMs - SLAM_MS)) / SLAM_MS);
    giant.y += (bars[0].y - BAR_HALF_H - bigR * 0.5 - giant.y) * slam * slam;
    const gone = clamp01((ms - slamMs) / GONE_MS);
    for (const b of balls) {
      const radius = snowballRadius(b.ball, ms, BALL, GROW);
      const size = WISP_SIZE * (0.8 + radius / BALL_WISP);
      if (ms < b.leapMs) {
        if (ms < IN_MS) continue;
        const bar = bars[b.bar];
        ctx.save();
        ctx.translate(bar.x, bar.y);
        const at = b.rollAt(ms);
        drawSnowball(ctx, b.ball, ms, at, radius, SPECK);
        drawWispHead(ctx, b.rollAt, ms, now, size, 0.5);
        ctx.restore();
      } else if (ms < b.joinMs) {
        drawSnowball(ctx, b.ball, ms, b.flyAt(ms), radius, SPECK);
        drawWispHead(ctx, b.flyAt, ms, now, size, 0.7);
      } else if (gone < 1) {
        drawSnowball(ctx, b.ball, ms, giant, bigR, SPECK * 1.2, 1 - gone);
      }
      // a jolt at every end it rolls to, a pop as it joins
      const bar = bars[b.bar];
      for (let j = 0; j < b.ball.passes.length; j += 2) {
        const pass = b.ball.passes[j];
        spot.x = bar.x + pass.to.x;
        spot.y = bar.y + pass.to.y;
        drawDetonation(ctx, spot, ms - pass.endMs, END_BLAST, now);
      }
      drawDetonation(ctx, gather, ms - b.joinMs, JOIN_BLAST, now);
    }
    if (joined > 0 && gone < 1)
      drawWispHead(ctx, atGiant, ms, now, WISP_SIZE * 2.4, 1, 1 - gone);
    // the slam: a huge blast, then a rattle along its own bar
    const reach = r.play.barHalfWidth - INSET;
    drawDetonation(ctx, bars[0], ms - slamMs, SLAM_BLAST, now);
    for (let k = 0; k < CLUSTER.length; k++) {
      spot.x = bars[0].x + CLUSTER[k] * reach;
      spot.y = bars[0].y;
      drawDetonation(
        ctx,
        spot,
        ms - slamMs - (k + 1) * CLUSTER_GAP_MS,
        CLUSTER_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
