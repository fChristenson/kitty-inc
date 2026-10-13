// the block bonk floor crit: the number drops onto a low bar in view as a
// wisp and goes platforming up the building: from the top of each bar it
// jumps and bonks the bar above from below, twice, the bar bumping up and a
// coin popping out of its top each time, then hops round its end onto it,
// quicker each bar; at the top it leaps high over its own bar, hangs, and
// ground-pounds it in a huge blast
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { BAR_HALF_H } from "../../critPlayer/shared";

const BB_IN_MS = 220;
// at most this many bars climbed, its own among them
const BB_BARS = 4;
// a bonk's jump up and drop back, quicker each bar; the run between its two
// bonks; the hop round a bar's end onto it
const BB_UP_MS: [number, number] = [90, 65];
const BB_RUN_MS = 60;
const BB_CLIMB_MS: [number, number] = [190, 150];
// where along a bar its two bonks land, where it lands after a hop, how far
// past the bar's end the hop swings
const BB_SPOTS = [-0.5, 0.1];
const BB_LAND_SIDE = 0.75;
const BB_ROUND = 180;
const BB_ROUND_RISE = 140;
// the runner's half height off a bar's edge, its size
const BB_R = 34;
const BB_SIZE = 1.4;
// the leap over its own bar, the hang and the slam
const BB_LEAP_MS = 200;
const BB_LEAP_ARC = 120;
const BB_ABOVE = 420;
const BB_HANG_MS = 70;
const BB_SLAM_MS = 70;
// a bonked bar's bump, the coin popping out of it, the bonk's blast
const BB_BUMP_MS = 140;
const BB_COIN = 40;
const BB_COIN_MS = 600;
const BB_COIN_LIFT = 280;
const BB_SPIN = 0.02;
const BB_BONK_BLAST = 140;
// the ground pound: its blast, then the cluster rolling out along its bar
const BB_BOOM = 440;
const BB_CLUSTER = [-0.5, 0.5, -1, 1];
const BB_CLUSTER_MS = 45;
const BB_CLUSTER_BLAST = 170;
const BB_KICKED_BOOM = 1e6;
// shakes by step: a bonk, the ground pound
const BB_SHAKES = [0.6, 3];
const BB_TAIL_MS = 1000;

interface Bonk {
  bar: number;
  side: number;
  at: number;
  spot: Point;
  sprite: CoinBurstSprite;
}

// one stretch of the runner's way: from t0 to t1, where it is u 0..1 along
type Move = { t0: number; t1: number; at: (u: number) => Point };

interface BlockBonk {
  bonks: Bonk[];
  moves: Move[];
  first: number;
  stomp: number;
  pound: number;
  path: (ms: number) => Point;
  // the bars this frame and the bar half width, for the moves to read
  bars: Point[];
  half: number;
}
const bonkers = new WeakMap<Running, BlockBonk>();

