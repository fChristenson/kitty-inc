// Dust Devil, a floor crit: the number shrinks away and a tornado of glitter
// touches down on the top bar in view, small and lazy; it snakes down the
// building, along each bar and down onto the next, faster and faster, its
// rings spinning up to a blur and the funnel swelling, every speck of
// glitter it passes torn off its bar with a pop and spun up round it, a jolt
// and levels on each bar it crosses; at its own bar it rips loose: it flings
// everything it caught back onto the bars in a rattle of blasts and
// collapses onto its own bar in a huge blast
import {
  drawTornado,
  flingFrom,
  liftAt,
  planTornado,
  type Tornado,
} from "../../../../shared/animationStyles/tornado";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash } from "../../critPlayer/shared";

const IN_MS = 160;
// the foot's path: along each bar END in from its ends, down to the next,
// over RUN_MS, speeding up as u^RUSH
const END = 0.85;
const RUN_MS = 2000;
const RUSH = 1.5;
// the funnel
const HEIGHT = 520;
const FOOT = 26;
const TOP = 170;
const SPIN_HZ: [number, number] = [0.7, 3.6];
// the glitter: CATCH specks along each bar it crosses
const CATCH = 10;
const SPECK = 20;
// the climax: everything flung back over FLING_MS, each bar's FLING_GAP_MS
// after the last; the funnel collapsing over COLLAPSE_MS
const FLING_MS = 280;
const FLING_GAP_MS = 45;
const COLLAPSE_MS = 220;
const BAR_BLAST = 130;
const OWN_BLAST = 420;
// shakes by step: a bar crossed, a bar's glitter back, its own
const SHAKES = [0.6, 0.9, 3];

interface Speck {
  bar: number;
  // along its bar, from its middle
  x: number;
  y: number;
  caughtMs: number;
  seed: number;
  landsMs: number;
}
interface State {
  bars: Point[];
  tornado: Tornado;
  specks: Speck[];
  endMs: number;
  // each bar's glitter back
  backs: { bar: number; ms: number }[];
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const home: Point = { x: 0, y: 0 };

registerFloorCrit("dustDevilCrit", {
  // half the levels as it crosses, half as the glitter comes back
  levels: (count) => Math.ceil(count / 2),
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth * END;
    const order = bars
      .map((_, i) => i)
      .filter((i) => i > 0)
      .sort((a, b) => bars[a].y - bars[b].y);
    // the path, from bars[0], and each point's distance along it
    const base = bars[0];
    const line: Point[] = [];
    const along: number[] = [];
    const add = (x: number, y: number) => {
      const last = line[line.length - 1];
      along.push(
        last ? along[along.length - 1] + Math.hypot(x - last.x, y - last.y) : 0,
      );
      line.push({ x, y });
    };
    // where each crossed bar's run starts along the path, and its way
    const runs: { bar: number; s: number; dir: number }[] = [];
    order.forEach((bar, k) => {
      const dir = k % 2 ? -1 : 1;
      const y = bars[bar].y - base.y + BAR_HALF_H;
      const x = bars[bar].x - base.x;
      add(x - dir * half, y);
      runs.push({ bar, s: along[along.length - 1], dir });
      add(x + dir * half, y);
    });
    add(0, BAR_HALF_H);
    const length = along[along.length - 1] || 1;
    const endMs = IN_MS + RUN_MS;
    const msAt = (s: number) => IN_MS + RUN_MS * (s / length) ** (1 / RUSH);
    const foot = (ms: number, into: Point): Point => {
      const u = Math.min(1, Math.max(0, (ms - IN_MS) / RUN_MS));
      const s = length * u ** RUSH;
      let k = 0;
      while (k < line.length - 2 && along[k + 1] < s) k++;
      const a = line[k];
      const b = line[Math.min(k + 1, line.length - 1)];
      const f = (s - along[k]) / (along[k + 1] - along[k] || 1);
      const own = state.bars[0];
      into.x = own.x + a.x + (b.x - a.x) * Math.min(1, f);
      into.y = own.y + a.y + (b.y - a.y) * Math.min(1, f);
      return into;
    };
    const specks: Speck[] = [];
    const backs: State["backs"] = [];
    runs.forEach(({ bar, s, dir }, k) => {
      for (let i = 0; i < CATCH; i++) {
        const v = (i + 0.5) / CATCH;
        specks.push({
          bar,
          x: lerp(-half, half, dir > 0 ? v : 1 - v),
          y: (holeHash(i + k * CATCH, 3710) * 2 - 1) * BAR_HALF_H * 0.5,
          caughtMs: msAt(s + v * 2 * half),
          seed: holeHash(i + k * CATCH, 3711),
          landsMs: endMs + k * FLING_GAP_MS + FLING_MS,
        });
      }
      hit(bar, msAt(s + half), 0);
      backs.push({ bar, ms: endMs + k * FLING_GAP_MS + FLING_MS });
      hit(bar, endMs + k * FLING_GAP_MS + FLING_MS, 1);
    });
    hit(0, endMs, 2);
    const state: State = {
      bars,
      tornado: planTornado(foot, {
        startMs: IN_MS,
        endMs,
        height: HEIGHT,
        foot: FOOT,
        top: TOP,
        spinHz: SPIN_HZ,
      }),
      specks,
      endMs,
      backs,
    };
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
    const { tornado, endMs } = state;
    if (ms < endMs + COLLAPSE_MS)
      drawTornado(
        ctx,
        tornado,
        Math.min(ms, endMs),
        1 - Math.max(0, ms - endMs) / COLLAPSE_MS,
      );
    // the glitter: lying on its bar, spun up the funnel, or flung back
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < state.specks.length; i++) {
      const s = state.specks[i];
      if (ms >= s.landsMs) continue;
      const bar = bars[s.bar];
      if (ms < s.caughtMs) {
        spot.x = bar.x + s.x;
        spot.y = bar.y + s.y;
      } else if (ms < s.landsMs - FLING_MS) {
        liftAt(tornado, Math.min(ms, endMs), s.caughtMs, s.seed, spot);
      } else {
        home.x = bar.x + s.x;
        home.y = bar.y + s.y;
        flingFrom(
          tornado,
          endMs,
          s.caughtMs,
          s.seed,
          home,
          (ms - s.landsMs + FLING_MS) / FLING_MS,
          spot,
        );
      }
      stampGlimmer(
        ctx,
        spot.x,
        spot.y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    for (const b of state.backs)
      drawDetonation(ctx, bars[b.bar], ms - b.ms, BAR_BLAST, now);
    drawDetonation(ctx, bars[0], ms - endMs, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
