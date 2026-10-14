// Air Chop, a floor crit: the number shrinks away and wisp balls are tossed
// up from below the bars, one, then two, then three at once, quicker each
// volley; at the top of its flight each is sliced clean through by a swift
// slash, a flash, a whoosh and a jolt, glitter spilling from the cut, and
// its two halves split apart and slam down onto two bars in blasts, levels
// on each; then one giant ball goes up over its own bar and is cut in a
// cross, its four quarters slamming down, the biggest onto its own bar
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

const IN_MS = 160;
// the volleys: VOLLEYS balls each from FIRST_MS, GAPS_MS apart, a ball in a
// volley STAGGER_MS after the last; tossed from BELOW under the lowest bar,
// within SPREAD of the screen's half width, up over RISE_MS to ABOVE over
// its bars
const FIRST_MS = IN_MS + 60;
const VOLLEYS = [1, 1, 2, 2, 3];
const GAPS_MS = [360, 290, 230, 180, 200];
const STAGGER_MS = 60;
const BELOW = 650;
const SPREAD = 0.5;
const RISE_MS = 300;
const ABOVE = 280;
// the cut, CUT times the ball across, then its halves SEP px apart and down
// onto their bars over FALL_MS
const CUT = 1.8;
const SWIPE_MS = 70;
const SEP = 90;
const FALL_MS = 240;
const BALL = WISP_SIZE * 1.6;
const PIECE = WISP_SIZE * 1.1;
const SLASH = 14;
const SPILL = 20;
const BLAST = 130;
// the giant: GIANT times the size, up over its own bar, cut in a cross
const GIANT = 2.4;
const GIANT_GAP_MS = 120;
const CROSS_MS = 80;
const GIANT_SLASH = 26;
const OWN_BLAST = 420;
const SLASH_SHAKE = 0.6;
// shakes by step: a half in a bar, its own
const SHAKES = [0.7, 3];

interface Ball {
  from: Point;
  apex: Point;
  launch: number;
  cut: number;
  size: number;
  at: (ms: number) => Point | null;
}
interface Piece {
  bar: number;
  from: number;
  lands: number;
  size: number;
  at: (ms: number) => Point | null;
}
interface State {
  bars: Point[];
  balls: Ball[];
  pieces: Piece[];
  slashes: Slash[];
}
const states = new WeakMap<Running, State>();

