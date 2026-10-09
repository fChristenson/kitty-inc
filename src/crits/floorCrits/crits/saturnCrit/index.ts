// the saturn floor crit: the number becomes a planet wisp ringed by a
// glitter ring that spreads wider and wider; wherever the ring's edge cuts
// across a bar a pair of blasts races out along it both ways, then the ring
// shatters into wisps that slam onto the bars and the planet drops onto its
// own bar in a huge blast
import { COLOR } from "../../../../palette";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";

const SATURN_IN_MS = 300;
const SATURN_GROW_MS = 1300;
const SATURN_BREAK = SATURN_IN_MS + SATURN_GROW_MS;
// the ring starts this wide and spreads past the farthest bar by REACH, at
// most WIDEST of the viewport's width across its middle
const SATURN_START = 120;
const SATURN_REACH = 60;
const SATURN_WIDEST = 0.8;
const SATURN_DOTS = 140;
const SATURN_DOT = 24;
const SATURN_SPIN = 0.004;
// the cuts' blasts race out this often, the ends kept this far in
const SATURN_EVERY_MS = 45;
const SATURN_INSET = 20;
const SATURN_CUT = 120;
const SHARDS = 12;
const SHARD_FLY_MS = 160;
const SHARD_GAP_MS = 40;
const SHARD_LIFT = 200;
const SHARD_SIZE = 0.7;
const SATURN_SLAM = 180;
const SATURN_DROP_MS = 120;
const SATURN_BOOM = 420;
const SATURN_PLANET = 1.6;
const SATURN_SHAKE = 0.4;
const SATURN_SLAM_SHAKE = 1.2;
const SATURN_BOOM_SHAKE = 2.6;
const SATURN_TAIL_MS = 1000;
const TAU = Math.PI * 2;

interface Cut {
  bar: number;
  x: number;
  ms: number;
}

interface Plan {
  rx: number;
  squash: number;
  cuts: Cut[];
}

// the ring's size, and every spot its edge cuts a bar, planned once a run
const planned = new WeakMap<Running, Plan>();
function planOf(r: Running, bars: Point[]): Plan {
  const cached = planned.get(r);
  if (cached) return cached;
  const farthest = Math.max(...bars.map((b) => Math.abs(b.y))) + SATURN_REACH;
  const rx = Math.max(farthest, r.viewportWidth * SATURN_WIDEST);
  const squash = Math.min(1, farthest / rx);
  const half = r.play.barHalfWidth - SATURN_INSET;
  const cuts: Cut[] = [];
  bars.forEach((b, bar) => {
    const dy = Math.abs(b.y);
    let touched = false;
    for (let t = SATURN_IN_MS; t <= SATURN_BREAK; t += SATURN_EVERY_MS) {
      const w = radiusAt(rx, t);
      const ry = w * squash;
      if (ry < dy) continue;
      const off = w * Math.sqrt(1 - (dy / ry) ** 2);
      for (const side of touched ? [-1, 1] : [0]) {
        const x = side * off;
        if (Math.abs(x - b.x) < half) cuts.push({ bar, x, ms: t });
      }
      touched = true;
    }
  });
  const plan = { rx, squash, cuts };
  planned.set(r, plan);
  return plan;
}
const radiusAt = (rx: number, ms: number) =>
  lerp(
    SATURN_START,
    rx,
    1 - (1 - clamp01((ms - SATURN_IN_MS) / SATURN_GROW_MS)) ** 2,
  );
const dotAt = (plan: Plan, i: number, ms: number, into: Point): Point => {
  const a = (i / SATURN_DOTS) * TAU + Math.min(ms, SATURN_BREAK) * SATURN_SPIN;
  const w = radiusAt(plan.rx, ms);
  into.x = Math.cos(a) * w;
  into.y = Math.sin(a) * w * plan.squash;
  return into;
};

// the ring's shards, each onto a bar in turn top to bottom
function shards(r: Running, bars: Point[]) {
  const order = byHeight(bars);
  const plan = planOf(r, bars);
  return Array.from({ length: SHARDS }, (_, k) => {
    const bar = order[k % order.length];
    return {
      bar,
      from: dotAt(plan, Math.round((k / SHARDS) * SATURN_DOTS), SATURN_BREAK, {
        x: 0,
        y: 0,
      }),
      to: along(r, bars, bar, k % 2 ? 0.5 : -0.5),
      lands: SATURN_BREAK + SHARD_FLY_MS + k * SHARD_GAP_MS,
    };
  });
}
const boomAt = () =>
  SATURN_BREAK + SHARD_FLY_MS + SHARDS * SHARD_GAP_MS + SATURN_DROP_MS;

const dot: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const planet: Point = { x: 0, y: 0 };

registerFloorCrit("saturnCrit", {
  plan(r, bars, hit) {
    for (const c of planOf(r, bars).cuts) hit(c.bar, c.ms);
    for (const s of shards(r, bars)) hit(s.bar, s.lands, 1);
    hit(0, boomAt(), 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const plan = planOf(r, bars);
    if (ms < SATURN_IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        lerp(r.flashFont, r.flashFont * 0.4, ms / SATURN_IN_MS),
      );
    if (ms >= SATURN_IN_MS * 0.6 && ms < SATURN_BREAK) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < SATURN_DOTS; i++) {
        dotAt(plan, i, ms, dot);
        stampGlimmer(
          ctx,
          dot.x,
          dot.y,
          SATURN_DOT + (i % 3) * 6,
          now * 0.004 + i,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.restore();
    }
    if (ms >= SATURN_BREAK && r.kicked === 0) {
      r.kicked = 1;
      playExplosion();
    }
    for (const s of shards(r, bars)) {
      const bow = { x: s.from.x, y: Math.min(s.from.y, s.to.y) - SHARD_LIFT };
      drawWispBetween(
        ctx,
        (t) => {
          const u = clamp01((t - SATURN_BREAK) / (s.lands - SATURN_BREAK)) ** 2;
          const a = (1 - u) * (1 - u);
          const b = 2 * (1 - u) * u;
          spot.x = a * s.from.x + b * bow.x + u * u * s.to.x;
          spot.y = a * s.from.y + b * bow.y + u * u * s.to.y;
          return spot;
        },
        ms,
        now,
        WISP_SIZE * SHARD_SIZE,
        0.9,
        SATURN_BREAK,
        s.lands,
      );
      drawDetonation(ctx, s.to, ms - s.lands, SATURN_SLAM, now);
    }
    const boom = boomAt();
    if (ms >= SATURN_IN_MS * 0.6 && ms < boom) {
      const drop =
        clamp01((ms - (boom - SATURN_DROP_MS)) / SATURN_DROP_MS) ** 2;
      planet.x = lerp(0, bars[0].x, drop);
      planet.y = lerp(0, bars[0].y, drop);
      drawWisp(
        ctx,
        () => planet,
        ms,
        now,
        WISP_SIZE * SATURN_PLANET,
        clamp01((ms - SATURN_IN_MS) / SATURN_GROW_MS),
      );
    }
    for (const c of plan.cuts) {
      if (ms < c.ms || ms - c.ms > DETONATION_MS) continue;
      spot.x = c.x;
      spot.y = bars[c.bar].y;
      drawDetonation(ctx, spot, ms - c.ms, SATURN_CUT, now);
    }
    drawDetonation(ctx, bars[0], ms - boom, SATURN_BOOM, now);
  },
  tailMs: SATURN_TAIL_MS,
  shake: (step) =>
    step === 2
      ? SATURN_BOOM_SHAKE
      : step === 1
        ? SATURN_SLAM_SHAKE
        : SATURN_SHAKE,
});
