// Thread The Needle, a floor crit: gold rings stand up at both ends of every
// bar; a wisp shoots along the top bar into its right ring and bursts out of
// the left ring of the bar below at once, threading the building top to
// bottom and round again, faster and faster, levels on every bar it runs;
// then it loops its own bar three times flat out and stops dead in its
// middle in the biggest blast
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  type Warp,
  type WarpLeg,
} from "../../../../shared/animationStyles/portal";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  byHeight,
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const IN_MS = 160;
// the rings PAST the bars' ends, RING px from middle to rim, opening over
// OPEN_MS and closing CLOSE_MS after the last run
const PAST = 50;
const RING = 70;
const OPEN_MS = 140;
const CLOSE_MS = 200;
// ROUNDS rounds of the bars top to bottom, each run from RUN_MS[0] to [1]
// (quicker with more than RUN_BARS bars), then its own bar's LAPS and the
// run into its middle
const START_MS = IN_MS + 160;
const ROUNDS = 2;
const RUN_MS: [number, number] = [420, 130];
const RUN_BARS = 4;
const LAPS = [100, 80, 60];
const LAST_MS = 90;
const WISP = WISP_SIZE * 1.2;
const WISP_GROW = WISP_SIZE * 0.8;
const RUN_BLAST = 60;
const END_BLAST = 260;
const TAIL_MS = 1000;
// shakes by step: a run, the last
const SHAKES = [0.5, 2.6];

interface State {
  warp: Warp;
  // where each leg starts and ends, resolved per frame
  rings: number[];
  runs: { bar: number; end: number }[];
  live: Point[];
}
const states = new WeakMap<Running, State>();
const PASS_MS = 300;
const SIDES = [-1, 1];
const ORIGIN: Point = { x: 0, y: 0 };
const into: Point = { x: 0, y: 0 };

registerFloorCrit("threadTheNeedleCrit", {
  // it runs each bar twice
  levels: (count) => Math.ceil(count / 2),
  plan(r, bars, hit) {
    const reach = r.play.barHalfWidth + PAST;
    const state: State = {
      warp: null as unknown as Warp,
      rings: byHeight(bars),
      runs: [],
      live: bars,
    };
    // each bar's left and right ring, followed as the bars scroll
    const ringAt = (i: number, side: number) => {
      const spot: Point = { x: 0, y: 0 };
      return () => {
        spot.x = state.live[i].x + side * reach;
        spot.y = state.live[i].y;
        return spot;
      };
    };
    const left = bars.map((_, i) => ringAt(i, -1));
    const right = bars.map((_, i) => ringAt(i, 1));
    const middle = () => state.live[0];
    const legs: WarpLeg[] = [];
    let t = START_MS;
    const run = (bar: number, ms: number, to = right[bar]) => {
      legs.push({ from: left[bar], to, startMs: t, endMs: t + ms });
      t += ms;
      state.runs.push({ bar, end: t });
    };
    const order = state.rings;
    const count = ROUNDS * order.length;
    const quicker = Math.min(1, RUN_BARS / order.length);
    for (let k = 0; k < count; k++)
      run(
        order[k % order.length],
        lerp(RUN_MS[0], RUN_MS[1], k / Math.max(1, count - 1)) * quicker,
      );
    for (const ms of LAPS) run(0, ms);
    run(0, LAST_MS, middle);
    state.warp = planWarp(legs);
    state.runs.forEach((run, k) =>
      hit(run.bar, run.end, k === state.runs.length - 1 ? 1 : 0),
    );
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    state.live = bars;
    const { warp } = state;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const reach = r.play.barHalfWidth + PAST;
    const open =
      clamp01((ms - IN_MS) / OPEN_MS) *
      (1 - clamp01((ms - warp.endMs) / CLOSE_MS));
    for (const bar of state.rings) {
      const at = bars[bar];
      for (const side of SIDES) {
        ctx.save();
        ctx.translate(at.x + side * reach, at.y);
        ctx.rotate(Math.PI / 2);
        if (open > 0) drawPortal(ctx, ORIGIN, RING, open, now);
        // each pass dives into a bar's right ring and out of the next run's
        // bar's left one
        for (let k = 0; k < warp.passes.length; k++) {
          const since = ms - warp.passes[k];
          if (since < 0 || since > PASS_MS) continue;
          const run = side === 1 ? state.runs[k] : state.runs[k + 1];
          if (run.bar === bar) drawPortalPass(ctx, ORIGIN, since, RING);
        }
        ctx.restore();
      }
    }
    const u = clamp01((ms - START_MS) / (warp.endMs - START_MS));
    if (ms >= START_MS && ms <= warp.endMs)
      drawWispHead(
        ctx,
        (m) => warp.at(m, into),
        ms,
        now,
        WISP + WISP_GROW * u,
        u,
      );
    for (let k = 0; k < state.runs.length; k++) {
      const run = state.runs[k];
      const last = k === state.runs.length - 1;
      drawDetonation(
        ctx,
        last ? bars[0] : bars[run.bar],
        ms - run.end,
        last ? END_BLAST : RUN_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
