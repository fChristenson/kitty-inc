// Drain, a floor crit: its own bar's readout opens into a hole that sucks
// the other bars dry, their green tearing loose as glitter and spiralling in,
// a trickle then a flood; wisps breaking away off the bars' ends get yanked
// back; the hole swells, trembles and glows, swallows the last, collapses to
// a point and bursts, wisps flying back onto every bar with its levels
import { COLOR } from "../../../../palette";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawGravityHole } from "../../../../shared/animationStyles/clutter";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawFieldLines } from "../../../../shared/animationStyles/pull";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, otherBars } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the pull from PULL_MS, swallowing the last CHARGE_MS later, then the hole
// collapsing over COLLAPSE_MS and bursting
const PULL_MS = IN_MS + 60;
const CHARGE_MS = 1400;
const COLLAPSE_MS = 120;
const CLIMAX_SHAKE = 1.6;
// the glitter: SPECKS over the other bars, torn off their left FILL of the
// way along, SPREAD px either side, flying in FLY_MS (the late ones quicker),
// winding TWIST rad round the hole as they fall
const SPECKS = 200;
const MIN_SPECKS = 20;
const FILL = 0.6;
const SPREAD = 30;
const FLY_MS: [number, number] = [420, 200];
const TWIST = 3;
const FLATTEN = 0.8;
const SPECK = 24;
// the hole and its field
const HOLE: [number, number] = [60, 280];
const TREMBLE = 14;
const STREAKS = 300;
const GLOW = 300;
const FIELD = 0.7;
const FIELD_SIZE = 50;
const FIELD_LINES = 3;
// the wisps breaking off the bars' ends: BREAKS of them, BREAK_GAP_MS apart,
// out OUT px over OUT_MS, yanked back in BACK_MS
const BREAKS = 3;
const BREAK_AT = 400;
const BREAK_GAP_MS = 280;
const OUT_X = 160;
const OUT_Y = 120;
const OUT_MS = 220;
const BACK_MS = 200;
const BREAK_SHAKE = 0.6;
const WISP = WISP_SIZE * 1.1;
// the burst, then a wisp back onto each other bar, RETURN_GAP_MS apart
const BURST_BLAST = 280;
const HIT_BLAST = 110;
const RETURN_MS = 160;
const RETURN_GAP_MS = 60;
const RETURN_BOW = 300;
const RETURN_WISP = WISP_SIZE * 1.3;
const TAIL_MS = 900;
// shakes by step: a bar's wisp landing, the burst
const SHAKES = [0.9, 2.6];

interface Speck {
  bar: number;
  dx: number;
  dy: number;
  rel: number;
  fly: number;
  dir: number;
}
interface Break {
  bar: number;
  at: number;
  path: (ms: number) => Point | null;
}
interface Return {
  bar: number;
  land: number;
  path: (ms: number) => Point | null;
}
interface State {
  charge: Charge;
  burst: number;
  specks: Speck[];
  breaks: Break[];
  returns: Return[];
  // the bars this frame, for the wisps' paths
  live: Point[];
  hole: Point;
}
const states = new WeakMap<Running, State>();
const speck: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };

// a quadratic curve from a, pulled towards c, onto b, at t, into `into`
function bend(a: Point, c: Point, b: Point, t: number, into: Point): Point {
  const u = 1 - t;
  into.x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
  into.y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
  return into;
}

