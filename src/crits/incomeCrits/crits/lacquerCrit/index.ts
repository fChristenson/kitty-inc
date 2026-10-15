// Lacquer, an income crit: the number shrinks into a nozzle wisp that darts
// under the total's left end and sprays gold mist up onto the readout's
// bottom stripe as it sweeps across, the coat building behind it; it hops up
// a stripe and sweeps back, faster each pass, a jolt and a blast at every
// end, until the last stripe is coated and the whole readout flashes white
// in the huge blast
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink } from "../shared";

const IN_MS = 150;
// the stripes, bottom to top, from the readout's middle; each pass SIDE px
// either way of it, PASSES_MS each (quickening), hopping up a stripe in HOP_MS
const STRIPES = [30, 10, -10, -30];
const SIDE = 330;
const PASSES_MS = [260, 210, 170, 130];
const HOP_MS = 40;
// the nozzle UNDER px below the stripe it's painting, spraying REACH px up
const UNDER = 110;
const REACH = 100;
const SPRAY = 60;
const NOZZLE = WISP_SIZE * 1.1;
const STRIPE_H = 30;
const COAT = 0.8;
const FLASH_MS = 120;
const FLASH_FADE_MS = 260;
const END_BLAST = 120;
// shakes by step: a pass, the flash
const SHAKES = [0.8, 2.6];

interface Pass {
  y: number;
  from: number;
  to: number;
  startMs: number;
  endMs: number;
}
interface Plan {
  passes: Pass[];
  spray: Spray;
  flashMs: number;
  // the flash's middle, from the total's
  start: Point;
}
const plans = new WeakMap<Running, Plan>();
// the total this frame and the plan the nozzle follows
let total: Point = { x: 0, y: 0 };
let current: Plan | null = null;
const nozzle: Point = { x: 0, y: 0 };
const local: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// the nozzle at ms, from the total's middle
function nozzleLocal(ms: number, into: Point): Point {
  const { passes, start } = current!;
  const first = passes[0];
  if (ms < first.startMs) {
    const u = clamp01(ms / first.startMs);
    into.x = lerp(start.x, first.from, u * u);
    into.y = lerp(start.y, first.y + UNDER, u * u);
    return into;
  }
  let k = 0;
  while (k < passes.length - 1 && ms >= passes[k + 1].startMs) k++;
  const pass = passes[k];
  const u = clamp01((ms - pass.startMs) / (pass.endMs - pass.startMs));
  if (ms <= pass.endMs || k === passes.length - 1) {
    into.x = lerp(pass.from, pass.to, u);
    into.y = pass.y + UNDER;
    return into;
  }
  // hopping up to the next stripe
  const next = passes[k + 1];
  const h = clamp01((ms - pass.endMs) / (next.startMs - pass.endMs));
  into.x = pass.to;
  into.y = lerp(pass.y, next.y, h) + UNDER;
  return into;
}

// on screen, a pure function of ms for the nozzle's trail
function nozzleAt(ms: number): Point {
  nozzleLocal(ms, nozzle);
  nozzle.x += total.x;
  nozzle.y += total.y;
  return nozzle;
}

registerFloorCrit("lacquerCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const passes: Pass[] = [];
    let t = IN_MS;
    STRIPES.forEach((y, k) => {
      const dir = k % 2 ? -1 : 1;
      passes.push({
        y,
        from: -dir * SIDE,
        to: dir * SIDE,
        startMs: t,
        endMs: t + PASSES_MS[k],
      });
      t += PASSES_MS[k];
      hit(0, t, 0);
      t += HOP_MS;
    });
    const last = passes[passes.length - 1];
    const flashMs = last.endMs + FLASH_MS;
    hit(0, flashMs, 1);
    const plan: Plan = {
      passes,
      flashMs,
      start: { x: -to.x, y: -to.y },
      spray: planSpray((ms) => nozzleAt(ms), -Math.PI / 2, {
        startMs: IN_MS,
        endMs: last.endMs,
        reach: REACH,
        spread: 0.3,
        flightMs: 240,
      }),
    };
    plans.set(r, plan);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    total = bars[0];
    current = plan;
    drawNumberShrink(ctx, r, ms);
    const flash = clamp01(1 - (ms - plan.flashMs) / FLASH_FADE_MS);
    // the coat: every stripe painted so far, the current one up to the nozzle
    for (const pass of plan.passes) {
      if (ms < pass.startMs) break;
      const u = clamp01((ms - pass.startMs) / (pass.endMs - pass.startMs));
      const x = lerp(pass.from, pass.to, u);
      spot.x = total.x + (pass.from + x) / 2;
      spot.y = total.y + pass.y;
      drawSprayCoat(
        ctx,
        spot,
        Math.abs(x - pass.from) + STRIPE_H,
        STRIPE_H,
        COAT,
        ms >= plan.flashMs ? flash : 0,
      );
    }
    if (ms < plan.passes[plan.passes.length - 1].endMs) {
      drawSpray(ctx, plan.spray, ms, now, SPRAY);
      nozzleLocal(ms, local);
      spot.x = total.x + local.x;
      spot.y = total.y + local.y - UNDER;
      drawSprayMist(ctx, spot, ms - IN_MS, 1, SPRAY, now);
      drawWisp(ctx, nozzleAt, ms, now, NOZZLE, 0.6);
    }
    for (const pass of plan.passes) {
      spot.x = total.x + pass.to;
      spot.y = total.y + pass.y;
      drawDetonation(ctx, spot, ms - pass.endMs, END_BLAST, now);
    }
    drawFinale(ctx, total, ms - plan.flashMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
