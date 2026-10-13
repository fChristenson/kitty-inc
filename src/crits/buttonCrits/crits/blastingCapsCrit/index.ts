// Blasting Caps, a button crit: the number bursts into bomb wisps lobbed
// onto every button in view, fuses lit; the first blows and its spark races
// on to set off the next, top to bottom, each button left gold, its taps
// then landing two levels each; the crit's own blows into a cluster of
// bomblets round it, then the biggest blast
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const POP_MS = 100;
const POP_BLAST = 120;
// bombs lobbed one after another, each flying FLY_MS on an arc ARC high
const LOB_GAP_MS = 70;
const FLY_MS = 260;
const ARC = 240;
// the fuses burn this long after the last lands; then each blow sets off
// the next a spark's run later, quickening
const FUSE_MS = 320;
const CHAIN_MS: [number, number] = [210, 120];
const SPARK_ARC = 80;
const FUSE = 60;
const BLAST = 110;
const OWN_BLAST = 140;
// the own bomb's cluster: bomblets flung round it, blowing one by one, then
// the biggest blast
const BOMBLETS = 4;
const FLING_MS = 120;
const BOMBLET_GAP_MS = 45;
const CLUSTER_X = 240;
const CLUSTER_Y = 130;
const BOMBLET_BLAST = 110;
const HUGE_GAP_MS = 40;
const HUGE_BLAST = 260;
const TAIL_MS = 900;

interface Bomb {
  bar: number;
  launch: number;
  lands: number;
  blows: number;
}

interface State {
  bars: Point[];
  bombs: Bomb[];
  huge: number;
  lob: ((ms: number) => Point | null)[];
  stuck: (() => Point)[];
  spark: ((ms: number) => Point | null)[];
  fling: ((ms: number) => Point | null)[];
  blowlets: number[];
}

const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

const clusterSpot = (own: Point, k: number, into: Point) => {
  const a = Math.PI / 4 + (k * Math.PI) / 2;
  into.x = own.x + Math.cos(a) * CLUSTER_X;
  into.y = own.y + Math.sin(a) * CLUSTER_Y;
  return into;
};

registerFloorCrit("blastingCapsCrit", {
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const state: State = {
      bars,
      bombs: [],
      huge: 0,
      lob: [],
      stuck: [],
      spark: [],
      fling: [],
      blowlets: [],
    };
    order.forEach((bar, k) => {
      const launch = POP_MS + k * LOB_GAP_MS;
      state.bombs.push({ bar, launch, lands: launch + FLY_MS, blows: 0 });
      const at: Point = { x: 0, y: 0 };
      // lobbed onto its live button
      state.lob.push((ms) => {
        if (ms < launch || ms > launch + FLY_MS) return null;
        const to = state.bars[bar];
        const u = (ms - launch) / FLY_MS;
        at.x = to.x * u;
        at.y = to.y * u - (Math.max(0, -to.y) * 0.2 + ARC) * 4 * u * (1 - u);
        return at;
      });
      state.stuck.push(() => state.bars[bar]);
    });
    const { bombs } = state;
    let t = bombs[bombs.length - 1].lands + FUSE_MS;
    bombs.forEach((bomb, k) => {
      bomb.blows = t;
      if (k < bombs.length - 1) hit(bomb.bar, t, 1);
      t += lerp(CHAIN_MS[0], CHAIN_MS[1], k / Math.max(1, bombs.length - 2));
    });
    // each blow's spark racing to the next bomb
    for (let k = 0; k + 1 < bombs.length; k++) {
      const from = bombs[k];
      const to = bombs[k + 1];
      const at: Point = { x: 0, y: 0 };
      state.spark.push((ms) => {
        if (ms < from.blows || ms > to.blows) return null;
        const a = state.bars[from.bar];
        const b = state.bars[to.bar];
        const u = (ms - from.blows) / (to.blows - from.blows);
        at.x = lerp(a.x, b.x, u);
        at.y = lerp(a.y, b.y, u) - SPARK_ARC * 4 * u * (1 - u);
        return at;
      });
    }
    // the own bomb's blow, its bomblets and the biggest blast: the reward
    const own = bombs[bombs.length - 1];
    hit(0, own.blows, 0);
    for (let k = 0; k < BOMBLETS; k++) {
      const blows = own.blows + FLING_MS + k * BOMBLET_GAP_MS;
      state.blowlets.push(blows);
      hit(0, blows, 0);
      const at: Point = { x: 0, y: 0 };
      const end: Point = { x: 0, y: 0 };
      state.fling.push((ms) => {
        if (ms < own.blows || ms > blows) return null;
        const from = state.bars[0];
        clusterSpot(from, k, end);
        const u = Math.min(1, (ms - own.blows) / FLING_MS);
        at.x = lerp(from.x, end.x, u);
        at.y = lerp(from.y, end.y, u) - 60 * 4 * u * (1 - u);
        return at;
      });
    }
    state.huge = state.blowlets[BOMBLETS - 1] + HUGE_GAP_MS;
    hit(0, state.huge, 2);
    hit(0, POP_MS, 0);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    if (ms < POP_MS) drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont);
    drawDetonation(ctx, ORIGIN, ms - POP_MS, POP_BLAST, now);
    const { bombs } = state;
    for (let k = 0; k < bombs.length; k++) {
      const bomb = bombs[k];
      const at = bars[bomb.bar];
      drawWispBetween(
        ctx,
        state.lob[k],
        ms,
        now,
        WISP_SIZE * 1.15,
        0.5,
        bomb.launch,
        bomb.lands,
      );
      if (ms >= bomb.lands && ms < bomb.blows) {
        drawWisp(ctx, state.stuck[k], ms, now, WISP_SIZE * 1.15, 0.5);
        drawLitFuse(
          ctx,
          at,
          (ms - bomb.lands) / (bomb.blows - bomb.lands),
          FUSE,
          now,
        );
      }
      if (k + 1 < bombs.length)
        drawWispBetween(
          ctx,
          state.spark[k],
          ms,
          now,
          WISP_SIZE * 0.7,
          1,
          bomb.blows,
          bombs[k + 1].blows,
        );
      drawDetonation(
        ctx,
        at,
        ms - bomb.blows,
        bomb.bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
    const own = bombs[bombs.length - 1];
    for (let k = 0; k < BOMBLETS; k++) {
      drawWispBetween(
        ctx,
        state.fling[k],
        ms,
        now,
        WISP_SIZE * 0.9,
        0.6,
        own.blows,
        state.blowlets[k],
      );
      drawDetonation(
        ctx,
        clusterSpot(bars[0], k, spot),
        ms - state.blowlets[k],
        BOMBLET_BLAST,
        now,
      );
    }
    drawDetonation(ctx, bars[0], ms - state.huge, HUGE_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 3 : step === 1 ? 1.2 : 0.8),
});
