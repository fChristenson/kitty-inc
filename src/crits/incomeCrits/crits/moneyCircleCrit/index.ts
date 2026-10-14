// Money Circle, an income crit: the green amount slams into the readout and
// a pen of light draws a magic circle flat under it, then its inner ring and
// star; it turns slow then whipping round, a jolt and a share every turn;
// a pillar of light erupts up through the readout with a huge blast, then a
// rattle of blasts across it, a share each
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  registerFloorCrit,
  lerp,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, readoutSpot } from "../shared";

// the amount sliding into the readout, shrinking
const IN_MS = 160;
const IN_SHRINK = 0.4;
const IN_BLAST = 110;
// the circle: BELOW the readout's middle, RADIUS round, erupting ERUPT_MS
// after the amount's in, TURNS turns
const BELOW = 60;
const RADIUS = 300;
const ERUPT_MS = 1200;
const TURNS = 7;
const PILLAR = 360;
const ERUPT_BLAST = 200;
// the rattle across the readout after the eruption
const POPS = 8;
const FIRST_POP_MS = 60;
const POP_GAP_MS = 45;
const POP_BLAST = 60;
// shakes by step: a turn or a pop, the amount in and the eruption, the last
const SHAKES = [0.4, 1.6, 2.4];

interface Plan {
  summon: Summon;
  pops: Point[];
  endMs: number;
}
const plans = new WeakMap<Running, Plan>();
const at: Point = { x: 0, y: 0 };

registerFloorCrit("moneyCircleCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const summon = planSummon(IN_MS + 40, IN_MS + ERUPT_MS, TURNS);
    const endMs = summon.eruptMs + FIRST_POP_MS + POPS * POP_GAP_MS;
    plans.set(r, {
      summon,
      pops: Array.from({ length: POPS }, (_, k) => readoutSpot(to, k, 1980)),
      endMs,
    });
    hit(0, IN_MS, 1);
    for (const rev of summon.revs) hit(0, rev);
    hit(0, summon.eruptMs, 1);
    for (let k = 0; k < POPS; k++)
      hit(0, summon.eruptMs + FIRST_POP_MS + k * POP_GAP_MS);
    hit(0, endMs, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    at.x = to.x;
    at.y = to.y + BELOW;
    drawSummon(ctx, plan.summon, ms, at, RADIUS);
    drawSummonPillar(ctx, plan.summon, ms, at, RADIUS, PILLAR);
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, to.x, p),
        lerp(0, to.y, p),
        r.flashFont * lerp(1, IN_SHRINK, p),
      );
    }
    drawDetonation(ctx, to, ms - IN_MS, IN_BLAST, now);
    const erupt = ms - plan.summon.eruptMs;
    drawDetonation(ctx, to, erupt, ERUPT_BLAST, now);
    for (let k = 0; k < POPS; k++)
      drawDetonation(
        ctx,
        plan.pops[k],
        erupt - FIRST_POP_MS - k * POP_GAP_MS,
        POP_BLAST,
        now,
      );
    drawFinale(ctx, to, ms - plan.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
