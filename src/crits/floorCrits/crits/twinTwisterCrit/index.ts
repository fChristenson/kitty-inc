// Twin Twister, a floor crit: the number splits and two tornadoes touch down
// at the far ends of the top bar in view; mirror images, they tear inward
// along its two halves and down the building bar by bar, faster and faster,
// each catching the glitter off its half of every bar with a pop and spinning
// it up round itself, a jolt and levels on every half they cross; at the
// bottom they swing in over its own bar and merge into one giant twister,
// spinning flat out, that flings everything back onto the bars in a rattle
// of blasts and collapses onto its own bar in a huge blast
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
import { quicken, quickenAt } from "../../../../shared/easing";
import { playSwoosh } from "../../../../sound";
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
// each twin's half: from END of the bar's half width in to INNER of it
const END = 0.9;
const INNER = 0.06;
// the run down the building, off at a run and accelerating, then swinging
// in over its own bar
const RUN_MS = 1400;
const TWIN = {
  height: 420,
  foot: 22,
  top: 140,
  spinHz: [0.7, 3] as [number, number],
};
// the merged twister: spinning SPIN_MS flat out, then collapsing
const SPIN_MS = 480;
const COLLAPSE_MS = 220;
const GIANT = {
  height: 700,
  foot: 34,
  top: 250,
  spinHz: [3, 5] as [number, number],
};
// the glitter: CATCH specks on each half of each bar
const CATCH = 6;
const SPECK = 20;
// flung back over FLING_MS, each bar FLING_GAP_MS after the last
const FLING_MS = 260;
const FLING_GAP_MS = 45;
// how far up the giant the caught glitter already rides as they merge
const RIDING_MS = 500;
const MERGE_SHAKE = 1.6;
const BAR_BLAST = 120;
const OWN_BLAST = 440;
// shakes by step: a half crossed or a bar's glitter back, its own
const SHAKES = [0.5, 3];

interface Speck {
  bar: number;
  twin: number;
  // on its bar, from its middle
  x: number;
  y: number;
  caughtMs: number;
  seed: number;
  landsMs: number;
}
interface State {
  bars: Point[];
  twins: Tornado[];
  giant: Tornado;
  specks: Speck[];
  mergeMs: number;
  flingMs: number;
  backs: { bar: number; ms: number }[];
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const home: Point = { x: 0, y: 0 };

registerFloorCrit("twinTwisterCrit", {
  // two halves crossed and the glitter back: about a third each
  levels: (count) => Math.ceil(count / 3),
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const own = bars[0];
    const order = bars
      .map((_, i) => i)
      .filter((i) => i > 0)
      .sort((a, b) => bars[a].y - bars[b].y);
    // the left twin's path from bars[0] (the right's is its mirror), and
    // where each bar's run starts along it
    const line: Point[] = [];
    const along: number[] = [];
    const add = (x: number, y: number) => {
      const last = line[line.length - 1];
      along.push(
        last ? along[along.length - 1] + Math.hypot(x - last.x, y - last.y) : 0,
      );
      line.push({ x, y });
    };
    const runs: number[] = [];
    for (const bar of order) {
      const x = bars[bar].x - own.x;
      const y = bars[bar].y - own.y + BAR_HALF_H;
      add(x - half * END, y);
      runs.push(along[along.length - 1]);
      add(x - half * INNER, y);
    }
    add(-half * INNER, BAR_HALF_H);
    const length = along[along.length - 1] || 1;
    const mergeMs = IN_MS + RUN_MS;
    const msAt = (s: number) => IN_MS + RUN_MS * quickenAt(s / length);
    const footOf =
      (mirror: number) =>
      (ms: number, into: Point): Point => {
        const s =
          length * quicken(Math.min(1, Math.max(0, (ms - IN_MS) / RUN_MS)));
        let k = 0;
        while (k < line.length - 2 && along[k + 1] < s) k++;
        const a = line[k];
        const b = line[Math.min(k + 1, line.length - 1)];
        const f = Math.min(1, (s - along[k]) / (along[k + 1] - along[k] || 1));
        const base = state.bars[0];
        into.x = base.x + mirror * (a.x + (b.x - a.x) * f);
        into.y = base.y + a.y + (b.y - a.y) * f;
        return into;
      };
    const twins = [-1, 1].map((m) =>
      planTornado(footOf(m === -1 ? 1 : -1), {
        startMs: IN_MS,
        endMs: mergeMs,
        ...TWIN,
      }),
    );
    const flingMs = mergeMs + SPIN_MS;
    const specks: Speck[] = [];
    const backs: State["backs"] = [];
    const run = half * (END - INNER);
    order.forEach((bar, k) => {
      for (let twin = 0; twin < 2; twin++) {
        const side = twin === 0 ? -1 : 1;
        for (let i = 0; i < CATCH; i++) {
          const v = (i + 0.5) / CATCH;
          const n = (k * 2 + twin) * CATCH + i;
          specks.push({
            bar,
            twin,
            x: side * (half * END - v * run),
            y: (holeHash(n, 4110) * 2 - 1) * BAR_HALF_H * 0.5,
            caughtMs: msAt(runs[k] + v * run),
            seed: holeHash(n, 4111),
            landsMs: flingMs + k * FLING_GAP_MS + FLING_MS,
          });
        }
      }
      // both halves crossed at once, mirror images
      hit(bar, msAt(runs[k] + run / 2), 0);
      backs.push({ bar, ms: flingMs + k * FLING_GAP_MS + FLING_MS });
      hit(bar, flingMs + k * FLING_GAP_MS + FLING_MS, 0);
    });
    hit(0, flingMs, 1);
    const giantFoot = (_ms: number, into: Point): Point => {
      const base = state.bars[0];
      into.x = base.x;
      into.y = base.y + BAR_HALF_H;
      return into;
    };
    const state: State = {
      bars,
      twins,
      giant: planTornado(giantFoot, {
        startMs: mergeMs,
        endMs: flingMs,
        growMs: 140,
        ...GIANT,
      }),
      specks,
      mergeMs,
      flingMs,
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
    const { twins, giant, mergeMs, flingMs } = state;
    if (ms >= mergeMs && r.kicked === 0) {
      r.kicked = 1;
      r.shake(MERGE_SHAKE);
      playSwoosh();
    }
    if (ms < mergeMs) {
      drawTornado(ctx, twins[0], ms);
      drawTornado(ctx, twins[1], ms);
    } else if (ms < flingMs + COLLAPSE_MS)
      drawTornado(
        ctx,
        giant,
        Math.min(ms, flingMs),
        1 - Math.max(0, ms - flingMs) / COLLAPSE_MS,
      );
    // the glitter: on its bar, up its twin, up the giant, or flung back
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
      } else if (ms < mergeMs)
        liftAt(twins[s.twin], ms, s.caughtMs, s.seed, spot);
      else if (ms < s.landsMs - FLING_MS)
        liftAt(giant, Math.min(ms, flingMs), mergeMs - RIDING_MS, s.seed, spot);
      else {
        home.x = bar.x + s.x;
        home.y = bar.y + s.y;
        flingFrom(
          giant,
          flingMs,
          mergeMs - RIDING_MS,
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
    drawDetonation(
      ctx,
      bars[0],
      ms - flingMs,
      lerp(OWN_BLAST, OWN_BLAST, 1),
      now,
    );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
