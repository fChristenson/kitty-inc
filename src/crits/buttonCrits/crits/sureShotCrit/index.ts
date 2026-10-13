// Sure Shot, a button crit: the number bursts into wisps that dive onto
// every button in view, quicker and quicker, each blasting it into a sure
// crit; its own button last, the biggest
import { drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

// the number held a beat, then bursting
const POP_MS = 110;
const POP_BLAST = 130;
// the gap between launches, quickening
const GAP_MS: [number, number] = [150, 70];
const FLY_MS = 260;
// how high a wisp's arc rises over its button
const ARC = 260;
const BLAST = 80;
const OWN_BLAST = 170;
const TAIL_MS = 800;

interface Shot {
  bar: number;
  from: number;
  lands: number;
  path: (ms: number) => Point | null;
}

interface State {
  bars: Point[];
  shots: Shot[];
}

const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };

registerFloorCrit("sureShotCrit", {
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const state: State = { bars, shots: [] };
    let t = POP_MS;
    order.forEach((bar, k) => {
      const from = t;
      const lands = from + FLY_MS;
      t += lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, order.length - 1));
      // an arc from the middle up and over onto the live button, so a
      // scroll carries it along
      const spot: Point = { x: 0, y: 0 };
      const path = (ms: number): Point | null => {
        if (ms < from) return null;
        const to = state.bars[bar];
        const u = Math.min(1, (ms - from) / FLY_MS);
        const p = u * u * (3 - 2 * u);
        const peak = Math.min(0, to.y) - ARC;
        spot.x = to.x * p;
        spot.y = 2 * (1 - p) * p * peak + p * p * to.y;
        return spot;
      };
      state.shots.push({ bar, from, lands, path });
      hit(bar, lands, bar === 0 ? 2 : 1);
    });
    hit(0, POP_MS, 0);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    if (ms < POP_MS) drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont);
    drawDetonation(ctx, ORIGIN, ms - POP_MS, POP_BLAST, now);
    for (const shot of state.shots) {
      const own = shot.bar === 0;
      drawWispBetween(
        ctx,
        shot.path,
        ms,
        now,
        WISP_SIZE * (own ? 1.6 : 1.2),
        0.6,
        shot.from,
        shot.lands,
      );
      drawDetonation(
        ctx,
        bars[shot.bar],
        ms - shot.lands,
        own ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 2.4 : step === 1 ? 0.9 : 0.6),
});
