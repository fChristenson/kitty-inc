// Double Time, a rate crit: a pen wisp draws a giant fast-forward sign of
// glitter over the bars in one stroke, faster and faster, a click every few
// dots; it blazes, then bursts into streams of glitter racing onto every
// bar's readout, each turning over: the bar runs three times as fast for
// its next payouts, its own for twice as many
import { defineBarEffect, countDown } from "../../rateBonus";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  drawDots,
  penOrder,
  SHAPES,
  shapeOutline,
} from "../../../../shared/animationStyles/drawing";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
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
import { bottomBarY, topBarY } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the sign: DOTS dots SIZE px from its middle to its tips, drawn by the pen
// from PEN_FROM over PEN_MS, quicker and quicker (each dot's time share to
// PEN_POW), a click every CLICK_EVERY dots
const SIZE = 240;
const DOTS = 150;
const DOT = 26;
const PEN_FROM = IN_MS + 80;
const PEN_MS = 1300;
const PEN_POW = 0.55;
const PEN = WISP_SIZE * 1.3;
const CLICK_EVERY = 15;
const CLICK_SHAKE: [number, number] = [0.25, 0.7];
// the blaze, then the streams: each dot flying FLY_MS onto its bar's readout
// (faster and faster), the dots leaving SPREAD_MS apart in all
const BLAZE_MS = 280;
const FLY_MS = 260;
const SPREAD_MS = 220;
const HIT_GAP_MS = 40;
const BLAZE_BLAST = 260;
const HIT_BLAST = 100;
const OWN_HIT_BLAST = 190;
const TAIL_MS = 900;
// shakes by step: the blaze, a bar, its own
const SHAKES = [1.6, 0.6, 1.2];

const START: Point = { x: -SIZE, y: -SIZE * 0.8 };
const SIGN = penOrder(
  shapeOutline(SHAPES.forward, DOTS, { x: 0, y: 0 }, SIZE),
  START,
);
const LANDS = SIGN.map(
  (_, k) => PEN_FROM + PEN_MS * (k / SIGN.length) ** PEN_POW,
);
const DRAWN = PEN_FROM + PEN_MS;
const STREAM = DRAWN + BLAZE_MS;

interface State {
  // each dot's bar, and the bars' hits
  dotBar: number[];
  hits: { bar: number; at: number }[];
}
const states = new WeakMap<Running, State>();
const centre: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const atHead = () => head;

// payouts left at doubleTimeSpeed times as fast
const doubleTimes = defineBarEffect<number>({
  speed: () => CONFIG.crit.doubleTimeSpeed,
  onPayout: countDown,
});

registerFloorCrit("doubleTimeCrit", {
  // faster for its next payouts, its own more
  reward(t) {
    const payouts = t.own
      ? CONFIG.crit.doubleTimeOwnPayouts
      : CONFIG.crit.doubleTimePayouts;
    doubleTimes.set(t.floor, (doubleTimes.get(t.floor) ?? 0) + payouts);
  },
  plan(r, bars, hit) {
    hit(0, DRAWN, 0);
    const dotBar = SIGN.map((_, k) => k % bars.length);
    const hits = bars.map((_, bar) => ({
      bar,
      at: STREAM + SPREAD_MS + FLY_MS + bar * HIT_GAP_MS,
    }));
    for (const h of hits) hit(h.bar, h.at, h.bar === 0 ? 2 : 1);
    states.set(r, { dotBar, hits });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    while (r.kicked * CLICK_EVERY < SIGN.length) {
      const k = (r.kicked + 1) * CLICK_EVERY - 1;
      if (ms < LANDS[Math.min(k, SIGN.length - 1)]) break;
      r.shake(lerp(CLICK_SHAKE[0], CLICK_SHAKE[1], k / SIGN.length));
      r.kicked++;
    }
    centre.x = bars[0].x;
    centre.y = (topBarY(bars) + bottomBarY(bars)) / 2;
    if (ms < STREAM) {
      let count = 0;
      while (count < SIGN.length && ms >= LANDS[count]) count++;
      ctx.save();
      ctx.translate(centre.x, centre.y);
      drawDots(ctx, SIGN, count, DOT, ms, clamp01((ms - DRAWN) / BLAZE_MS));
      ctx.restore();
      if (count > 0 && count < SIGN.length) {
        head.x = centre.x + SIGN[count - 1].x;
        head.y = centre.y + SIGN[count - 1].y;
        drawWispHead(ctx, atHead, ms, now, PEN, count / SIGN.length);
      }
    } else {
      // the streams onto the readouts
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let k = 0; k < SIGN.length; k++) {
        const start = STREAM + (k / SIGN.length) * SPREAD_MS;
        const u = clamp01((ms - start) / FLY_MS);
        if (u >= 1) continue;
        const to = bars[state.dotBar[k]];
        const e = u * u;
        spot.x = lerp(centre.x + SIGN[k].x, to.x, e);
        spot.y = lerp(centre.y + SIGN[k].y, to.y, e);
        stampGlimmer(
          ctx,
          spot.x,
          spot.y,
          DOT * (1.3 - 0.4 * e),
          k,
          k % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    drawDetonation(ctx, centre, ms - DRAWN, BLAZE_BLAST, now);
    for (const h of state.hits)
      drawDetonation(
        ctx,
        bars[h.bar],
        ms - h.at,
        h.bar === 0 ? OWN_HIT_BLAST : HIT_BLAST,
        now,
      );
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
