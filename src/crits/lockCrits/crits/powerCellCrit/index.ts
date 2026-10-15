// Power Cell, a lock crit: the number lands on the dark locked floor's lock
// as a core of light, and nodes light up in the floor's four corners; one
// after another, quicker and quicker, each fires a pulse along a beam into
// the core, which gathers power: trembling harder, its glow swelling, light
// racing into it, the rumble building, until all four pour in at once and
// it bursts with a bang, blowing the floor open; four wisps leap from it
// onto the new bar, which turns over: it runs overclocked for a while
import { overclockBar } from "../../../rateCrits/barEffects";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number arcing onto the lock
const ARC_MS = 170;
const ARC_RISE = 120;
// the nodes at CORNER_W of the floor's half width and CORNER_H of its half
// height, lighting up over NODE_MS
const CORNER_W = 0.86;
const CORNER_H = 0.7;
const NODE_MS = 160;
const NODE = 30;
// the charge: CHARGE_MS long; the pulses from PULSE_MS on, GAPS_MS apart
// (closing), each racing in over RACE_MS; the last four at once
const CHARGE_MS = 1400;
const PULSE_MS = ARC_MS + 220;
const GAPS_MS: [number, number] = [230, 60];
const PULSES = 12;
const RACE_MS = 140;
const BEAM: [number, number] = [4, 14];
const PULSE = 40;
const PULSE_SHAKE: [number, number] = [0.2, 0.7];
const TREMBLE = 16;
const GLOW = 420;
const STREAKS = 360;
const CORE = WISP_SIZE * 1.4;
const BURST_BLAST = 380;
// the wisps onto the new bar: LEAP_GAP_MS after the burst, LEAP_MS each,
// LEAP_STEP_MS apart
const LEAP_GAP_MS = 140;
const LEAP_MS = 240;
const LEAP_STEP_MS = 50;
const LEAP_RISE = 200;
const WISP = WISP_SIZE * 0.9;
const LAND_BLAST = 120;
// shakes by step: -, the floor bursting open, the overclock
const SHAKES = [0.4, 3.2, 1.2];

interface State {
  // from the lock's middle
  nodes: Point[];
  // each pulse's node and when it reaches the core
  pulses: { node: number; ms: number }[];
  charge: Charge;
  burstMs: number;
  leaps: {
    from: number;
    lands: number;
    to: Point;
    at: (ms: number) => Point | null;
  }[];
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const core: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

registerFloorCrit("powerCellCrit", {
  reward(t) {
    t.flipRate();
    overclockBar(t.floor);
    t.punch("Overclocked!");
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const mid = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x;
    const w = ((FLOOR_X_MAX - FLOOR_X_MIN) / 2) * CORNER_W;
    const h = (FLOOR_H / 2) * CORNER_H;
    const nodes = [
      { x: mid - w, y: -h },
      { x: mid + w, y: -h },
      { x: mid + w, y: h },
      { x: mid - w, y: h },
    ];
    const charge = planCharge(ARC_MS, CHARGE_MS, {
      climaxShake: 0.8,
      bang: false,
    });
    const burstMs = charge.climaxMs;
    const pulses: State["pulses"] = [];
    // the gaps closing, squeezed in before the burst
    const gaps = Array.from({ length: PULSES - 1 }, (_, k) =>
      lerp(GAPS_MS[0], GAPS_MS[1], k / (PULSES - 2)),
    );
    const fit =
      (burstMs - RACE_MS - 80 - PULSE_MS) / gaps.reduce((s, g) => s + g, 0);
    let t = PULSE_MS;
    for (let k = 0; k < PULSES; k++) {
      pulses.push({ node: k % 4, ms: t + RACE_MS });
      t += (gaps[k] ?? 0) * fit;
    }
    // all four at once into the climax
    for (let n = 0; n < 4; n++) pulses.push({ node: n, ms: burstMs });
    hit(0, burstMs, 1);
    const box = getIncomeBarBox(false);
    const barY = box.y + box.height / 2 - lock.y;
    const leaps = nodes.map((_, k) => {
      const from = burstMs + LEAP_GAP_MS + k * LEAP_STEP_MS;
      const lands = from + LEAP_MS;
      const to = {
        x: box.x + box.width * lerp(0.2, 0.8, k / 3) - lock.x,
        y: barY,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        from,
        lands,
        to,
        at: (ms: number): Point | null => {
          if (ms < from || ms > lands) return null;
          const u = (ms - from) / LEAP_MS;
          at.x = to.x * u;
          at.y = to.y * u - LEAP_RISE * 4 * u * (1 - u);
          return at;
        },
      };
    });
    hit(0, leaps[0].lands, 2);
    states.set(r, { nodes, pulses, charge, burstMs, leaps });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
      );
    }
    tickCharge(state.charge, ms, r.shake);
    // a jolt as each pulse lands, harder each
    while (r.kicked < PULSES && ms >= state.pulses[r.kicked].ms)
      r.shake(lerp(PULSE_SHAKE[0], PULSE_SHAKE[1], r.kicked++ / (PULSES - 1)));
    const c = chargeAt(state.charge, ms);
    ctx.save();
    ctx.translate(lock.x, lock.y);
    if (ms >= ARC_MS && ms < state.burstMs) {
      trembleAt(c, ms, TREMBLE, shiver);
      core.x = shiver.x;
      core.y = shiver.y;
      // the beams from the nodes, thickening as it charges
      const lit = clamp01((ms - ARC_MS) / NODE_MS);
      for (const node of state.nodes)
        drawBeam(ctx, node, core, lerp(BEAM[0], BEAM[1], c), 0.35 + 0.4 * c);
      drawChargeStreaks(ctx, core, c, STREAKS, ms);
      drawChargeGlow(ctx, core, c, GLOW, now);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let n = 0; n < state.nodes.length; n++)
        stampGlimmer(
          ctx,
          state.nodes[n].x,
          state.nodes[n].y,
          NODE * lit * (1 + c),
          n,
          COLOR.white,
        );
      // the pulses racing in along the beams
      for (const p of state.pulses) {
        const u = 1 - (p.ms - ms) / RACE_MS;
        if (u < 0 || u >= 1) continue;
        const node = state.nodes[p.node];
        stampGlimmer(
          ctx,
          lerp(node.x, core.x, u),
          lerp(node.y, core.y, u),
          PULSE,
          p.node + 10,
          COLOR.white,
        );
      }
      stampGlimmer(ctx, core.x, core.y, CORE * (1 + c), 0, COLOR.white);
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, ORIGIN, ms - state.burstMs, BURST_BLAST, now);
    for (const leap of state.leaps) {
      drawWispBetween(ctx, leap.at, ms, now, WISP, 1, leap.from, leap.lands);
      drawDetonation(ctx, leap.to, ms - leap.lands, LAND_BLAST, now);
    }
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
