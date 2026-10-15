// Ripple Effect, a rate crit: a drop falls onto the top readout in view and
// rings out flat along its bar; the ring spills over the bar's end and drips
// a drop onto the readout of the bar below, whose ring spills onto the next,
// on down the building, each landing turning its readout over under a
// flash, the drips quickening into a cascade as more drops rain in from
// above; then one huge drop, gathered high over its own readout, plunges
// onto it: a double ring, a second wave and the blast. For a while each
// payout of a rippled bar ripples down: the open floor below it (the ground
// floor's: the one above) gets its next payout doubled
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import {
  drawDrop,
  drawRipple,
  drawSplash,
  rainTimes,
} from "../../../../shared/animationStyles/ripple";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSpinTick } from "../../../../sound";
import { punchIncomeBar } from "../../../../floors/incomePanel";
import {
  byHeight,
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number shrinking into the first drop FIRST_FALL px over the top
// readout over IN_MS, falling over FIRST_FALL_MS
const IN_MS = 150;
const FIRST_FALL = 300;
const FIRST_FALL_MS = 140;
// a readout READOUT of a bar's half width out from its middle; a ring
// spreads RING of the half width, spilling over the bar's end SPILL_U of
// the way through its life
const READOUT = 0.6;
const RING = 0.75;
const SPILL_U = 1 - Math.sqrt(1 - (1 - READOUT) / RING);
// down the cascade: ring lives, drips' falls, ring widths and drip sizes
// going from [0] to [1], all within CASCADE_MAX
const RING_MS: [number, number] = [440, 210];
const DRIP_MS: [number, number] = [150, 65];
const RING_W: [number, number] = [9, 16];
const DRIP: [number, number] = [16, 28];
const CASCADE_MAX = 1100;
// own bar alone: the rain alone runs ALONE_MS
const ALONE_MS = 600;
const SPILL_SPLASH = 8;
const SPLASH = 14;
const FLASH = 120;
const FLASH_SQUASH = 0.45;
const FLASH_MS = 240;
// drops raining in from above, SKY_DROPS[0] + SKY_PER a bar up to
// SKY_DROPS[1], the gaps closing SKY_GAPS ms, JITTER px off the readout
const SKY_DROPS: [number, number] = [6, 24];
const SKY_PER = 3;
const SKY_GAPS: [number, number] = [150, 18];
const SKY_FALL = 220;
const SKY_FALL_MS = 110;
const SKY_DROP = 15;
const SKY_SPLASH = 8;
const SKY_RING = 0.35;
const SKY_RING_W = 6;
const JITTER = 60;
// the huge drop gathering SKY px over its own readout from FORM_LEAD ms
// before the last ring spills, letting go HANG_MS after, falling over
// BIG_FALL_MS; swelling FORM px, trembling TREMBLE px, glowing GLOW px
const SKY = 640;
const FORM_LEAD = 360;
const HANG_MS = 100;
const BIG_FALL_MS = 170;
const FORM: [number, number] = [20, 110];
const TREMBLE = 12;
const GLOW = 320;
const BIG_DROP = 110;
const BIG_SPLASH = 38;
const BIG_SPLASH_MS = 520;
const BIG_RIPPLE = 1.3;
const BIG_RIPPLE_W = 30;
const BIG_RIPPLE_MS = 640;
// the second wave WAVE_MS behind, WAVE times as far
const WAVE_MS = 130;
const WAVE = 1.6;
const BIG_BLAST = 320;
// shakes by step: a raindrop, a cascade landing, the huge drop
const SHAKES = [0.25, 1, 3];

interface SkyDrop {
  bar: number;
  // from the readout
  x: number;
  landMs: number;
}
interface State {
  // the cascade's bars top to bottom, when each lands, its ring's life and
  // when it spills
  order: number[];
  lands: number[];
  lives: number[];
  spills: number[];
  sky: SkyDrop[];
  dropMs: number;
  bigMs: number;
  charge: Charge;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const FLASH_STOPS = fadeStops(COLOR.heavenlyGold, 0.3);
const BONUS_LABEL = `Ripple x${meta.values.bonus}`;

interface Pending {
  floor: Floor;
  color: string;
}

// a floor's next payout `bonus` times as big, once
const rippled = defineBarEffect<Pending>({
  payout: () => meta.values.bonus,
  onPayout: (v) => {
    punchIncomeBar(v.floor, BONUS_LABEL, v.color);
    return undefined;
  },
});

// each payout of its bar till `until` rippling onto `to`'s next payout
const rippling = defineBarEffect<{ until: number; pending: Pending }>({
  ended: (v, now) => now >= v.until,
  onPayout: (v) => {
    const to = v.pending.floor;
    if (to.unlocked && !rippled.has(to)) rippled.set(to, v.pending);
    return v;
  },
});

registerFloorCrit("rippleEffectCrit", {
  reward(t) {
    t.flipRate();
    const i = t.floors.indexOf(t.floor);
    let to: Floor | undefined = t.floors[i - 1];
    if (!to?.unlocked) to = t.floors[i + 1];
    if (!to?.unlocked) return;
    rippling.set(t.floor, {
      until: t.now + meta.values.ms,
      pending: { floor: to, color: t.color },
    });
    t.punch("Ripples");
  },
  plan(r, bars, hit) {
    const order = byHeight(bars);
    order.splice(order.indexOf(0), 1);
    const n = order.length;
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const f = n > 1 ? k / (n - 1) : 0;
      sum += lerp(RING_MS[0], RING_MS[1], f) * SPILL_U;
      if (k < n - 1) sum += lerp(DRIP_MS[0], DRIP_MS[1], f);
    }
    const scale = Math.min(1, CASCADE_MAX / Math.max(1, sum));
    const lands: number[] = [];
    const lives: number[] = [];
    const spills: number[] = [];
    let at = IN_MS + FIRST_FALL_MS;
    for (let k = 0; k < n; k++) {
      const f = n > 1 ? k / (n - 1) : 0;
      const life = lerp(RING_MS[0], RING_MS[1], f) * scale;
      lands.push(at);
      lives.push(life);
      spills.push(at + life * SPILL_U);
      hit(order[k], at, 1);
      at += life * SPILL_U + lerp(DRIP_MS[0], DRIP_MS[1], f) * scale;
    }
    const lastSpill = n ? spills[n - 1] : IN_MS + ALONE_MS;
    const formMs = Math.max(IN_MS, lastSpill - FORM_LEAD);
    const dropMs = lastSpill + HANG_MS;
    const bigMs = dropMs + BIG_FALL_MS;
    // the rain joining in, quickening, squeezed in before the huge drop
    const count = Math.min(SKY_DROPS[1], SKY_DROPS[0] + SKY_PER * n);
    const from = (n ? lands[0] : IN_MS) + 80;
    const to = dropMs - 40;
    const times = rainTimes(count, from, SKY_GAPS);
    const fit = (to - from) / Math.max(1, times[count - 1] - from);
    const sky: SkyDrop[] = [];
    for (let k = 0; k < count; k++) {
      const bar = n ? order[Math.floor(Math.random() * n)] : 0;
      const landMs = from + (times[k] - from) * fit;
      sky.push({ bar, x: (Math.random() * 2 - 1) * JITTER, landMs });
      hit(bar, landMs, 0);
    }
    hit(0, bigMs, 2);
    states.set(r, {
      order,
      lands,
      lives,
      spills,
      sky,
      dropMs,
      bigMs,
      charge: planCharge(formMs, dropMs - formMs, {
        bang: false,
        climaxShake: 1,
      }),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { order, lands, lives, spills, sky, dropMs, bigMs } = state;
    const n = order.length;
    const half = r.play.barHalfWidth;
    const own = bars[0];
    const ownX = own.x + half * READOUT;
    const top = n ? bars[order[0]] : own;
    const topX = top ? top.x + half * READOUT : ownX;
    const topY = top ? top.y : own.y;
    // the number shrinking into the first drop over the top readout
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        topX * u,
        (topY - FIRST_FALL) * u,
        r.flashFont * (1 - 0.8 * u),
        { alpha: 1 - u * u },
      );
    }
    // a tick as each cascade ring lands, rising
    while (r.kicked < n && ms >= lands[r.kicked]) {
      playSpinTick(1 + 0.12 * r.kicked);
      r.kicked++;
    }
    // the rings, flat along each bar
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < sky.length; k++) {
      const drop = sky[k];
      const bar = bars[drop.bar];
      if (!bar || ms < drop.landMs) continue;
      spot.x = bar.x + half * READOUT + drop.x;
      spot.y = bar.y;
      drawRipple(ctx, spot, ms - drop.landMs, half * SKY_RING, SKY_RING_W);
    }
    for (let k = 0; k < n; k++) {
      const bar = bars[order[k]];
      if (!bar || ms < lands[k]) continue;
      const f = n > 1 ? k / (n - 1) : 0;
      spot.x = bar.x + half * READOUT;
      spot.y = bar.y;
      drawRipple(
        ctx,
        spot,
        ms - lands[k],
        half * RING,
        lerp(RING_W[0], RING_W[1], f),
        2,
        lives[k],
      );
    }
    spot.x = ownX;
    spot.y = own.y;
    drawRipple(
      ctx,
      spot,
      ms - bigMs,
      half * BIG_RIPPLE,
      BIG_RIPPLE_W,
      2,
      BIG_RIPPLE_MS,
    );
    drawRipple(
      ctx,
      spot,
      ms - bigMs - WAVE_MS,
      half * BIG_RIPPLE * WAVE,
      BIG_RIPPLE_W * 0.6,
      2,
      BIG_RIPPLE_MS,
    );
    ctx.restore();
    // the huge drop's glow as it gathers
    const c = chargeAt(state.charge, ms);
    tickCharge(state.charge, ms, r.shake);
    if (c > 0 && ms < dropMs) {
      trembleAt(c, ms, TREMBLE, shiver);
      spot.x = ownX + shiver.x;
      spot.y = own.y - SKY + shiver.y;
      drawChargeGlow(ctx, spot, c, GLOW, now);
    }
    // the drops, drips, splashes and reward flashes
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (n && top) {
      spot.x = topX;
      spot.y = topY;
      drawDrop(ctx, spot, lands[0] - ms, FIRST_FALL_MS, FIRST_FALL, DRIP[0]);
    }
    for (let k = 0; k < n; k++) {
      const bar = bars[order[k]];
      if (!bar) continue;
      const f = n > 1 ? k / (n - 1) : 0;
      const size = lerp(DRIP[0], DRIP[1], f);
      const since = ms - lands[k];
      spot.x = bar.x + half * READOUT;
      spot.y = bar.y;
      drawSplash(ctx, spot, since, SPLASH * (1 + f * 0.5), 7);
      if (since >= 0 && since < FLASH_MS) {
        const q = since / FLASH_MS;
        ctx.globalAlpha = 1 - q;
        drawGlow(
          ctx,
          FLASH_STOPS,
          spot.x,
          spot.y,
          FLASH * (0.6 + 0.6 * q),
          FLASH_SQUASH,
        );
        ctx.globalAlpha = 1;
      }
      // spilling over the end, then dripping onto the next readout
      const spilled = ms - spills[k];
      if (spilled < 0) continue;
      const endX = bar.x + half;
      spot.x = endX;
      drawSplash(ctx, spot, spilled, SPILL_SPLASH, 5);
      const next = k + 1 < n ? bars[order[k + 1]] : undefined;
      if (!next || ms >= lands[k + 1]) continue;
      const u = spilled / (lands[k + 1] - spills[k]);
      const toX = next.x + half * READOUT;
      const x = lerp(endX, toX, u);
      const y = lerp(bar.y, next.y, u * u);
      stampGlimmer(
        ctx,
        lerp(endX, toX, u * 0.8),
        lerp(bar.y, next.y, u * u * 0.64),
        size * 0.5,
        2,
        COLOR.heavenlyGold,
      );
      stampGlimmer(ctx, x, y, size, 3, COLOR.white);
    }
    for (let k = 0; k < sky.length; k++) {
      const drop = sky[k];
      const until = drop.landMs - ms;
      if (until > SKY_FALL_MS) continue;
      const bar = bars[drop.bar];
      if (!bar) continue;
      spot.x = bar.x + half * READOUT + drop.x;
      spot.y = bar.y;
      drawDrop(ctx, spot, until, SKY_FALL_MS, SKY_FALL, SKY_DROP);
      drawSplash(ctx, spot, -until, SKY_SPLASH, 5);
    }
    if (c > 0 && ms < dropMs)
      stampGlimmer(
        ctx,
        ownX + shiver.x,
        own.y - SKY + shiver.y,
        lerp(FORM[0], FORM[1], c),
        ms * 0.004,
        COLOR.white,
      );
    spot.x = ownX;
    spot.y = own.y;
    drawDrop(ctx, spot, bigMs - ms, BIG_FALL_MS, SKY, BIG_DROP);
    drawSplash(ctx, spot, ms - bigMs, BIG_SPLASH, 14, BIG_SPLASH_MS);
    endLightBatch(ctx);
    ctx.restore();
    drawDetonation(ctx, spot, ms - bigMs, BIG_BLAST, now);
  },
  tailMs: Math.max(DETONATION_MS, BIG_RIPPLE_MS + WAVE_MS),
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