registerFloorCrit("airChopCrit", {
  // about four halves a bar
  levels: (count) => Math.ceil(count / 4),
  plan(r, bars, hit) {
    const state: State = { bars, balls: [], pieces: [], slashes: [] };
    const others = bars.map((_, k) => k).filter((k) => k > 0);
    let lowest = -Infinity;
    for (const bar of bars) lowest = Math.max(lowest, bar.y);
    const spread = (r.viewportWidth / 2) * SPREAD;
    let next = 0;
    const target = () => (others.length ? others[next++ % others.length] : 0);
    const toss = (k: number, launch: number, over: number, size: number) => {
      const from = {
        x: (holeHash(k, 3110) * 2 - 1) * spread,
        y: lowest + BELOW,
      };
      const apex = {
        x: (holeHash(k, 3111) * 2 - 1) * spread,
        y: over - ABOVE,
      };
      const cut = launch + RISE_MS;
      const spot: Point = { x: 0, y: 0 };
      const ball: Ball = {
        from,
        apex,
        launch,
        cut,
        size,
        at: (ms) => {
          if (ms < launch || ms > cut + SWIPE_MS) return null;
          const u = Math.min(1, (ms - launch) / RISE_MS);
          const e = 1 - (1 - u) ** 2;
          spot.x = lerp(from.x, apex.x, u);
          spot.y = lerp(from.y, apex.y, e);
          return spot;
        },
      };
      state.balls.push(ball);
      return ball;
    };
    // a piece of a ball flung off along `n` (from the cut) onto `bar`
    const piece = (
      ball: Ball,
      n: Point,
      bar: number,
      from: number,
      size: number,
    ) => {
      const lands = from + FALL_MS;
      const spot: Point = { x: 0, y: 0 };
      state.pieces.push({
        bar,
        from,
        lands,
        size,
        at: (ms) => {
          if (ms < from || ms > lands) return null;
          const u = (ms - from) / FALL_MS;
          const to = state.bars[bar];
          const apart = Math.min(1, u * 4) * SEP;
          spot.x = lerp(ball.apex.x + n.x * apart, to.x, u * u);
          spot.y = lerp(ball.apex.y + n.y * apart, to.y, u * u);
          return spot;
        },
      });
      hit(bar, lands, bar === 0 && size > PIECE ? 1 : 0);
    };
    let t = FIRST_MS;
    let k = 0;
    VOLLEYS.forEach((count, v) => {
      for (let j = 0; j < count; j++, k++) {
        const a = target();
        const b = target();
        const ball = toss(
          k,
          t + j * STAGGER_MS,
          Math.min(bars[a].y, bars[b].y),
          BALL,
        );
        const angle = (holeHash(k, 3112) - 0.5) * 1.6;
        const reach = (BALL * CUT) / 2;
        const slash = planSlash(
          {
            x: ball.apex.x - Math.cos(angle) * reach,
            y: ball.apex.y - Math.sin(angle) * reach,
          },
          {
            x: ball.apex.x + Math.cos(angle) * reach,
            y: ball.apex.y + Math.sin(angle) * reach,
          },
          ball.cut,
          SWIPE_MS,
        );
        state.slashes.push(slash);
        const n = slash.n;
        piece(ball, n, a, slash.endMs, PIECE);
        piece(ball, { x: -n.x, y: -n.y }, b, slash.endMs + 30, PIECE);
      }
      t += GAPS_MS[v];
    });
    // the giant over its own bar, cut in a cross
    const giant = toss(k, t + GIANT_GAP_MS, bars[0].y, BALL * GIANT);
    const reach = (BALL * GIANT * CUT) / 2;
    const { x, y } = giant.apex;
    const first = planSlash(
      { x: x - reach, y: y - reach * 0.6 },
      { x: x + reach, y: y + reach * 0.6 },
      giant.cut,
      SWIPE_MS,
    );
    const second = planSlash(
      { x: x + reach, y: y - reach * 0.6 },
      { x: x - reach, y: y + reach * 0.6 },
      giant.cut + CROSS_MS,
      SWIPE_MS,
    );
    state.slashes.push(first, second);
    const out = second.endMs;
    const quarters = [
      { x: first.n.x + second.n.x, y: first.n.y + second.n.y },
      { x: first.n.x - second.n.x, y: first.n.y - second.n.y },
      { x: -first.n.x + second.n.x, y: -first.n.y + second.n.y },
    ];
    quarters.forEach((n, q) =>
      piece(giant, n, target(), out + q * 40, PIECE * 1.3),
    );
    piece(giant, { x: 0, y: 1 }, 0, out + 120, PIECE * 2);
    state.slashes.sort((a, b) => a.startMs - b.startMs);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - 0.7 * p), {
        alpha: 1 - p,
      });
    }
    // a whoosh and a jolt at every slash
    while (
      r.kicked < state.slashes.length &&
      ms >= state.slashes[r.kicked].startMs
    ) {
      r.shake(SLASH_SHAKE);
      playSwoosh();
      r.kicked++;
    }
    for (const ball of state.balls)
      drawWispBetween(
        ctx,
        ball.at,
        ms,
        now,
        ball.size,
        0.5,
        ball.launch,
        ball.cut + SWIPE_MS,
      );
    // the last two cuts are the giant's cross
    const giantFrom = state.slashes.length - 2;
    for (let k = 0; k < state.slashes.length; k++) {
      const slash = state.slashes[k];
      drawSlash(ctx, slash, ms, k >= giantFrom ? GIANT_SLASH : SLASH, now);
      drawSliceSpill(ctx, slash, ms, SPILL);
    }
    for (const p of state.pieces) {
      drawWispBetween(ctx, p.at, ms, now, p.size, 1, p.from, p.lands);
      drawDetonation(
        ctx,
        bars[p.bar],
        ms - p.lands,
        p.size > PIECE * 1.5 ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
