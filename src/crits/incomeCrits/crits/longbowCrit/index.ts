// Longbow, an income crit: the green amount arcs down under the total and
// shrinks into a wisp, strung to both ends of the readout by beams of
// light; it draws back, slow then fast, the strings pulled taut and
// thickening, the wisp trembling harder, its glow swelling and light racing
// into it, the rumble building, until at full draw it's loosed with a bang:
// it shoots up into the readout and bursts across it in a rattle of blasts,
// a share each, the last huge
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
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { drawFinale, readoutSpot } from "../shared";

// the amount arcing down to NOCK under the total, shrinking into the wisp
const IN_MS = 200;
const NOCK = 230;
const ARCH = 220;
// the strings from the readout's ends, ENDS either side, DROP under it
const ENDS = 360;
const DROP = 30;
const STRING: [number, number] = [6, 22];
// the draw: CHARGE_MS long, pulled back DRAW px, trembling TREMBLE px
const CHARGE_MS = 1150;
const DRAW = 360;
const TREMBLE = 14;
const GLOW = 320;
const STREAKS = 300;
const WISP: [number, number] = [1, 2.2];
// loosed: up into the readout over SHOOT_MS, then the rattle
const SHOOT_MS = 110;
const SNAP_MS = 120;
const POPS = 10;
const FIRST_POP_MS = 40;
const POP_GAP_MS = 42;
const POP_BLAST = 110;
const IN_BLAST = 240;
// shakes by step: a pop, the arrow in, the last blast
const SHAKES = [0.5, 1.6, 2.6];

interface Plan {
  charge: Charge;
  loose: number;
  inMs: number;
  endMs: number;
  pops: Point[];
  arrow: (ms: number) => Point | null;
}
const plans = new WeakMap<Running, Plan>();
const left: Point = { x: 0, y: 0 };
const right: Point = { x: 0, y: 0 };
const nock: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
// the total this frame: the arrow reads it
let total: Point = { x: 0, y: 0 };

registerFloorCrit("longbowCrit", {
  plan(r, bars, hit) {
    const charge = planCharge(IN_MS, CHARGE_MS);
    const loose = charge.climaxMs;
    const inMs = loose + SHOOT_MS;
    const endMs = inMs + FIRST_POP_MS + (POPS - 1) * POP_GAP_MS + 60;
    const at: Point = { x: 0, y: 0 };
    const plan: Plan = {
      charge,
      loose,
      inMs,
      endMs,
      pops: Array.from({ length: POPS }, (_, k) =>
        readoutSpot(bars[0], k, 2910),
      ),
      arrow: (ms) => {
        if (ms < IN_MS || ms > inMs) return null;
        const pull = DRAW * chargeAt(charge, ms);
        if (ms < loose) {
          trembleAt(chargeAt(charge, ms), ms, TREMBLE, shiver);
          at.x = total.x + shiver.x;
          at.y = total.y + NOCK + pull + shiver.y;
          return at;
        }
        const u = ((ms - loose) / SHOOT_MS) ** 2;
        at.x = total.x;
        at.y = total.y + (NOCK + DRAW) * (1 - u);
        return at;
      },
    };
    plans.set(r, plan);
    hit(0, inMs, 1);
    for (let k = 0; k < POPS; k++) hit(0, inMs + FIRST_POP_MS + k * POP_GAP_MS);
    hit(0, endMs, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    total = to;
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      const tx = to.x;
      const ty = to.y + NOCK;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        2 * (1 - p) * p * (tx / 2 - ARCH) + p * p * tx,
        2 * (1 - p) * p * (ty / 2) + p * p * ty,
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    tickCharge(plan.charge, ms, r.shake);
    const c = chargeAt(plan.charge, ms);
    const arrow = plan.arrow(ms);
    // the strings, taut to the wisp, then snapping back once it's loosed
    const snap = clamp01((ms - plan.loose) / SNAP_MS);
    if (ms >= IN_MS && snap < 1) {
      left.x = to.x - ENDS;
      right.x = to.x + ENDS;
      left.y = right.y = to.y + DROP;
      nock.x = to.x;
      nock.y =
        ms < plan.loose && arrow
          ? arrow.y
          : lerp(to.y + NOCK + DRAW, to.y + DROP, snap);
      if (ms < plan.loose && arrow) nock.x = arrow.x;
      const width = lerp(STRING[0], STRING[1], c);
      drawBeam(ctx, left, nock, width, 1 - snap);
      drawBeam(ctx, right, nock, width, 1 - snap);
    }
    if (arrow && ms < plan.loose) {
      drawChargeStreaks(ctx, arrow, c, STREAKS, ms);
      drawChargeGlow(ctx, arrow, c, GLOW, now);
    }
    drawWispBetween(
      ctx,
      plan.arrow,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], c),
      c,
      IN_MS,
      plan.inMs,
    );
    drawDetonation(ctx, to, ms - plan.inMs, IN_BLAST, now);
    for (let k = 0; k < POPS; k++)
      drawDetonation(
        ctx,
        plan.pops[k],
        ms - plan.inMs - FIRST_POP_MS - k * POP_GAP_MS,
        POP_BLAST,
        now,
      );
    drawFinale(ctx, to, ms - plan.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