function planBlockBonk(r: Running, bars: Point[]): BlockBonk {
  // the bars climbed: a run up the building, bottom first, ending on its own
  // where there are bars enough below it
  const up = byHeight(bars).reverse();
  const from = Math.max(0, up.indexOf(0) - (BB_BARS - 1));
  const climb = up.slice(from, from + BB_BARS);
  const s: BlockBonk = {
    bonks: [],
    moves: [],
    first: climb[0],
    stomp: BB_IN_MS,
    pound: 0,
    path: () => ({ x: 0, y: 0 }),
    bars,
    half: r.play.barHalfWidth,
  };
  const top = (bar: number, side: number): Point => {
    const p = along(r, s.bars, bar, side);
    return { x: p.x, y: p.y - BAR_HALF_H - BB_R };
  };
  const under = (bar: number, side: number): Point => {
    const p = along(r, s.bars, bar, side);
    return { x: p.x, y: p.y + BAR_HALF_H + BB_R };
  };
  let t = 0;
  const move = (ms: number, at: (u: number) => Point) => {
    s.moves.push({ t0: t, t1: t + ms, at });
    t += ms;
    return t;
  };
  move(BB_IN_MS, (u) => {
    const to = top(climb[0], BB_SPOTS[0]);
    const e = u * u;
    return { x: to.x * e, y: to.y * e - 4 * e * (1 - e) * BB_ROUND_RISE };
  });
  for (let k = 1; k < climb.length; k++) {
    const below = climb[k - 1];
    const bar = climb[k];
    const q = climb.length > 2 ? (k - 1) / (climb.length - 2) : 0;
    const upMs = lerp(BB_UP_MS[0], BB_UP_MS[1], q);
    BB_SPOTS.forEach((side, j) => {
      if (j > 0) {
        const was = BB_SPOTS[j - 1];
        move(BB_RUN_MS, (u) => {
          const a = top(below, was);
          const b = top(below, side);
          return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
        });
      }
      const at = move(upMs, (u) => {
        const a = top(below, side);
        const b = under(bar, side);
        return { x: a.x, y: lerp(a.y, b.y, 1 - (1 - u) ** 2) };
      });
      s.bonks.push({
        bar,
        side,
        at,
        spot: { x: 0, y: 0 },
        sprite: { kind: "coin", spinFrame: 0, axisAngle: 0 },
      });
      move(upMs, (u) => {
        const a = under(bar, side);
        const b = top(below, side);
        return { x: a.x, y: lerp(a.y, b.y, u * u) };
      });
    });
    const last = BB_SPOTS[BB_SPOTS.length - 1];
    move(lerp(BB_CLIMB_MS[0], BB_CLIMB_MS[1], q), (u) => {
      const a = top(below, last);
      const b = top(bar, BB_LAND_SIDE);
      const end = s.bars[bar].x + s.half + BB_ROUND;
      const e = u * u * (3 - 2 * u);
      const v = 1 - e;
      // round the bar's right end: out past it, up and back in on top
      const c1 = { x: end, y: a.y - BB_ROUND_RISE * 0.3 };
      const c2 = { x: end, y: b.y - BB_ROUND_RISE };
      return {
        x:
          v * v * v * a.x +
          3 * v * v * e * c1.x +
          3 * v * e * e * c2.x +
          e * e * e * b.x,
        y:
          v * v * v * a.y +
          3 * v * v * e * c1.y +
          3 * v * e * e * c2.y +
          e * e * e * b.y,
      };
    });
  }
  // the leap up over its own bar (from wherever the climb ended), the hang
  // and the ground pound
  const leapFrom = climb[climb.length - 1];
  const leapSide = climb.length > 1 ? BB_LAND_SIDE : BB_SPOTS[0];
  const peak = (): Point => ({
    x: s.bars[0].x,
    y: Math.min(
      s.bars[0].y - BB_ABOVE,
      top(leapFrom, leapSide).y - BB_LEAP_ARC,
    ),
  });
  move(BB_LEAP_MS, (u) => {
    const a = top(leapFrom, leapSide);
    const b = peak();
    const e = 1 - (1 - u) ** 2;
    return {
      x: lerp(a.x, b.x, e),
      y: lerp(a.y, b.y, e) - 4 * e * (1 - e) * BB_LEAP_ARC,
    };
  });
  move(BB_HANG_MS, () => peak());
  s.pound = move(BB_SLAM_MS, (u) => {
    const a = peak();
    return { x: a.x, y: lerp(a.y, s.bars[0].y - BAR_HALF_H, u * u) };
  });
  s.path = (ms) => {
    const moves = s.moves;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      if (ms < m.t1) return m.at(clamp01((ms - m.t0) / (m.t1 - m.t0)));
    }
    return moves[moves.length - 1].at(1);
  };
  return s;
}

registerFloorCrit("blockBonkCrit", {
  plan(r, bars, hit, lift) {
    const s = planBlockBonk(r, bars);
    bonkers.set(r, s);
    hit(s.first, s.stomp, 0);
    for (const b of s.bonks) {
      hit(b.bar, b.at, 0);
      lift(b.bar, b.at, BB_BUMP_MS);
    }
    hit(0, s.pound, 1);
    BB_CLUSTER.forEach((_, k) => hit(0, s.pound + (k + 1) * BB_CLUSTER_MS, 0));
  },
  draw(ctx, r, ms, bars) {
    const s = bonkers.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    s.bars = bars;
    if (ms >= s.pound && r.kicked < BB_KICKED_BOOM) {
      r.kicked = BB_KICKED_BOOM;
      playExplosion();
    }
    if (ms < BB_IN_MS) {
      const at = s.path(ms);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        at.x,
        at.y,
        lerp(r.flashFont, 0, (ms / BB_IN_MS) ** 2),
      );
    }

    // the coins popping out of the bonked bars' tops
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    for (const b of s.bonks) {
      const dt = ms - b.at;
      if (dt < 0 || dt > BB_COIN_MS) continue;
      const u = dt / BB_COIN_MS;
      const p = along(r, bars, b.bar, b.side);
      b.sprite.spinFrame = ms * BB_SPIN;
      drawCoinBurstFrame(
        ctx,
        b.sprite,
        p.x,
        p.y - BAR_HALF_H - BB_COIN - 4 * u * (1 - u) * BB_COIN_LIFT,
        BB_COIN,
        base,
      );
    }
    endCoinBatch(ctx);

    drawWispBetween(
      ctx,
      s.path,
      ms,
      now,
      WISP_SIZE * BB_SIZE,
      0.8,
      BB_IN_MS / 2,
      s.pound,
    );
    for (const b of s.bonks) {
      const p = along(r, bars, b.bar, b.side);
      b.spot.x = p.x;
      b.spot.y = p.y + BAR_HALF_H;
      drawDetonation(ctx, b.spot, ms - b.at, BB_BONK_BLAST, now);
    }
    drawDetonation(ctx, bars[0], ms - s.pound, BB_BOOM, now);
    for (let k = 0; k < BB_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, BB_CLUSTER[k]),
        ms - s.pound - (k + 1) * BB_CLUSTER_MS,
        BB_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: BB_TAIL_MS,
  shake: (step) => BB_SHAKES[step] ?? BB_SHAKES[0],
});
