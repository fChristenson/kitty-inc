// Roll Call, a floor crit: the number drops onto the top bar as a wisp ball
// that rolls along it from rest, the glitter lying on it sticking on and
// turning with it; it drops onto each bar below and rolls back, bigger and
// quicker, each bar taking its levels as it rolls off; on its own bar it
// bursts, its crust flung off in a rattle of blasts
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

// the number fading as the ball drops in
const IN_MS = 200;
// every roll together, quickening from QUICKEN[0] to [1] of an even share,
// a drop of DROP_MS between bars
const ROLL_MS = 1900;
const QUICKEN: [number, number] = [1.5, 0.6];
const DROP_MS = 90;
const INSET = 60;
// the glitter lying on each bar, picked up within REACH of the ball's line
const SPECKS = 10;
const SPECK = 20;
const REACH = 46;
// the ball: BALL px, growing BALL_GROW px a sqrt of a speck
const BALL = 26;
const BALL_GROW = 7;
const BALL_WISP = 70;
const BURST_FADE_MS = 80;
const BURST_BLAST = 200;
const CLUSTER = [-0.6, 0.6, -0.3, 0.3, -0.85, 0.85];
const CLUSTER_GAP_MS = 45;
const CLUSTER_BLAST = 90;
// shakes by step: a bar rolled off, the burst
const SHAKES = [0.6, 2.8];
const TAIL_MS = 900;

interface Roll {
  ball: Snowball;
  // its own bar where it was planned: the rolls follow the bars as they move
  anchor: Point;
  burstAt: number;
}
const rolls = new WeakMap<Running, Roll>();
const at: Point = { x: 0, y: 0 };
const trail: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("rollCallCrit", {
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const reach = r.play.barHalfWidth - INSET;
    let total = 0;
    const weights = order.map((_, k) => {
      const w =
        QUICKEN[0] +
        (QUICKEN[1] - QUICKEN[0]) *
          (order.length > 1 ? k / (order.length - 1) : 1);
      total += w;
      return w;
    });
    const unit = (ROLL_MS - DROP_MS * (order.length - 1)) / total;
    const passes: RollPass[] = [];
    const specks: Point[] = [];
    let t = IN_MS;
    let x = bars[order[0]].x - reach;
    let dir = 1;
    order.forEach((bar, k) => {
      const { x: mid, y } = bars[bar];
      const last = k === order.length - 1;
      if (k > 0) {
        const prev = passes[passes.length - 1].to;
        passes.push({
          from: prev,
          to: { x, y },
          startMs: t,
          endMs: t + DROP_MS,
        });
        t += DROP_MS;
      }
      const to = last ? mid : mid + dir * reach;
      const ms = weights[k] * unit;
      passes.push({
        from: { x, y },
        to: { x: to, y },
        startMs: t,
        endMs: t + ms,
      });
      t += ms;
      for (let i = 0; i < SPECKS; i++)
        specks.push({
          x: mid + (holeHash(i + k * 31, 1830) * 2 - 1) * reach,
          y: y + (holeHash(i + k * 31, 1831) - 0.5) * BAR_HALF_H,
        });
      hit(bar, t, last ? 1 : 0);
      x = to;
      dir = -dir;
    });
    rolls.set(r, {
      ball: planSnowball(passes, specks, REACH),
      anchor: { x: bars[0].x, y: bars[0].y },
      burstAt: t,
    });
  },
  draw(ctx, r, ms, bars) {
    const roll = rolls.get(r);
    if (!roll) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, { alpha: 1 - p });
    }
    const gone = clamp01((ms - roll.burstAt) / BURST_FADE_MS);
    if (gone < 1) {
      const dx = bars[0].x - roll.anchor.x;
      const dy = bars[0].y - roll.anchor.y;
      ctx.save();
      ctx.translate(dx, dy);
      rollAt(roll.ball, ms, at);
      const radius = snowballRadius(roll.ball, ms, BALL, BALL_GROW);
      drawSnowball(ctx, roll.ball, ms, at, radius, SPECK, 1 - gone);
      if (ms >= IN_MS)
        drawWispHead(
          ctx,
          (m) => rollAt(roll.ball, m, trail),
          ms,
          now,
          WISP_SIZE * (0.8 + radius / BALL_WISP),
          0.5,
          1 - gone,
        );
      ctx.restore();
    }
    const reach = r.play.barHalfWidth - INSET;
    drawDetonation(ctx, bars[0], ms - roll.burstAt, BURST_BLAST, now);
    for (let k = 0; k < CLUSTER.length; k++) {
      spot.x = bars[0].x + CLUSTER[k] * reach;
      spot.y = bars[0].y;
      drawDetonation(
        ctx,
        spot,
        ms - roll.burstAt - (k + 1) * CLUSTER_GAP_MS,
        CLUSTER_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
