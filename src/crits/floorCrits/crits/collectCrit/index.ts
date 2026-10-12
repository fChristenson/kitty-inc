// the collect floor crit: a slot machine's cash collect: the number bursts
// over the roof into a hail of gold orbs that slam onto every bar in view
// quick-fire; then a big collector wisp snakes up the building bar by bar,
// bottom to top, every orb it passes zipping into it with a pop as it
// swells, and it dives onto its own bar in a huge blast
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash, skyY } from "../../critPlayer/shared";

const CL_BURST_MS = 200;
const CL_ABOVE = 600;
const CL_BURST = 160;
// the orbs: ORBS_PER_BAR a bar (CL_ORBS at most), landing GAP_MS apart
// after falling FALL_MS from the burst
const CL_ORBS_PER_BAR = 3;
const CL_ORBS: [number, number] = [6, 15];
const CL_FIRST_MS = 260;
const CL_GAP_MS = 45;
const CL_FALL_MS = 160;
const CL_SPREAD = 0.35;
const CL_ORB_GLOW = 50;
const CL_ORB_CORE = 20;
const CL_LAND_BLAST = 60;
// the collector: sweeping each bar's length over SEG_MS a lane LANE over
// it, climbing to the next over CLIMB_MS, swelling with every orb; an orb it
// passes zips in over ZIP_MS
const CL_SWEEP_GAP_MS = 200;
const CL_SEG_MS = 240;
const CL_CLIMB_MS = 70;
const CL_LANE = 80;
const CL_OVERRUN = 60;
const CL_ZIP_MS = 120;
const CL_PICK_BLAST = 55;
const CL_SIZE = WISP_SIZE * 1.4;
const CL_GROW = WISP_SIZE * 0.12;
const CL_GLOW = 70;
const CL_GLOW_GROW = 8;
// the dive onto its own bar
const CL_DIVE_MS = 240;
const CL_DIVE_LIFT = 220;
const CL_BOOM = 220;
const CL_CLUSTER = [-0.6, 0.6, -0.3, 0.3];
const CL_CLUSTER_MS = 45;
const CL_CLUSTER_BLAST = 100;
const CL_KICKED_BOOM = 1e6;
// shakes by step: an orb landing, a pickup, the dive's blast
const CL_SHAKES = [0.5, 0.4, 3];
const CL_TAIL_MS = 1000;

interface Orb {
  bar: number;
  side: number;
  // from where over the bar it falls (of the viewport's width)
  fromX: number;
  at: number;
  pickedAt: number;
}
interface Collect {
  orbs: Orb[];
  // the bars bottom to top, when the sweep starts, dives and blows
  order: number[];
  sweepAt: number;
  diveAt: number;
  boomAt: number;
}
const collects = new WeakMap<Running, Collect>();
const spot: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
// the run and bars being drawn: the collector's path reads them
let drawn: { r: Running; bars: Point[]; plan: Collect } | null = null;

function planCollect(r: Running, bars: Point[]): Collect {
  const order = byHeight(bars).reverse();
  const count = Math.max(
    CL_ORBS[0],
    Math.min(CL_ORBS[1], bars.length * CL_ORBS_PER_BAR),
  );
  const sweepAt = CL_FIRST_MS + (count - 1) * CL_GAP_MS + CL_SWEEP_GAP_MS;
  const half = r.play.barHalfWidth;
  const rank = new Map(order.map((bar, j) => [bar, j]));
  const orbs: Orb[] = [];
  for (let k = 0; k < count; k++) {
    const bar = order[k % order.length];
    const side = holeHash(k, 1310) * 2 - 1;
    // when the collector, sweeping this bar's way, passes it
    const j = rank.get(bar)!;
    const x = side * (half - 120);
    let u = (x + half + CL_OVERRUN) / (2 * (half + CL_OVERRUN));
    if (j % 2) u = 1 - u;
    orbs.push({
      bar,
      side,
      fromX: (holeHash(k, 1311) - 0.5) * CL_SPREAD,
      at: CL_FIRST_MS + k * CL_GAP_MS,
      pickedAt: sweepAt + j * (CL_SEG_MS + CL_CLIMB_MS) + u * CL_SEG_MS,
    });
  }
  const diveAt =
    sweepAt + order.length * (CL_SEG_MS + CL_CLIMB_MS) - CL_CLIMB_MS;
  return { orbs, order, sweepAt, diveAt, boomAt: diveAt + CL_DIVE_MS };
}

