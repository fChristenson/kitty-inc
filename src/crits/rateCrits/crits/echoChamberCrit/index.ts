// Echo Chamber, a rate crit: drops of light fall onto the readout of every
// bar in view, each landing in a splash with a flat ring spreading along the
// bar, a drizzle quickening to a downpour; each bar's last drop lands big
// with a double ring, its readout turning over under a flash. Meanwhile a
// huge drop gathers high over its own readout, trembling as the rumble
// builds, then plunges onto it: a double ring, a second wave and the blast.
// Its bar's next payouts each echo back twice, fainter each time
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { multiply, type BigNumber } from "../../../../shared/bigNumber";
import {
  drawDrop,
  drawRipple,
  drawSplash,
  rainTimes,
  RIPPLE_MS,
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
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { addTotalIncome } from "../../../../totalIncome";
import { playSpinTick } from "../../../../sound";
import {
  currentPayoutAmount,
  punchIncomeBar,
} from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const IN_MS = 140;
// a readout READOUT of a bar's half width out from its middle; drops land
// up to JITTER px either side of it
const READOUT = 0.6;
const JITTER = 50;
// ROUNDS drops a bar (one bar alone: MAX_ROUNDS), the gaps closing GAPS ms,
// all within DRIZZLE_MAX
const ROUNDS = 3;
const MAX_ROUNDS = 8;
const GAPS: [number, number] = [150, 18];
const DRIZZLE_MAX = 1000;
// a drop falling FALL px over FALL_MS, DROP px, splashing SPLASH, its ring
// RIPPLE of the bar's half width out, RIPPLE_W thick; a bar's last drop
// LAST times all that, with a double ring and a FLASH px flash over FLASH_MS
const FALL = 240;
const FALL_MS = 120;
const DROP = 22;
const SPLASH = 13;
const RIPPLE = 0.55;
const RIPPLE_W = 10;
const LAST = 1.5;
const FLASH = 110;
const FLASH_SQUASH = 0.45;
const FLASH_MS = 240;
// the huge drop gathering SKY px over its own readout from FORM_LEAD ms
// before the last drop lands, letting go HANG_MS after it, falling over
// BIG_FALL_MS; swelling FORM px, trembling TREMBLE px, glowing GLOW px
const SKY = 640;
const FORM_LEAD = 320;
const HANG_MS = 110;
const BIG_FALL_MS = 180;
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
// shakes by step: a drop, a bar's last drop, the huge drop
const SHAKES = [0.25, 0.9, 3];

interface Drop {
  bar: number;
  // from the readout
  x: number;
  landMs: number;
  // its bar's last, on another bar: the reward hit
  last: boolean;
}
interface State {
  drops: Drop[];
  // when each reward drop lands, in order
  lasts: number[];
  dropMs: number;
  bigMs: number;
  charge: Charge;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const FLASH_STOPS = fadeStops(COLOR.heavenlyGold, 0.3);

// one of a payout's echoes landing on floor's bar
function echoOnce(
  floor: Floor,
  amount: BigNumber,
  color: string,
  label: string,
): void {
  if (!floor.unlocked) return;
  addTotalIncome(amount);
  punchIncomeBar(floor, label, color);
  pulseHudTotalFlash();
}

// its bar's next `left` payouts each echoing twice, fainter each time
const echoing = defineBarEffect<{
  floor: Floor;
  left: number;
  color: string;
}>({
  onPayout: (v, now) => {
    const { echo, echoMs } = meta.values;
    const amount = currentPayoutAmount(v.floor, now);
    setTimeout(
      echoOnce,
      echoMs,
      v.floor,
      multiply(amount, echo),
      v.color,
      "Echo",
    );
    setTimeout(
      echoOnce,
      echoMs * 2,
      v.floor,
      multiply(amount, echo * echo),
      v.color,
      "echo",
    );
    v.left--;
    return v.left > 0 ? v : undefined;
  },
});

registerFloorCrit("echoChamberCrit", {
  reward(t) {
    t.flipRate();
    const { payouts, ownPayouts } = meta.values;
    const add = t.own ? ownPayouts : payouts;
    const left = (echoing.get(t.floor)?.left ?? 0) + add;
    echoing.set(t.floor, { floor: t.floor, left, color: t.color });
    t.punch(`Echo x${add}`);
  },
  plan(r, bars, hit) {
    const n = bars.length;
    const rounds = n > 1 ? ROUNDS : MAX_ROUNDS;
    const count = n * rounds;
    const times = rainTimes(count, IN_MS, GAPS);
    const scale = Math.min(
      1,
      DRIZZLE_MAX / Math.max(1, times[count - 1] - IN_MS),
    );
    // every bar once a round, in a fresh shuffle each round
    const deck: number[] = [];
    const drops: Drop[] = [];
    const lasts: number[] = [];
    for (let round = 0, k = 0; round < rounds; round++) {
      deck.length = 0;
      for (let i = 0; i < n; i++) deck.push(i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const swap = deck[i];
        deck[i] = deck[j];
        deck[j] = swap;
      }
      for (let i = 0; i < n; i++, k++) {
        const bar = deck[i];
        const landMs = IN_MS + (times[k] - IN_MS) * scale + FALL_MS;
        const last = round === rounds - 1 && bar !== 0;
        drops.push({
          bar,
          x: last ? 0 : (Math.random() * 2 - 1) * JITTER,
          landMs,
          last,
        });
        if (last) lasts.push(landMs);
        hit(bar, landMs, last ? 1 : 0);
      }
    }
    const lastLand = drops[count - 1].landMs;
    const formMs = Math.max(IN_MS, lastLand - FORM_LEAD);
    const dropMs = lastLand + HANG_MS;
    const bigMs = dropMs + BIG_FALL_MS;
    hit(0, bigMs, 2);
    states.set(r, {
      drops,
      lasts,
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
    const { drops, lasts, dropMs, bigMs } = state;
    const half = r.play.barHalfWidth;
    const ripple = half * RIPPLE;
    const own = bars[0];
    const ownX = own.x + half * READOUT;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // a tick as each bar's last drop lands, rising
    while (r.kicked < lasts.length && ms >= lasts[r.kicked]) {
      playSpinTick(1 + 0.1 * r.kicked);
      r.kicked++;
    }
    // the rings, flat along each bar
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < drops.length; k++) {
      const drop = drops[k];
      const since = ms - drop.landMs;
      if (since < 0 || since >= RIPPLE_MS) continue;
      const bar = bars[drop.bar];
      if (!bar) continue;
      spot.x = bar.x + half * READOUT + drop.x;
      spot.y = bar.y;
      if (drop.last)
        drawRipple(ctx, spot, since, ripple * LAST, RIPPLE_W * LAST, 2);
      else drawRipple(ctx, spot, since, ripple, RIPPLE_W);
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
    // the drops, splashes and reward flashes
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < drops.length; k++) {
      const drop = drops[k];
      const until = drop.landMs - ms;
      if (until > FALL_MS) continue;
      const bar = bars[drop.bar];
      if (!bar) continue;
      spot.x = bar.x + half * READOUT + drop.x;
      spot.y = bar.y;
      const size = drop.last ? LAST : 1;
      drawDrop(ctx, spot, until, FALL_MS, FALL, DROP * size);
      drawSplash(ctx, spot, -until, SPLASH * size, drop.last ? 9 : 6);
      if (drop.last && -until >= 0 && -until < FLASH_MS) {
        const q = -until / FLASH_MS;
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
