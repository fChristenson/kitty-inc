// Zero Hour, a floor crit: the number bursts into time bombs that fly onto
// the left end of every bar in view; their dials of light run down together,
// beeping in unison, faster and faster, every beep a flash and a jolt, the
// bombs trembling and swelling; at zero they blow in a chain down the
// building, each tearing along its bar in a ripple of blasts with levels,
// its own last in the biggest blast
import {
  DETONATION_MS,
  drawDetonation,
  drawTimeBomb,
  planTimeBomb,
  tickTimeBomb,
  type TimeBomb,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
} from "../../critPlayer";
import { ownLast } from "../../critPlayer/shared";

const IN_MS = 140;
// the bombs flying onto each bar's left end (END of its half width) over
// FLY_MS, STAGGER_MS apart
const END = 0.82;
const FLY_MS = 200;
const STAGGER_MS = 35;
const BOMB = 58;
// the countdown: FUSE_MS, BEEPS beeps
const FUSE_MS = 1500;
const BEEPS = 13;
// the chain: a bar CHAIN_MS after the one above, its blast BLAST, then
// RIPPLE blasts along it RIPPLE_MS apart
const CHAIN_MS = 80;
const BLAST = 220;
const RIPPLE = 5;
const RIPPLE_MS = 40;
const RIPPLE_BLAST = 120;
const OWN_RIPPLE = 8;
const OWN_BLAST = 440;
// shakes by step: a bar blowing, its own
const SHAKES = [1, 3.2];

interface State {
  bars: Point[];
  order: number[];
  bomb: TimeBomb;
  blows: number[];
  flights: ((ms: number) => Point | null)[];
  // how many ripples each bar runs, and where its ripple k is (from its bar)
  ripples: number[];
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };

registerFloorCrit("zeroHourCrit", {
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const order = ownLast(bars);
    const bomb = planTimeBomb(
      IN_MS + FLY_MS + order.length * STAGGER_MS,
      FUSE_MS,
      BEEPS,
    );
    const blows = order.map((_, k) => bomb.blowMs + k * CHAIN_MS);
    order.forEach((bar, k) => hit(bar, blows[k], bar === 0 ? 1 : 0));
    const state: State = {
      bars,
      order,
      bomb,
      blows,
      flights: order.map((bar, k) => {
        const from = IN_MS + k * STAGGER_MS;
        const lands = from + FLY_MS;
        const spot: Point = { x: 0, y: 0 };
        return (ms: number): Point | null => {
          if (ms < from || ms > lands) return null;
          const u = (ms - from) / FLY_MS;
          const b = state.bars[bar];
          spot.x = (b.x - half * END) * u;
          spot.y = b.y * u - 160 * 4 * u * (1 - u);
          return spot;
        };
      }),
      ripples: order.map((bar) => (bar === 0 ? OWN_RIPPLE : RIPPLE)),
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    const half = r.play.barHalfWidth;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - 0.6 * p), {
        alpha: 1 - p,
      });
    }
    const { order, bomb, blows } = state;
    // one bomb's beeps for all: they beep in unison
    tickTimeBomb(bomb, ms, r.shake);
    for (let k = 0; k < order.length; k++) {
      const b = bars[order[k]];
      drawWispBetween(
        ctx,
        state.flights[k],
        ms,
        now,
        WISP_SIZE * 0.9,
        0.6,
        IN_MS,
        IN_MS + k * STAGGER_MS + FLY_MS,
      );
      at.x = b.x - half * END;
      at.y = b.y;
      if (ms >= IN_MS + k * STAGGER_MS + FLY_MS && ms < blows[k])
        drawTimeBomb(ctx, bomb, at, Math.min(ms, bomb.blowMs - 1), now, BOMB);
      drawDetonation(
        ctx,
        at,
        ms - blows[k],
        order[k] === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
    // the ripples tearing along each bar from its bomb, one flat loop
    for (let n = 0; n < order.length * OWN_RIPPLE; n++) {
      const k = (n / OWN_RIPPLE) | 0;
      const j = n % OWN_RIPPLE;
      if (j >= state.ripples[k]) continue;
      const b = bars[order[k]];
      at.x =
        b.x -
        half * END +
        ((j + 1) / state.ripples[k]) * half * (1 + END) * 0.95;
      at.y = b.y;
      drawDetonation(
        ctx,
        at,
        ms - blows[k] - (j + 1) * RIPPLE_MS,
        RIPPLE_BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS + OWN_RIPPLE * RIPPLE_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
