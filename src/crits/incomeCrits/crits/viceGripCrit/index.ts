// Vice Grip, an income crit: the green amount drops under the total and
// shatters into a ball of glitter; two slabs of light close in on it from
// both sides like a vice and slam it, again and again, quicker and harder,
// each slam a white-hot line down both sides with glitter squeezed out top
// and bottom, cracks of light spreading through it and the ball squashing
// thinner and taller, a share each; the last slam crushes it flat and jets
// of glitter blast straight up into the readout and down, a rattle of
// blasts across it, then the finale
import { COLOR } from "../../../../palette";
import {
  crushAt,
  crusherScale,
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  drawSlab,
  planCrush,
  squashScale,
  tickCrush,
  type Crush,
  type CrushPose,
} from "../../../../shared/animationStyles/crush";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, readoutSpot } from "../shared";

// the amount dropping to BELOW under the total, shattering into the ball:
// BITS specks BALL px round
const DROP_MS = 200;
const BELOW = 380;
const BITS = 70;
const BALL = 150;
const SPECK = 20;
// the slabs: SLAB long, THICK px, wound up LIFT px off the ball
const SLAB = 1.5;
const THICK = 34;
const LIFT = 260;
// the slams: SLAMS from FIRST_MS, GAPS_MS apart (closing)
const FIRST_MS = DROP_MS + 260;
const SLAMS = 7;
const GAPS_MS: [number, number] = [320, 110];
const CRACKS = 180;
// the rattle after the burst
const POPS = 8;
const FIRST_POP_MS = 80;
const POP_GAP_MS = 45;
const POP_BLAST = 110;
const SHATTER_BLAST = 150;
// shakes by step: a slam or a pop, the burst, the finale
const SHAKES = [0.5, 2, 2.6];

interface Plan {
  crush: Crush;
  // each speck in the ball, from its middle
  bits: Point[];
  burstMs: number;
  pops: Point[];
  endMs: number;
}
const plans = new WeakMap<Running, Plan>();
const pose: CrushPose = { crush: 0, lift: 0, since: Infinity, press: -1 };
const squash: Point = { x: 1, y: 1 };
const stretch: Point = { x: 1, y: 1 };
const ball: Point = { x: 0, y: 0 };
const a: Point = { x: 0, y: 0 };
const b: Point = { x: 0, y: 0 };
const contact: Point = { x: 0, y: 0 };

registerFloorCrit("viceGripCrit", {
  plan(r, bars, hit) {
    const crush = planCrush(FIRST_MS, SLAMS, GAPS_MS, 1.6, { bang: false });
    for (let k = 0; k < SLAMS - 1; k++) hit(0, crush.slams[k], 0);
    const burstMs = crush.slams[SLAMS - 1];
    hit(0, burstMs, 1);
    for (let k = 0; k < POPS; k++)
      hit(0, burstMs + FIRST_POP_MS + k * POP_GAP_MS);
    const endMs = burstMs + FIRST_POP_MS + POPS * POP_GAP_MS + 40;
    hit(0, endMs, 2);
    plans.set(r, {
      crush,
      bits: Array.from({ length: BITS }, (_, i) => {
        const t = holeHash(i, 3910) * Math.PI * 2;
        const d = Math.sqrt(holeHash(i, 3911)) * BALL;
        return { x: Math.cos(t) * d, y: Math.sin(t) * d };
      }),
      burstMs,
      pops: Array.from({ length: POPS }, (_, k) =>
        readoutSpot(bars[0], k, 3912),
      ),
      endMs,
    });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    ball.x = to.x;
    ball.y = to.y + BELOW;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, ball.x, p),
        lerp(0, ball.y, p),
        r.flashFont * lerp(1, 0.5, p),
      );
    }
    tickCrush(plan.crush, ms, r.shake);
    crushAt(plan.crush, ms, pose);
    // the crush squashes it across (x) and it bulges up and down (y)
    squashScale(pose.crush, squash);
    const half = BALL * squash.y;
    const tall = BALL * squash.x;
    if (ms >= DROP_MS && ms < plan.burstMs) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      const shatter = Math.min(1, (ms - DROP_MS) / 160);
      for (let i = 0; i < BITS; i++)
        stampGlimmer(
          ctx,
          ball.x + plan.bits[i].x * squash.y * shatter,
          ball.y + plan.bits[i].y * squash.x * shatter,
          SPECK,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      // the slabs, wound up off its sides, stretching as they drive in
      crusherScale(plan.crush, ms, stretch);
      const gap = half + pose.lift * LIFT + THICK / 2;
      const len = tall * SLAB * stretch.x;
      for (let side = -1; side <= 1; side += 2) {
        a.x = b.x = ball.x + side * gap;
        a.y = ball.y - len / 2;
        b.y = ball.y + len / 2;
        drawSlab(ctx, a, b, THICK * stretch.y, 1, now);
      }
      drawCrushStrain(ctx, ball, 0, tall * 2, pose.crush, CRACKS, now);
    }
    // the white-hot lines down both sides at every slam
    if (pose.press >= 0 && ms < plan.burstMs + 300)
      for (let side = -1; side <= 1; side += 2) {
        contact.x = ball.x + side * half;
        contact.y = ball.y;
        drawCrushContact(
          ctx,
          contact,
          side > 0 ? 0 : Math.PI,
          tall * 2,
          pose.since,
          (pose.press + 1) / SLAMS,
          now,
        );
      }
    drawDetonation(ctx, ball, ms - DROP_MS, SHATTER_BLAST, now);
    drawCrushBurst(ctx, ball, 0, tall * 2, ms - plan.burstMs, now);
    for (let k = 0; k < POPS; k++)
      drawDetonation(
        ctx,
        plan.pops[k],
        ms - plan.burstMs - FIRST_POP_MS - k * POP_GAP_MS,
        POP_BLAST,
        now,
      );
    drawFinale(ctx, to, ms - plan.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
