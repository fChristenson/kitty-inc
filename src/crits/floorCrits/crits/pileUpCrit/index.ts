// Pile Up, a floor crit: the number blows apart into glitter strewn along a
// bar; a plough wisp tears in and ploughs it flat out along the bar into a
// heaving pile that slams into the bar's end in a blast, which blows the
// next bar's glitter out onto it just as the plough swings down and tears
// along that one, the other way, quicker each bar; its own bar last, the
// biggest pile and blast
import { COLOR } from "../../../../palette";
import {
  flingOut,
  simulateClean,
  type Swept,
} from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 110;
// the glitter: up to BITS_MAX in all (BITS_BAR a bar), over SPREAD of the
// bar's half width, JITTER px off its middle, blown out over FLING_MS
const BITS_MAX = 360;
const BITS_BAR = 44;
const SPREAD = 0.92;
const JITTER = 26;
const FLING_MS = 160;
const SPECK = 22;
// the plough: RADIUS px round, starting OUT px past a bar's end and stopping
// IN px short of the other, PASS_MS a bar (quickening), swinging onto the
// next while its glitter flies, DASH_MS tearing in from DASH px off
const RADIUS = 50;
const OUT = 70;
const IN = 30;
const PASS_MS: [number, number] = [190, 120];
const DOWN_MS = FLING_MS - 40;
const DASH_MS = 90;
const DASH = 500;
const PLOUGH = WISP_SIZE * 1.5;
// the pile slamming into the bar's end over the pass's last SLAM_MS
const SLAM_MS = 80;
const BLAST = 190;
const OWN_BLAST = 380;
// shakes by step: a bar's pile, its own
const SHAKES = [1, 2.8];

interface Pass {
  bar: number;
  start: number;
  end: number;
  // where it blows its glitter from and where its pile slams in, from bars[0]
  from: Point;
  slam: Point;
  flung: number;
  // its bar's glitter ploughed over its pass
  swept: Swept | null;
  first: number;
}
interface State {
  passes: Pass[];
  // each bit's pass, where it lies and how high it's flung
  passOf: Uint16Array;
  spots: Point[];
  lift: Float32Array;
  plough: (ms: number) => Point | null;
  offset: Point;
}
const states = new WeakMap<Running, State>();
const bit: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("pileUpCrit", {
  plan(r, bars, hit) {
    const base = bars[0];
    const half = r.play.barHalfWidth;
    const order = ownLast(bars);
    const perBar = Math.min(BITS_BAR, Math.floor(BITS_MAX / order.length));
    const passes: Pass[] = [];
    // the plough's legs: from, to, over [t0, t1]
    const legs: { a: Point; b: Point; t0: number; t1: number }[] = [];
    let t = IN_MS + FLING_MS - 40;
    let source: Point = { x: -base.x, y: -base.y };
    order.forEach((bar, k) => {
      const dir = k % 2 ? -1 : 1;
      const y = bars[bar].y - base.y;
      const a = { x: -dir * (half + OUT), y };
      const b = { x: dir * (half - IN), y };
      if (k === 0) {
        legs.push({
          a: { x: a.x - dir * DASH, y },
          b: a,
          t0: t - DASH_MS,
          t1: t,
        });
      } else {
        const prev = legs[legs.length - 1];
        legs.push({ a: prev.b, b: a, t0: t, t1: t + DOWN_MS });
        t += DOWN_MS;
      }
      const ms = lerp(
        PASS_MS[0],
        PASS_MS[1],
        k / Math.max(1, order.length - 1),
      );
      legs.push({ a, b, t0: t, t1: t + ms });
      const slam = { x: dir * half, y };
      passes.push({
        bar,
        start: t,
        end: t + ms,
        from: source,
        slam,
        flung: t - DOWN_MS,
        swept: null,
        first: 0,
      });
      hit(bar, t + ms, bar === 0 ? 1 : 0);
      source = slam;
      t += ms;
    });
    const spots: Point[] = [];
    const passIds: number[] = [];
    passes.forEach((p, k) => {
      const y = bars[p.bar].y - base.y;
      p.first = spots.length;
      for (let i = 0; i < perBar; i++) {
        const n = k * perBar + i;
        spots.push({
          x: (holeHash(n, 3710) * 2 - 1) * half * SPREAD,
          y: y + (holeHash(n, 3711) * 2 - 1) * JITTER,
        });
        passIds.push(k);
      }
    });
    const ploughAt = (ms: number, into: Point): Point | null => {
      if (ms < legs[0].t0 || ms > legs[legs.length - 1].t1) return null;
      let k = 0;
      while (k < legs.length - 1 && ms > legs[k].t1) k++;
      const leg = legs[k];
      const u = Math.min(1, Math.max(0, (ms - leg.t0) / (leg.t1 - leg.t0)));
      into.x = lerp(leg.a.x, leg.b.x, u);
      into.y = lerp(leg.a.y, leg.b.y, u);
      return into;
    };
    for (const p of passes)
      p.swept = simulateClean(
        spots.slice(p.first, p.first + perBar),
        [{ kind: "plough", at: ploughAt, radius: RADIUS }],
        p.start,
        p.end,
      );
    const offset: Point = { x: 0, y: 0 };
    const head: Point = { x: 0, y: 0 };
    states.set(r, {
      passes,
      passOf: Uint16Array.from(passIds),
      spots,
      lift: Float32Array.from(spots, (_, i) => holeHash(i, 3712)),
      plough: (ms) => {
        if (!ploughAt(ms, head)) return null;
        head.x += offset.x;
        head.y += offset.y;
        return head;
      },
      offset,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { passes, passOf, spots, lift } = state;
    const base = bars[0];
    state.offset.x = base.x;
    state.offset.y = base.y;
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
    // a whoosh as the plough tears into each bar
    while (r.kicked < passes.length && ms >= passes[r.kicked].start) {
      playSwoosh();
      r.kicked++;
    }
    ctx.save();
    ctx.translate(base.x, base.y);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < spots.length; i++) {
      const p = passes[passOf[i]];
      if (ms < p.flung || ms >= p.end) continue;
      if (ms < p.flung + FLING_MS) {
        flingOut(p.from, spots[i], lift[i], (ms - p.flung) / FLING_MS, bit);
      } else if (ms < p.end - SLAM_MS) {
        p.swept!.at(i - p.first, ms, bit);
      } else {
        p.swept!.at(i - p.first, p.end - SLAM_MS, bit);
        const u = ((ms - p.end + SLAM_MS) / SLAM_MS) ** 2;
        bit.x = lerp(bit.x, p.slam.x, u);
        bit.y = lerp(bit.y, p.slam.y, u);
      }
      stampGlimmer(
        ctx,
        bit.x,
        bit.y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    from.x = -base.x;
    from.y = -base.y;
    drawDetonation(ctx, from, ms - IN_MS, BLAST, now);
    for (let k = 0; k < passes.length; k++) {
      const p = passes[k];
      spot.x = p.slam.x;
      spot.y = p.slam.y;
      drawDetonation(
        ctx,
        spot,
        ms - p.end,
        p.bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
    ctx.restore();
    const last = passes[passes.length - 1];
    const heat = Math.min(1, (r.kicked + 1) / passes.length);
    if (ms <= last.end) drawWisp(ctx, state.plough, ms, now, PLOUGH, heat);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
