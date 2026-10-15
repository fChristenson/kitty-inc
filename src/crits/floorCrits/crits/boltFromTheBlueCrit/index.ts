// Bolt From the Blue, a floor crit: the number bursts and hundreds of
// specks of glitter fly out of it to their places in a giant lightning
// bolt drawn over the whole building, top to bottom, a trickle then a
// flood, faster and faster; the finished bolt blazes white and throbs, then
// crashes down: its glitter streaks into the bars it crosses, bar after bar
// down the building, each a blast with its levels, quicker each, its own
// last and biggest
import { COLOR } from "../../../../palette";
import {
  shapeOutline,
  SHAPES,
} from "../../../../shared/animationStyles/drawing";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 110;
// the bolt: DOTS of glitter, reaching OVER px past the top and bottom bars,
// NARROW as wide as the shape, each flying FLY_MS from the number, filling
// over FILL_MS (quickening by FILL_EASE)
const DOTS = 240;
const OVER = 220;
const NARROW = 0.6;
const DOT = 22;
const FLY_MS = 150;
const FILL_MS = 900;
const FILL_EASE = 0.55;
// blazing over BLAZE_MS, throbbing THROB_HZ, then crashing into the bars
// STRIKE_GAP_MS apart (closing), each dot streaking in over STREAK_MS
const BLAZE_MS = 260;
const THROB_HZ = 9;
const STRIKE_GAP_MS: [number, number] = [80, 40];
const STREAK_MS = 90;
const BLAST = 170;
const OWN_BLAST = 420;
// shakes by step: a bar, its own
const SHAKES = [0.9, 2.8];

interface State {
  dots: Point[];
  lands: Float32Array;
  // each dot's bar (an index into strikes), and where it hits it
  barOf: Uint8Array;
  hits: Point[];
  strikes: { bar: number; at: number }[];
  blazeAt: number;
  from: Point;
}
const states = new WeakMap<Running, State>();
const dot: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };

registerFloorCrit("boltFromTheBlueCrit", {
  plan(r, bars, hit) {
    const base = bars[0];
    const half = r.play.barHalfWidth;
    let top = Infinity;
    let bottom = -Infinity;
    for (const bar of bars) {
      top = Math.min(top, bar.y - base.y);
      bottom = Math.max(bottom, bar.y - base.y);
    }
    top -= OVER;
    bottom += OVER;
    const centre = { x: 0, y: (top + bottom) / 2 };
    const dots = shapeOutline(
      SHAPES.bolt,
      DOTS,
      centre,
      (bottom - top) / 2,
    ).map((p) => ({
      x: centre.x + (p.x - centre.x) * NARROW,
      y: p.y,
    }));
    const n = dots.length;
    const lands = new Float32Array(n);
    for (let i = 0; i < n; i++)
      lands[i] = IN_MS + FLY_MS + FILL_MS * (i / n) ** FILL_EASE;
    const blazeAt = lands[n - 1];
    // the bars struck in turn, its own last
    const order = ownLast(bars);
    const strikes: State["strikes"] = [];
    let t = blazeAt + BLAZE_MS;
    order.forEach((bar, k) => {
      strikes.push({ bar, at: t + STREAK_MS });
      hit(bar, t + STREAK_MS, bar === 0 ? 1 : 0);
      t += lerp(
        STRIKE_GAP_MS[0],
        STRIKE_GAP_MS[1],
        k / Math.max(1, order.length - 1),
      );
    });
    // every dot onto its nearest bar, across it
    const barOf = new Uint8Array(n);
    const hits: Point[] = [];
    for (let i = 0; i < n; i++) {
      let best = 0;
      for (let k = 1; k < order.length; k++)
        if (
          Math.abs(bars[order[k]].y - base.y - dots[i].y) <
          Math.abs(bars[order[best]].y - base.y - dots[i].y)
        )
          best = k;
      barOf[i] = best;
      hits.push({
        x: Math.max(
          -half,
          Math.min(half, dots[i].x + (holeHash(i, 2210) - 0.5) * 120),
        ),
        y: (holeHash(i, 2211) - 0.5) * 30,
      });
    }
    states.set(r, {
      dots,
      lands,
      barOf,
      hits,
      strikes,
      blazeAt,
      from: { x: -base.x, y: -base.y },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const base = bars[0];
    const { dots, lands, barOf, hits, strikes, blazeAt } = state;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.4 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    ctx.save();
    ctx.translate(base.x, base.y);
    drawDetonation(ctx, state.from, ms - IN_MS, BLAST, now);
    const blaze = clamp01((ms - blazeAt) / BLAZE_MS);
    const throb =
      blaze > 0
        ? 0.5 + 0.5 * Math.sin(((ms - blazeAt) / 1000) * THROB_HZ * Math.PI * 2)
        : 0;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < dots.length; i++) {
      const fired = lands[i] - FLY_MS;
      if (ms < fired) break;
      const strike = strikes[barOf[i]];
      if (ms >= strike.at) continue;
      const p = dots[i];
      let size = DOT;
      if (ms < lands[i]) {
        const u = (ms - fired) / FLY_MS;
        dot.x = lerp(state.from.x, p.x, u);
        dot.y = lerp(state.from.y, p.y, u);
      } else if (ms < strike.at - STREAK_MS) {
        dot.x = p.x;
        dot.y = p.y;
        size = DOT * (1 + 0.6 * blaze + 0.3 * throb);
      } else {
        // crashing down into its bar
        const u = ((ms - strike.at + STREAK_MS) / STREAK_MS) ** 2;
        const bar = bars[strike.bar];
        dot.x = lerp(p.x, bar.x - base.x + hits[i].x, u);
        dot.y = lerp(p.y, bar.y - base.y + hits[i].y, u);
        size = DOT * 1.5;
      }
      stampGlimmer(
        ctx,
        dot.x,
        dot.y,
        size,
        i,
        blaze > 0.5 || i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    for (let k = 0; k < strikes.length; k++) {
      const bar = bars[strikes[k].bar];
      blast.x = bar.x - base.x;
      blast.y = bar.y - base.y;
      drawDetonation(
        ctx,
        blast,
        ms - strikes[k].at,
        strikes[k].bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
