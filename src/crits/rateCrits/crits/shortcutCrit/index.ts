// Shortcut, a rate crit: twin gold rings open flat over and under each bar's
// right end; a wisp drops through the bar into the lower ring and falls out
// of the upper one at once, keeping its speed, faster each loop, a pop and a
// jolt at every pass, each pass banking one double payout on the bar; bar by
// bar, its own last with more loops, then the wisp bursts onto its readout
import { bankDoublePayout } from "../../barEffects";
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  type Warp,
  type WarpLeg,
} from "../../../../shared/animationStyles/portal";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the rings: RING across, IN from the bar's right end, RISE over and under
// its middle, opening over OPEN_MS
const RING = 60;
const IN = 110;
const RISE = 110;
const OPEN_MS = 120;
const CLOSE_MS = 150;
// each bar's loops, quickening from LOOP_MS[0] to [1]; its own OWN_LOOPS
const LOOPS = 3;
const OWN_LOOPS = 5;
const LOOP_MS: [number, number] = [300, 100];
// the next bar's rings open STAGGER_MS after the last's, a little sooner
// each time
const STAGGER_MS = 230;
const STAGGER_QUICKEN = 25;
const OUT_MS = 110;
const RUNNER = WISP_SIZE * 0.9;
const OWN_RUNNER = WISP_SIZE * 1.2;
const PASS_SHAKE = 0.4;
const OUT_BLAST = 60;
const OWN_OUT_BLAST = 150;
const TAIL_MS = 800;

interface Loop {
  bar: number;
  opens: number;
  done: number;
  warp: Warp;
}
interface State {
  bars: Point[];
  half: number;
  loops: Loop[];
  passes: number[];
}
const states = new WeakMap<Running, State>();
const runner: Point = { x: 0, y: 0 };
const ring: Point = { x: 0, y: 0 };

const ringAt = (s: State, bar: number, side: -1 | 1, into: Point): Point => {
  into.x = s.bars[bar].x + s.half - IN;
  into.y = s.bars[bar].y + side * RISE;
  return into;
};

registerFloorCrit("shortcutCrit", {
  // each pass banks a double payout
  reward: (t) => bankDoublePayout(t.floor),
  plan(r, bars, hit) {
    const state: State = {
      bars,
      half: r.play.barHalfWidth,
      loops: [],
      passes: [],
    };
    const order = ownLast(bars);
    let opens = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const count = own ? OWN_LOOPS : LOOPS;
      const up: Point = { x: 0, y: 0 };
      const down: Point = { x: 0, y: 0 };
      const upper = () => ringAt(state, bar, -1, up);
      const lower = () => ringAt(state, bar, 1, down);
      const readout = () => state.bars[bar];
      const legs: WarpLeg[] = [];
      let t = opens + OPEN_MS;
      for (let j = 0; j < count; j++) {
        const ms = lerp(LOOP_MS[0], LOOP_MS[1], j / (count - 1));
        legs.push({
          from: upper,
          to: lower,
          startMs: t,
          endMs: t + ms,
          fall: true,
        });
        t += ms;
        state.passes.push(t);
        hit(bar, t, own ? 2 : 1);
      }
      legs.push({ from: upper, to: readout, startMs: t, endMs: t + OUT_MS });
      const done = t + OUT_MS;
      hit(bar, done, 0);
      state.loops.push({ bar, opens, done, warp: planWarp(legs) });
      opens += Math.max(STAGGER_MS / 2, STAGGER_MS - k * STAGGER_QUICKEN);
    });
    state.passes.sort((a, b) => a - b);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // a whoosh and a jolt at every pass
    while (r.kicked < state.passes.length && ms >= state.passes[r.kicked]) {
      r.kicked++;
      r.shake(PASS_SHAKE);
      playSwoosh();
    }
    for (const loop of state.loops) {
      const open =
        clamp01((ms - loop.opens) / OPEN_MS) *
        (1 - clamp01((ms - loop.done) / CLOSE_MS));
      if (open <= 0) continue;
      const own = loop.bar === 0;
      for (const side of [-1, 1] as const) {
        ringAt(state, loop.bar, side, ring);
        drawPortal(ctx, ring, RING, open, now);
        for (const pass of loop.warp.passes)
          drawPortalPass(ctx, ring, ms - pass, RING);
      }
      drawWispHead(
        ctx,
        (m) => loop.warp.at(m, runner),
        ms,
        now,
        own ? OWN_RUNNER : RUNNER,
        0.6,
      );
      drawDetonation(
        ctx,
        bars[loop.bar],
        ms - loop.done,
        own ? OWN_OUT_BLAST : OUT_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
});
