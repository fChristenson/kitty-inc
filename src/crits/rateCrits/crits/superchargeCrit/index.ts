// Supercharge, a rate crit: a core of light by the bars' left ends gathers
// power, trembling harder and harder, its glow swelling, light racing into
// it and glitter torn off every readout streaming in, quicker and quicker,
// the rumble rising; at the climax it bursts into a shockwave ring racing
// out over the building, faster and faster, every readout turning over as
// it passes: its next payouts three times as big, its own the most
import { defineBarEffect, countDown } from "../../rateBonus";
import { CONFIG } from "../../../../config";
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
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { bottomBarY, topBarY } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the core OUT px left of the bars' left ends, midway down them
const OUT = 60;
const CHARGE_FROM = IN_MS + 60;
const CHARGE_MS = 1300;
const CLIMAX_SHAKE = 2.8;
const TREMBLE = 18;
const STREAKS = 340;
const GLOW = 360;
const WISP = WISP_SIZE * 1.6;
const WISP_GROW = WISP_SIZE * 2;
// the glitter torn off each readout: FEED specks a bar, each trip from
// FEED_MS[0] down to [1] as it charges, FEED_SIZE across
const FEED = 8;
const FEED_MS: [number, number] = [900, 220];
const FEED_SIZE = 26;
// the shockwave: out to REACH px over WAVE_MS, faster and faster (its
// radius the time share to WAVE_POW), WIDTH thick, fading as it goes
const REACH = 1400;
const WAVE_MS = 520;
const WAVE_POW = 1.6;
const WIDTH = 46;
const CORE_WIDTH = 0.3;
const CORE_BLAST = 300;
const HIT_BLAST = 100;
const OWN_HIT_BLAST = 190;
const TAIL_MS = 900;
// shakes by step: unused, a bar, its own
const SHAKES = [0.2, 0.6, 1.2];

interface State {
  charge: Charge;
  hits: { bar: number; at: number }[];
}
const states = new WeakMap<Running, State>();
const core: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const atHead = () => head;

// payouts left at superchargePayout times as big
const supercharges = defineBarEffect<number>({
  payout: () => CONFIG.crit.superchargePayout,
  onPayout: countDown,
});

registerFloorCrit("superchargeCrit", {
  // its next payouts bigger, its own more of them
  reward(t) {
    const payouts = t.own
      ? CONFIG.crit.superchargeOwnPayouts
      : CONFIG.crit.superchargePayouts;
    supercharges.set(t.floor, (supercharges.get(t.floor) ?? 0) + payouts);
  },
  plan(r, bars, hit) {
    const charge = planCharge(CHARGE_FROM, CHARGE_MS, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
    });
    const cx = bars[0].x - r.play.barHalfWidth - OUT;
    const cy = (topBarY(bars) + bottomBarY(bars)) / 2;
    // the wave reaches each readout when its radius does
    const hits = bars.map((bar, i) => {
      const reach = Math.hypot(bar.x - cx, bar.y - cy) / REACH;
      return {
        bar: i,
        at: charge.climaxMs + WAVE_MS * Math.min(1, reach) ** (1 / WAVE_POW),
      };
    });
    for (const h of hits) hit(h.bar, h.at, h.bar === 0 ? 2 : 1);
    states.set(r, { charge, hits });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const { charge } = state;
    const now = r.startedAt + ms;
    const climax = charge.climaxMs;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    tickCharge(charge, ms, r.shake);
    core.x = bars[0].x - r.play.barHalfWidth - OUT;
    core.y = (topBarY(bars) + bottomBarY(bars)) / 2;
    if (ms >= IN_MS && ms < climax) {
      const c = chargeAt(charge, ms);
      // glitter torn off every readout, streaming in quicker and quicker
      const trip = lerp(FEED_MS[0], FEED_MS[1], c);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        for (let k = 0; k < FEED; k++) {
          const u = ((ms + (k / FEED) * trip + i * 97) % trip) / trip;
          const e = u * u;
          stampGlimmer(
            ctx,
            lerp(bar.x, core.x, e),
            lerp(bar.y, core.y, e) - Math.sin(Math.PI * u) * 40,
            FEED_SIZE * (1 - 0.5 * e) * Math.min(1, c * 3),
            k + i * 13,
            k % 3 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
      }
      endLightBatch(ctx);
      ctx.restore();
      trembleAt(c, ms, TREMBLE, shiver);
      head.x = core.x + shiver.x;
      head.y = core.y + shiver.y;
      drawChargeStreaks(ctx, core, c, STREAKS, ms);
      drawChargeGlow(ctx, head, c, GLOW, now);
      drawWispHead(ctx, atHead, ms, now, WISP + WISP_GROW * c, c);
    }
    // the shockwave racing out
    const since = ms - climax;
    if (since >= 0 && since < WAVE_MS) {
      const u = since / WAVE_MS;
      const radius = REACH * u ** WAVE_POW;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(core.x, core.y, radius, 0, Math.PI * 2);
      ctx.globalAlpha = 0.7 * (1 - u);
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.lineWidth = WIDTH * (1 - 0.5 * u);
      ctx.stroke();
      ctx.globalAlpha = 1 - u;
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = WIDTH * CORE_WIDTH;
      ctx.stroke();
      ctx.restore();
    }
    drawDetonation(ctx, core, since, CORE_BLAST, now);
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
