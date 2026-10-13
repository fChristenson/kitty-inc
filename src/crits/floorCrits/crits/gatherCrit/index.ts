// the gather floor crit: the number drops onto its own bar's end as a wisp
// and charges, ripping sparks off every other bar in view that stream into
// it, each rip a jolt and that bar's levels at once, quicker and quicker as
// the wisp trembles and swells and light races into it; at the climax it
// tears back along its own bar in a rattle of blasts, a huge one last
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
} from "../../critPlayer";
import { holeHash, otherBars } from "../../critPlayer/shared";

const GA_IN_MS = 240;
// along a bar from its middle (of its half width less its rounded end)
const GA_END = 1;
const GA_INSET = 120;
// the charge: from the wisp landing till the climax
const GA_CHARGE_MS = 950;
const GA_CLIMAX_MS = GA_IN_MS + GA_CHARGE_MS;
const GA_WISP: [number, number] = [1.2, 2.4];
const GA_TREMBLE = 12;
const GA_GLOW = 340;
const GA_STREAKS = 300;
// the sparks: TEARS_PER_BAR off each other bar (GA_TEARS in all), ripped
// quicker and quicker, each flying FLY_MS into the wisp bowed LIFT
const GA_TEARS_PER_BAR = 3;
const GA_TEARS: [number, number] = [6, 15];
const GA_TEAR_FROM_MS = 60;
const GA_TEAR_EASE = 0.6;
const GA_FLY_MS: [number, number] = [340, 150];
const GA_LIFT = 120;
const GA_SPARK = WISP_SIZE * 0.7;
const GA_RIP_BLAST = 45;
// the run back along its own bar: RUN blasts EVERY_MS apart, then the boom
// and its cluster
const GA_RUN = 8;
const GA_RUN_DELAY_MS = 30;
const GA_EVERY_MS = 45;
const GA_RUN_BLAST = 90;
const GA_RUNNER = WISP_SIZE * 1.8;
const GA_BOOM_DELAY_MS = 80;
const GA_BOOM = 220;
const GA_CLUSTER = [-0.6, 0.6, -0.3, 0.3];
const GA_CLUSTER_BLAST = 100;
// shakes by step: a rip, a run blast, the boom
const GA_SHAKES = [0.4, 0.9, 3];
const GA_TAIL_MS = 1000;

interface Tear {
  bar: number;
  side: number;
  at: number;
  lands: number;
  path: (ms: number) => Point | null;
}
interface Gather {
  charge: Charge;
  tears: Tear[];
  runEnd: number;
  boomAt: number;
  runner: (ms: number) => Point | null;
}
const gathers = new WeakMap<Running, Gather>();
const spot: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
// the run and bars being drawn: the paths read them
let drawn: { r: Running; bars: Point[]; plan: Gather } | null = null;

// where along bar it is at side -1..1, into `into`
function alongBar(
  r: Running,
  bars: Point[],
  bar: number,
  side: number,
  into: Point,
): Point {
  into.x = bars[bar].x + side * (r.play.barHalfWidth - GA_INSET);
  into.y = bars[bar].y;
  return into;
}

// the charging wisp on its own bar's end, trembling as it charges
function wispAt(ms: number, into: Point): Point | null {
  if (!drawn) return null;
  const { r, bars, plan } = drawn;
  alongBar(r, bars, 0, GA_END, into);
  trembleAt(chargeAt(plan.charge, ms), ms, GA_TREMBLE, shiver);
  into.x += shiver.x;
  into.y += shiver.y;
  return into;
}
const charging = (ms: number) =>
  ms < GA_IN_MS || ms > GA_CLIMAX_MS ? null : wispAt(ms, head);

