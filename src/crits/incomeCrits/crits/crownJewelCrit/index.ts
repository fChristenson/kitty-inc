// Crown Jewel, an income crit: the green amount slams into the readout and
// seven solid gold pieces of a giant crown fly in round it from all sides,
// turning, each locking in with a clunk, quicker and quicker, a share each;
// complete, it blazes with a bang and flies apart into the readout in a
// rattle of blasts, a share each, the last huge
import { COLOR } from "../../../../palette";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawAssembly,
  fanPieces,
  planAssemble,
  type Assembly,
} from "../../../../shared/animationStyles/assemble";
import { SHAPES } from "../../../../shared/animationStyles/drawing";
import { drawGlow } from "../../../../shared/glowSprite";
import {
  registerFloorCrit,
  lerp,
  drawText,
  glowStops,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, readoutSpot } from "../shared";

// the amount sliding into the readout, shrinking
const IN_MS = 160;
const IN_SHRINK = 0.4;
const IN_BLAST = 110;
// the crown: PIECES wedges, SIZE from its middle, CROWN_BELOW under the
// readout, flying in from REACH out, the last locking LOCK_MS after the amount
const PIECES = 7;
const SIZE = 190;
const CROWN_BELOW = 150;
const REACH = 900;
const FLY_IN = 40;
const LOCK_MS = 900;
// complete: the blaze, then the rattle across the readout
const BLAZE_GAP_MS = 100;
const BLAZE = 560;
const BLAZE_MS = 400;
const BLAZE_BLAST = 160;
const FIRST_POP_MS = 120;
const POP_GAP_MS = 45;
const POP_BLAST = 110;
// shakes by step: a lock or a pop, the amount in and the blaze, the last blast
const SHAKES = [0.5, 1.4, 2.4];

interface Plan {
  crown: Assembly;
  blazeAt: number;
  endMs: number;
  pops: Point[];
}
const plans = new WeakMap<Running, Plan>();
const WHITE = glowStops(COLOR.white);

registerFloorCrit("crownJewelCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const centre = { x: to.x, y: to.y + CROWN_BELOW };
    const crown = planAssemble(
      fanPieces(SHAPES.crown[0], centre, SIZE, PIECES),
      centre,
      SIZE,
      IN_MS + FLY_IN,
      IN_MS + LOCK_MS,
      REACH,
    );
    const blazeAt = crown.doneMs + BLAZE_GAP_MS;
    const endMs = blazeAt + FIRST_POP_MS + PIECES * POP_GAP_MS;
    plans.set(r, {
      crown,
      blazeAt,
      endMs,
      pops: Array.from({ length: PIECES }, (_, k) => readoutSpot(to, k, 1840)),
    });
    hit(0, IN_MS, 1);
    for (const p of crown.pieces) hit(0, p.lockMs);
    hit(0, blazeAt, 1);
    for (let k = 0; k < PIECES; k++)
      hit(0, blazeAt + FIRST_POP_MS + k * POP_GAP_MS);
    hit(0, endMs, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
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
    drawAssembly(ctx, plan.crown, ms, plan.blazeAt);
    const blaze = ms - plan.blazeAt;
    if (blaze >= 0 && blaze < BLAZE_MS) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 1 - blaze / BLAZE_MS;
      drawGlow(ctx, WHITE, plan.crown.centre.x, plan.crown.centre.y, BLAZE);
      ctx.restore();
    }
    drawDetonation(ctx, to, ms - IN_MS, IN_BLAST, now);
    drawDetonation(ctx, plan.crown.centre, blaze, BLAZE_BLAST, now);
    for (let k = 0; k < PIECES; k++)
      drawDetonation(
        ctx,
        plan.pops[k],
        blaze - FIRST_POP_MS - k * POP_GAP_MS,
        POP_BLAST,
        now,
      );
    drawFinale(ctx, to, ms - plan.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
