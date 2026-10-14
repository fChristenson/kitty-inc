// Heartthrob, an income crit: the green amount drops under the total and
// shrinks into a gun wisp that fires bursts of glitter up round the readout,
// every dot flying to its place in a giant heart's outline, each burst
// longer and quicker than the last, a muzzle flash, a click and a jolt each;
// the finished heart blazes, then caves in onto the total, bursting across
// it in a rattle of blasts, a share each, the last huge
import { COLOR } from "../../../../palette";
import { drawMuzzleFlash } from "../../../../shared/animationStyles/bullets";
import {
  drawDots,
  shapeOutline,
  SHAPES,
} from "../../../../shared/animationStyles/drawing";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { drawFinale, readoutSpot } from "../shared";

// the amount dropping to GUN under the total, shrinking into the gun wisp
const DROP_MS = 200;
const GUN = 720;
// the heart: DOTS round its outline, HEART px from its middle, DOWN under
// the total
const DOTS = 190;
const HEART = 300;
const DOWN = 290;
const DOT = 20;
// the bursts: BURSTS from FIRST_MS, each BURST_MS long and GAP_MS after the
// last (both closing), every dot flying FLY_MS
const FIRST_MS = DROP_MS + 80;
const BURSTS = 8;
const BURST_MS: [number, number] = [240, 120];
const GAP_MS: [number, number] = [140, 30];
const FLY_MS = 140;
const MUZZLE_MS = 90;
const MUZZLE = 170;
// blazing, then caving in onto the total over CAVE_MS, then the rattle
const BLAZE_MS = 280;
const CAVE_MS = 170;
const POPS = 8;
const FIRST_POP_MS = 40;
const POP_GAP_MS = 45;
const POP_BLAST = 110;
const IN_BLAST = 240;
// shakes by step: a burst or a pop, the heart in, the last blast
const SHAKES = [0.5, 1.6, 2.6];

interface Plan {
  // from the total, in the order they're fired
  dots: Point[];
  firedAt: Float32Array;
  bursts: number[];
  landed: number;
  doneMs: number;
  caveAt: number;
  inMs: number;
  endMs: number;
  pops: Point[];
}
const plans = new WeakMap<Running, Plan>();
const GUN_AT: Point = { x: 0, y: GUN };
const gunAt = () => GUN_AT;
const UP = -Math.PI / 2;
const ORIGIN: Point = { x: 0, y: 0 };

registerFloorCrit("heartthrobCrit", {
  plan(r, bars, hit) {
    const dots = shapeOutline(SHAPES.heart, DOTS, { x: 0, y: DOWN }, HEART);
    const firedAt = new Float32Array(dots.length);
    const per = Math.ceil(dots.length / BURSTS);
    const bursts: number[] = [];
    let t = FIRST_MS;
    for (let k = 0; k < BURSTS; k++) {
      const u = k / (BURSTS - 1);
      const ms = lerp(BURST_MS[0], BURST_MS[1], u);
      const first = k * per;
      const last = Math.min(dots.length, first + per);
      for (let i = first; i < last; i++)
        firedAt[i] = t + ((i - first) / Math.max(1, last - first)) * ms;
      bursts.push(t);
      hit(0, t + ms + FLY_MS, 0);
      t += ms + lerp(GAP_MS[0], GAP_MS[1], u);
    }
    const doneMs = firedAt[dots.length - 1] + FLY_MS;
    const caveAt = doneMs + BLAZE_MS;
    const inMs = caveAt + CAVE_MS;
    const endMs = inMs + FIRST_POP_MS + (POPS - 1) * POP_GAP_MS + 60;
    hit(0, inMs, 1);
    for (let k = 0; k < POPS; k++) hit(0, inMs + FIRST_POP_MS + k * POP_GAP_MS);
    hit(0, endMs, 2);
    plans.set(r, {
      dots,
      firedAt,
      bursts,
      landed: 0,
      doneMs,
      caveAt,
      inMs,
      endMs,
      pops: Array.from({ length: POPS }, (_, k) =>
        readoutSpot(bars[0], k, 3410),
      ),
    });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, to.x, p),
        lerp(0, to.y + GUN, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    const { dots, firedAt } = plan;
    while (plan.landed < dots.length && ms >= firedAt[plan.landed] + FLY_MS)
      plan.landed++;
    ctx.save();
    ctx.translate(to.x, to.y);
    // the gun, flashing at every burst
    if (ms >= DROP_MS && ms < plan.doneMs) {
      drawWispHead(
        ctx,
        gunAt,
        ms,
        now,
        WISP_SIZE * 1.3,
        (ms - DROP_MS) / (plan.doneMs - DROP_MS),
      );
      for (let k = 0; k < plan.bursts.length; k++)
        drawMuzzleFlash(
          ctx,
          GUN_AT,
          UP,
          (ms - plan.bursts[k]) / MUZZLE_MS,
          MUZZLE,
        );
    }
    if (ms < plan.caveAt) {
      drawDots(
        ctx,
        dots,
        plan.landed,
        DOT,
        ms,
        clamp01((ms - plan.doneMs) / BLAZE_MS),
      );
      // the dots still flying up to their places
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = plan.landed; i < dots.length; i++) {
        const u = (ms - firedAt[i]) / FLY_MS;
        if (u < 0) break;
        stampGlimmer(
          ctx,
          lerp(GUN_AT.x, dots[i].x, u),
          lerp(GUN_AT.y, dots[i].y, u),
          DOT,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    } else if (ms < plan.inMs) {
      // caving in onto the readout
      const u = ((ms - plan.caveAt) / CAVE_MS) ** 2;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < dots.length; i++)
        stampGlimmer(
          ctx,
          dots[i].x * (1 - u),
          dots[i].y * (1 - u),
          DOT * 1.4,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, ORIGIN, ms - plan.inMs, IN_BLAST, now);
    ctx.restore();
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