// where the collector is ms in (sweeping, climbing, diving), on the bars as
// drawn this frame
function collectorAt(ms: number): Point | null {
  if (!drawn) return null;
  const { r, bars, plan } = drawn;
  if (ms < plan.sweepAt || ms >= plan.boomAt) return null;
  const half = r.play.barHalfWidth + CL_OVERRUN;
  const end = (j: number, start: boolean) => {
    const b = bars[plan.order[j]];
    const ltr = j % 2 === 0;
    return b.x + (ltr === start ? -half : half);
  };
  if (ms >= plan.diveAt) {
    const top = plan.order.length - 1;
    const from = { x: end(top, false), y: bars[plan.order[top]].y - CL_LANE };
    const to = bars[0];
    const p = clamp01((ms - plan.diveAt) / CL_DIVE_MS) ** 2;
    head.x = lerp(from.x, to.x, p);
    head.y = lerp(from.y, to.y, p) - 4 * p * (1 - p) * CL_DIVE_LIFT;
    return head;
  }
  const t = ms - plan.sweepAt;
  const j = Math.min(
    plan.order.length - 1,
    Math.floor(t / (CL_SEG_MS + CL_CLIMB_MS)),
  );
  const local = t - j * (CL_SEG_MS + CL_CLIMB_MS);
  const lane = bars[plan.order[j]].y - CL_LANE;
  if (local < CL_SEG_MS) {
    head.x = lerp(end(j, true), end(j, false), local / CL_SEG_MS);
    head.y = lane;
  } else {
    const next = Math.min(plan.order.length - 1, j + 1);
    head.x = end(j, false);
    head.y = lerp(
      lane,
      bars[plan.order[next]].y - CL_LANE,
      (local - CL_SEG_MS) / CL_CLIMB_MS,
    );
  }
  return head;
}

// an orb's spot ms in: falling from the burst, sitting on its bar, zipping
// into the collector; null before it falls and once it's in
function orbAt(o: Orb, ms: number, sky: number): Point | null {
  if (!drawn) return null;
  const { r, bars } = drawn;
  const fall = (ms - (o.at - CL_FALL_MS)) / CL_FALL_MS;
  if (fall < 0) return null;
  const on = along(r, bars, o.bar, o.side);
  if (fall < 1) {
    spot.x = lerp(o.fromX * r.viewportWidth, on.x, fall);
    spot.y = lerp(sky, on.y, fall * fall);
    return spot;
  }
  if (ms < o.pickedAt) {
    spot.x = on.x;
    spot.y = on.y;
    return spot;
  }
  const z = (ms - o.pickedAt) / CL_ZIP_MS;
  if (z >= 1) return null;
  const c = collectorAt(ms);
  if (!c) return null;
  spot.x = lerp(on.x, c.x, z * z);
  spot.y = lerp(on.y, c.y, z * z);
  return spot;
}

registerFloorCrit("collectCrit", {
  plan(r, bars, hit) {
    const plan = planCollect(r, bars);
    collects.set(r, plan);
    for (const o of plan.orbs) hit(o.bar, o.pickedAt, 1);
    hit(0, plan.boomAt, 2);
    for (let k = 0; k < CL_CLUSTER.length; k++)
      hit(0, plan.boomAt + (k + 1) * CL_CLUSTER_MS, 0);
  },
  draw(ctx, r, ms, bars) {
    const plan = collects.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const sky = skyY(r, bars, CL_ABOVE);
    drawn = { r, bars, plan };
    if (ms >= plan.boomAt && r.kicked < CL_KICKED_BOOM) {
      r.kicked = CL_KICKED_BOOM;
      playExplosion();
    }

    // the number shooting up over the roof and bursting
    if (ms < CL_BURST_MS) {
      const p = (ms / CL_BURST_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, lerp(0, sky, p), r.flashFont, {
        alpha: 1 - p * 0.5,
      });
    }
    spot.x = 0;
    spot.y = sky;
    drawDetonation(ctx, spot, ms - CL_BURST_MS, CL_BURST, now);

    // the orbs: a gold glow with a white-hot core each, in one light batch
    let got = 0;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < plan.orbs.length; i++) {
      const o = plan.orbs[i];
      if (ms >= o.pickedAt + CL_ZIP_MS) got++;
      const at = orbAt(o, ms, sky);
      if (!at) continue;
      const pulse = 1 + 0.15 * Math.sin(now * 0.02 + i);
      stampGlimmer(ctx, at.x, at.y, CL_ORB_GLOW * pulse, i, COLOR.heavenlyGold);
      stampGlimmer(ctx, at.x, at.y, CL_ORB_CORE * pulse, i + 50, COLOR.white);
    }
    endLightBatch(ctx);
    ctx.restore();

    // the collector, swelling with every orb it's taken
    const c = collectorAt(ms);
    if (c) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      stampGlimmer(
        ctx,
        c.x,
        c.y,
        CL_GLOW + CL_GLOW_GROW * got,
        99,
        COLOR.heavenlyGold,
      );
      ctx.restore();
    }
    drawWisp(
      ctx,
      collectorAt,
      ms,
      now,
      CL_SIZE + CL_GROW * got,
      Math.min(1, got / 8),
    );

    // the blasts: orbs landing, pickups, the dive's cluster
    for (const o of plan.orbs) {
      const on = along(r, bars, o.bar, o.side);
      drawDetonation(ctx, on, ms - o.at, CL_LAND_BLAST, now);
      drawDetonation(ctx, on, ms - o.pickedAt, CL_PICK_BLAST, now);
    }
    drawDetonation(ctx, bars[0], ms - plan.boomAt, CL_BOOM, now);
    for (let k = 0; k < CL_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, CL_CLUSTER[k]),
        ms - plan.boomAt - (k + 1) * CL_CLUSTER_MS,
        CL_CLUSTER_BLAST,
        now,
      );
    drawn = null;
  },
  tailMs: CL_TAIL_MS,
  shake: (step) => CL_SHAKES[step] ?? CL_SHAKES[0],
});