registerFloorCrit("drainCrit", {
  plan(r, bars, hit) {
    const others = otherBars(bars);
    const half = r.play.barHalfWidth;
    const charge = planCharge(PULL_MS, CHARGE_MS, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
    });
    const swallow = charge.climaxMs;
    const burst = swallow + COLLAPSE_MS;
    const each = Math.max(MIN_SPECKS, Math.floor(SPECKS / others.length));
    const specks: Speck[] = [];
    others.forEach((bar, b) => {
      for (let i = 0; i < each; i++) {
        const fly = lerp(FLY_MS[0], FLY_MS[1], i / each);
        specks.push({
          bar,
          dx: -half + 30 + holeHash(i, 2100 + b) * (2 * half * FILL - 30),
          dy: (holeHash(i, 2200 + b) - 0.5) * 2 * SPREAD,
          rel:
            PULL_MS +
            (swallow - PULL_MS - fly) * Math.sqrt(holeHash(i, 2300 + b)),
          fly,
          dir: i % 2 ? 1 : -1,
        });
      }
    });
    const state: State = {
      charge,
      burst,
      specks,
      breaks: [],
      returns: [],
      live: bars,
      hole: { x: 0, y: 0 },
    };
    const end: Point = { x: 0, y: 0 };
    const out: Point = { x: 0, y: 0 };
    const pull: Point = { x: 0, y: 0 };
    const point: Point = { x: 0, y: 0 };
    state.breaks = others.slice(0, BREAKS).map((bar, k) => {
      const start = PULL_MS + BREAK_AT + k * BREAK_GAP_MS;
      return {
        bar,
        at: start,
        path: (ms: number) => {
          const from = state.live[bar];
          const hole = state.hole;
          end.x = from.x + half - 20;
          end.y = from.y;
          out.x = from.x + half + OUT_X;
          out.y = from.y + (from.y < hole.y ? -OUT_Y : OUT_Y);
          const u = (ms - start) / OUT_MS;
          if (u < 0) return null;
          if (u < 1) return bend(end, out, out, u * u * (3 - 2 * u), point);
          const v = (ms - start - OUT_MS) / BACK_MS;
          if (v >= 1) return null;
          pull.x = out.x;
          pull.y = hole.y;
          return bend(out, pull, hole, v * v, point);
        },
      };
    });
    const bow: Point = { x: 0, y: 0 };
    state.returns = (bars.length > 1 ? others : []).map((bar, k) => {
      const land = burst + RETURN_MS + k * RETURN_GAP_MS;
      return {
        bar,
        land,
        path: (ms: number) => {
          if (ms < burst || ms > land) return null;
          const to = state.live[bar];
          const hole = state.hole;
          bow.x = hole.x + RETURN_BOW;
          bow.y = (hole.y + to.y) / 2;
          return bend(hole, bow, to, (ms - burst) / (land - burst), point);
        },
      };
    });
    hit(0, burst, 1);
    for (const ret of state.returns) hit(ret.bar, ret.land, 0);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { charge, burst } = state;
    state.live = bars;
    const hole = state.hole;
    hole.x = bars[0].x;
    hole.y = bars[0].y;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    tickCharge(charge, ms, r.shake);
    while (
      r.kicked < state.breaks.length &&
      ms >= state.breaks[r.kicked].at + OUT_MS + BACK_MS
    ) {
      r.shake(BREAK_SHAKE);
      r.kicked++;
    }
    const swallow = charge.climaxMs;
    const c = ms >= PULL_MS && ms < swallow ? chargeAt(charge, ms) : 0;
    if (c > 0)
      for (const b of state.breaks)
        drawFieldLines(
          ctx,
          hole,
          bars[b.bar],
          c * FIELD,
          ms,
          FIELD_SIZE,
          FIELD_LINES,
        );
    if (ms >= PULL_MS && ms < swallow) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < state.specks.length; i++) {
        const s = state.specks[i];
        if (ms < s.rel) continue;
        const p = (ms - s.rel) / s.fly;
        if (p >= 1) continue;
        const e = p * p;
        const bar = bars[s.bar];
        const dx = bar.x + s.dx - hole.x;
        const dy = bar.y + s.dy - hole.y;
        const radius = Math.hypot(dx, dy) * (1 - e);
        const a = Math.atan2(dy, dx) + s.dir * TWIST * e;
        speck.x = hole.x + Math.cos(a) * radius;
        speck.y = hole.y + Math.sin(a) * radius * FLATTEN;
        stampGlimmer(
          ctx,
          speck.x,
          speck.y,
          SPECK * (1 - 0.5 * e),
          i,
          i % 3 ? COLOR.moneyGreen : COLOR.heavenlyGold,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    for (const b of state.breaks)
      if (ms >= b.at) drawWisp(ctx, b.path, ms, now, WISP, 0.6);
    if (ms >= PULL_MS && ms < burst) {
      const shrink = 1 - clamp01((ms - swallow) / COLLAPSE_MS);
      const k = ms < swallow ? c : 1;
      trembleAt(k, ms, TREMBLE, shiver);
      at.x = hole.x + shiver.x;
      at.y = hole.y + shiver.y;
      drawChargeStreaks(ctx, hole, k, STREAKS, ms);
      drawGravityHole(ctx, at, lerp(HOLE[0], HOLE[1], k) * shrink, 1, ms, now);
      ctx.globalAlpha = 1;
      drawChargeGlow(ctx, at, k * shrink, GLOW, now);
    }
    drawDetonation(ctx, hole, ms - burst, BURST_BLAST, now);
    for (const ret of state.returns) {
      if (ms >= burst && ms <= ret.land)
        drawWisp(ctx, ret.path, ms, now, RETURN_WISP, 0.8);
      drawDetonation(ctx, bars[ret.bar], ms - ret.land, HIT_BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