function planGather(bars: Point[]): Gather {
  const others = otherBars(bars);
  const count = Math.max(
    GA_TEARS[0],
    Math.min(GA_TEARS[1], others.length * GA_TEARS_PER_BAR),
  );
  const first = GA_IN_MS + GA_TEAR_FROM_MS;
  const span = GA_CLIMAX_MS - first;
  const tears: Tear[] = [];
  for (let k = 0; k < count; k++) {
    const u = (k / count) ** GA_TEAR_EASE;
    const at = first + span * u;
    const tear: Tear = {
      bar: others[k % others.length],
      side: holeHash(k, 1410) * 1.6 - 0.8,
      at,
      lands: Math.min(at + lerp(...GA_FLY_MS, u), GA_CLIMAX_MS - 10),
      path: () => null,
    };
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 0, y: 0 };
    const spark: Point = { x: 0, y: 0 };
    tear.path = (ms) => {
      if (!drawn || ms < tear.at || ms > tear.lands) return null;
      alongBar(drawn.r, drawn.bars, tear.bar, tear.side, from);
      if (!wispAt(ms, to)) return null;
      const p = clamp01((ms - tear.at) / (tear.lands - tear.at)) ** 2;
      const top = Math.min(from.y, to.y) - GA_LIFT;
      const q = 1 - p;
      spark.x =
        q * q * from.x + 2 * q * p * ((from.x + to.x) / 2) + p * p * to.x;
      spark.y = q * q * from.y + 2 * q * p * top + p * p * to.y;
      return spark;
    };
    tears.push(tear);
  }
  const runStart = GA_CLIMAX_MS + GA_RUN_DELAY_MS;
  const runEnd = runStart + (GA_RUN - 1) * GA_EVERY_MS;
  const runAt: Point = { x: 0, y: 0 };
  return {
    charge: planCharge(GA_IN_MS, GA_CHARGE_MS),
    tears,
    runEnd,
    boomAt: runEnd + GA_BOOM_DELAY_MS,
    runner: (ms) => {
      if (!drawn || ms < GA_CLIMAX_MS || ms > runEnd) return null;
      const u = (ms - GA_CLIMAX_MS) / (runEnd - GA_CLIMAX_MS);
      return alongBar(drawn.r, drawn.bars, 0, lerp(GA_END, -GA_END, u), runAt);
    },
  };
}

const runSide = (k: number) => lerp(GA_END, -GA_END, k / (GA_RUN - 1));

registerFloorCrit("gatherCrit", {
  plan(r, bars, hit) {
    const plan = planGather(bars);
    gathers.set(r, plan);
    for (const tear of plan.tears) hit(tear.bar, tear.at, 0);
    for (let k = 0; k < GA_RUN; k++)
      hit(0, GA_CLIMAX_MS + GA_RUN_DELAY_MS + k * GA_EVERY_MS, 1);
    hit(0, plan.boomAt, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = gathers.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    drawn = { r, bars, plan };
    tickCharge(plan.charge, ms, r.shake);
    const c = chargeAt(plan.charge, ms);

    // the number dropping onto its bar's end, shrinking into the wisp
    if (ms < GA_IN_MS) {
      const p = (ms / GA_IN_MS) ** 2;
      alongBar(r, bars, 0, GA_END, spot);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        spot.x * p,
        spot.y * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (ms >= GA_IN_MS && ms < GA_CLIMAX_MS && wispAt(ms, spot)) {
      drawChargeStreaks(ctx, spot, c, GA_STREAKS, ms);
      drawChargeGlow(ctx, spot, c, GA_GLOW, now);
    }

    // the sparks ripped off the other bars, then the wisp itself
    for (const tear of plan.tears) {
      drawDetonation(
        ctx,
        alongBar(r, bars, tear.bar, tear.side, spot),
        ms - tear.at,
        GA_RIP_BLAST,
        now,
      );
      drawWispBetween(
        ctx,
        tear.path,
        ms,
        now,
        GA_SPARK,
        0.4,
        tear.at,
        tear.lands,
      );
    }
    if (ms >= GA_IN_MS && ms < GA_CLIMAX_MS)
      drawWisp(ctx, charging, ms, now, WISP_SIZE * lerp(...GA_WISP, c), c);

    // the climax: tearing back along its own bar, then the boom
    drawDetonation(
      ctx,
      alongBar(r, bars, 0, GA_END, spot),
      ms - GA_CLIMAX_MS,
      GA_RUN_BLAST,
      now,
    );
    drawWispBetween(
      ctx,
      plan.runner,
      ms,
      now,
      GA_RUNNER,
      1,
      GA_CLIMAX_MS,
      plan.runEnd,
    );
    for (let k = 0; k < GA_RUN; k++)
      drawDetonation(
        ctx,
        alongBar(r, bars, 0, runSide(k), spot),
        ms - GA_CLIMAX_MS - GA_RUN_DELAY_MS - k * GA_EVERY_MS,
        GA_RUN_BLAST,
        now,
      );
    drawDetonation(ctx, bars[0], ms - plan.boomAt, GA_BOOM, now);
    for (let k = 0; k < GA_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        alongBar(r, bars, 0, GA_CLUSTER[k], spot),
        ms - plan.boomAt - (k + 1) * GA_EVERY_MS,
        GA_CLUSTER_BLAST,
        now,
      );
    drawn = null;
  },
  tailMs: GA_TAIL_MS,
  shake: (step) => GA_SHAKES[step] ?? GA_SHAKES[0],
});
