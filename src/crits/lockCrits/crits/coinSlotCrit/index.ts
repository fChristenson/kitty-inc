// Coin Slot, a lock crit: a bright coin slot opens on the dark locked floor
// with a ring of lamps round it; the number bursts into a wisp that swoops in
// leading a river of coins and feeds it into the slot like an arcade machine,
// the stream thickening, each gulp a clink, the slot flashing and the next
// lamp lighting, the lock trembling harder and a light chasing round the
// lamps ever faster; every lamp lit, they blink, the jackpot rings and the
// lock bursts open in a fountain of coins that pours onto the new bar: its
// next payouts climb a jackpot ladder, x2, x3, x4...
import meta from "./meta";
import { defineBarEffect } from "../../../rateCrits/rateBonus";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playJackpot, playSpinTick } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const TAU = Math.PI * 2;
const IN_MS = 120;
// the slot, SLOT_W x SLOT_H px, SLOT_Y px above the lock's middle, opening
// over OPEN_SLOT_MS
const SLOT_Y = -120;
const SLOT_W = 210;
const SLOT_H = 18;
const OPEN_SLOT_MS = 140;
const RIM = 5;
// the wisp swooping in from the flash over SWOOP_MS along the river's line
// (bowed BOW px up), hovering HOVER of the way along it, dipping DIP of the
// way on into the slot at each gulp; diving in over DIVE_MS at the end
const SWOOP_MS = 240;
const BOW = 240;
const HOVER = 0.78;
const DIP = 0.5;
const DIP_MS = 110;
const DIVE_MS = 110;
const BOB = 7;
// GULPS gulps over FEED_MS, quicker each (PACE), then HOLD_MS with every
// lamp lit before the lock bursts
const GULPS = 8;
const FEED_MS = 900;
const PACE = 1.7;
const HOLD_MS = 140;
const FEED_START = IN_MS + SWOOP_MS;
const LAST_GULP = FEED_START + FEED_MS;
const OPEN_MS = LAST_GULP + HOLD_MS;
// the river: COINS coins each TRAVEL_MS from the flash into the slot, their
// leaving bunching up (FLOOD: a trickle, then a flood), the stream THICK px
// wide and its coins COIN px, both growing
const COINS = 96;
const TRAVEL_MS = 260;
const FIRST_LEAVE = IN_MS + 50;
const LAST_LEAVE = LAST_GULP - TRAVEL_MS;
const FLOOD = 0.55;
const THICK: [number, number] = [4, 46];
const COIN: [number, number] = [11, 19];
const COIN_SPIN = 0.03;
// the lamps: LAMPS round an ellipse LAMP_RX x LAMP_RY round (0, LAMP_CY),
// lighting one a gulp, popping POP bigger for POP_MS; the chase running
// CHASE lamps a second at first, quickening by CHASE_ACC a second
const LAMPS = GULPS;
const LAMP_RX = 330;
const LAMP_RY = 190;
const LAMP_CY = -40;
const LAMP_DIM = 22;
const LAMP_LIT = 44;
const LAMP_CORE = 15;
const POP = 0.9;
const POP_MS = 150;
const CHASE = 6;
const CHASE_ACC = 26;
const BLINK_MS = 45;
// the slot's flash at each gulp, its halo growing as the lamps fill
const FLASH_MS = 120;
const HALO: [number, number] = [130, 330];
// the lock trembling up to TREMBLE px as it fills, HOLD_TREMBLE px at the end
const TREMBLE = 9;
const HOLD_TREMBLE = 16;
// the fountain: FOUNT coins bursting up out of the slot (staggered up to
// STAGGER_MS), each FOUNT_MS onto the new bar, arching RISE px up
const FOUNT = 72;
const STAGGER_MS = 90;
const FOUNT_MS = 420;
const RISE: [number, number] = [220, 470];
const FOUNT_COIN: [number, number] = [14, 22];
const BAR_INSET = 70;
const PAY_MS = OPEN_MS + STAGGER_MS + FOUNT_MS;
const OPEN_BLAST = 380;
const BAR_BLAST = 260;
const BAR_GLOW = 260;
const WISP: [number, number] = [1.2, 2.1];
const GULP_SHAKE: [number, number] = [0.25, 0.9];
// a gulp's clink and kick only if it's this fresh (not caught up on)
const STALE_MS = 150;
// shakes by step: -, the lock bursting, the coins landing
const SHAKES = [0.5, 3.2, 1.4];

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);
const SLOT_DARK = "#1a0d00";

// each gulp's time
const gulpAt = new Float32Array(GULPS);
for (let k = 0; k < GULPS; k++)
  gulpAt[k] = FEED_START + FEED_MS * ((k + 1) / GULPS) ** (1 / PACE);

// each river coin: when it leaves, its place across the stream, its size
const leave = new Float32Array(COINS);
const across = new Float32Array(COINS);
const thick = new Float32Array(COINS);
const size = new Float32Array(COINS);
for (let i = 0; i < COINS; i++) {
  const u = i / (COINS - 1);
  leave[i] = lerp(FIRST_LEAVE, LAST_LEAVE, u ** FLOOD);
  across[i] = holeHash(i, 7311) * 2 - 1;
  thick[i] = lerp(THICK[0], THICK[1], u);
  size[i] = lerp(COIN[0], COIN[1], u) * (0.85 + 0.3 * holeHash(i, 7312));
}

// each fountain coin: its start, where along the bar it lands, its rise
const delay = new Float32Array(FOUNT);
const landAt = new Float32Array(FOUNT);
const rise = new Float32Array(FOUNT);
const fountSize = new Float32Array(FOUNT);
for (let i = 0; i < FOUNT; i++) {
  delay[i] = STAGGER_MS * holeHash(i, 7313);
  landAt[i] = holeHash(i, 7314);
  rise[i] = lerp(RISE[0], RISE[1], holeHash(i, 7315));
  fountSize[i] = lerp(FOUNT_COIN[0], FOUNT_COIN[1], holeHash(i, 7316));
}

// the lamps round the lock, lit from the left over the top
const lampX = new Float32Array(LAMPS);
const lampY = new Float32Array(LAMPS);
for (let k = 0; k < LAMPS; k++) {
  const a = Math.PI + (k + 0.5) * (TAU / LAMPS);
  lampX[k] = Math.cos(a) * LAMP_RX;
  lampY[k] = LAMP_CY + Math.sin(a) * LAMP_RY;
}

const sprites: CoinBurstSprite[] = Array.from({ length: COINS }, (_, i) => ({
  kind: i % 6 === 0 ? "bill" : "coin",
  spinFrame: 0,
  axisAngle: (holeHash(i, 7317) - 0.5) * Math.PI,
}));

// the jackpot ladder: the bar's next `left` payouts paying 1 + step x (k + 1)
interface Ladder {
  k: number;
  left: number;
}
const ladders = defineBarEffect<Ladder>({
  payout: (v) => 1 + meta.values.step * (v.k + 1),
  onPayout: (v) => (v.left > 1 ? { k: v.k + 1, left: v.left - 1 } : undefined),
});

interface Plan {
  // from the lock's middle: the flash, the river's bend, the slot, where the
  // wisp hovers, the river's sideways, the new bar's ends
  from: Point;
  bend: Point;
  slot: Point;
  hover: Point;
  nx: number;
  ny: number;
  barStart: Point;
  barEnd: Point;
  rang: boolean;
  wisp: (ms: number) => Point | null;
}
const plans = new WeakMap<Running, Plan>();
const coin: Point = { x: 0, y: 0 };
const barMid: Point = { x: 0, y: 0 };

// the river's line at u (0 the flash, 1 the slot)
function riverAt(p: Plan, u: number, into: Point): Point {
  const v = 1 - u;
  into.x = v * v * p.from.x + 2 * v * u * p.bend.x + u * u * p.slot.x;
  into.y = v * v * p.from.y + 2 * v * u * p.bend.y + u * u * p.slot.y;
  return into;
}

// the last gulp by ms (-1: none yet)
function lastGulp(ms: number): number {
  let k = -1;
  while (k + 1 < GULPS && ms >= gulpAt[k + 1]) k++;
  return k;
}

function wispAt(p: Plan, ms: number, into: Point): Point | null {
  if (ms < IN_MS || ms > OPEN_MS) return null;
  if (ms < FEED_START) {
    const u = (ms - IN_MS) / SWOOP_MS;
    return riverAt(p, HOVER * (1 - (1 - u) * (1 - u)), into);
  }
  const { hover, slot } = p;
  let toSlot: number;
  if (ms >= OPEN_MS - DIVE_MS)
    toSlot = ((ms - OPEN_MS + DIVE_MS) / DIVE_MS) ** 2;
  else {
    const k = lastGulp(ms);
    toSlot = k < 0 ? 0 : DIP * Math.max(0, 1 - (ms - gulpAt[k]) / DIP_MS);
  }
  into.x = lerp(hover.x, slot.x, toSlot);
  into.y = lerp(hover.y, slot.y, toSlot) + Math.sin(ms * 0.03) * BOB;
  return into;
}

registerFloorCrit("coinSlotCrit", {
  // its bar's next payouts climbing a jackpot ladder, x2, x3, x4...
  reward(t) {
    const { payouts, step } = meta.values;
    t.flipRate();
    const ladder = ladders.get(t.floor);
    ladders.set(
      t.floor,
      ladder
        ? { k: ladder.k, left: ladder.left + payouts }
        : { k: 0, left: payouts },
    );
    t.punch(`Jackpot x${1 + step}+`);
  },
  plan(r, bars, hit) {
    const lock = getLockCenter();
    const box = getIncomeBarBox(false);
    const barY = box.y + box.height / 2 - lock.y;
    const flash = bars[0] ?? coin;
    const from: Point = { x: -flash.x, y: -flash.y };
    const slot: Point = { x: 0, y: SLOT_Y };
    const dx = slot.x - from.x;
    const dy = slot.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const at: Point = { x: 0, y: 0 };
    const plan: Plan = {
      from,
      bend: { x: (from.x + slot.x) / 2, y: Math.min(from.y, slot.y) - BOW },
      slot,
      hover: { x: 0, y: 0 },
      nx: -dy / len,
      ny: dx / len,
      barStart: { x: box.x + BAR_INSET - lock.x, y: barY },
      barEnd: { x: box.x + box.width - BAR_INSET - lock.x, y: barY },
      rang: false,
      wisp: (ms) => wispAt(plan, ms, at),
    };
    riverAt(plan, HOVER, plan.hover);
    plans.set(r, plan);
    hit(0, OPEN_MS, 1);
    hit(0, PAY_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (!lock) return;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // each fresh gulp's clink and kick
    while (r.kicked < GULPS && ms >= gulpAt[r.kicked]) {
      const k = r.kicked;
      if (ms - gulpAt[k] < STALE_MS) {
        playSpinTick(1 + k * 0.1);
        r.shake(lerp(GULP_SHAKE[0], GULP_SHAKE[1], k / (GULPS - 1)));
      }
      r.kicked++;
    }
    if (!plan.rang && ms >= OPEN_MS) {
      plan.rang = true;
      if (ms - OPEN_MS < STALE_MS) playJackpot();
    }
    const lit = lastGulp(ms) + 1;
    const fill = lit < GULPS ? clamp01((ms - FEED_START) / FEED_MS) : 1;
    ctx.save();
    ctx.translate(lock.x, lock.y);

    // the slot and its lamps, trembling harder as they fill
    if (ms >= IN_MS && ms < OPEN_MS) {
      const shiver = lit < GULPS ? TREMBLE * fill * fill : HOLD_TREMBLE;
      const sx = Math.sin(ms * 0.11) * shiver;
      const sy = Math.cos(ms * 0.137) * shiver * 0.6;
      const open = clamp01((ms - IN_MS) / OPEN_SLOT_MS);
      const w = SLOT_W * (1 - (1 - open) * (1 - open));
      const since = lit > 0 ? ms - gulpAt[lit - 1] : FLASH_MS;
      const flash = Math.max(0, 1 - since / FLASH_MS);
      const hold = lit >= GULPS;
      const blink = hold && Math.floor(since / BLINK_MS) % 2 === 0;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      ctx.globalAlpha = 0.35 + 0.4 * fill;
      drawGlow(ctx, GOLD, 0, SLOT_Y, lerp(HALO[0], HALO[1], fill), 0.6);
      ctx.globalAlpha = 1;
      drawGlow(ctx, GOLD, 0, SLOT_Y, w * (0.75 + 0.5 * flash), 0.3);
      if (flash > 0) {
        ctx.globalAlpha = flash;
        drawGlow(ctx, WHITE, 0, SLOT_Y, w * 0.6, 0.35);
      }
      // the lamps: dim, lit one a gulp (popping), the chase racing round
      const chaseT = Math.max(0, ms - FEED_START) / 1000;
      const chase =
        Math.floor(CHASE * chaseT + CHASE_ACC * chaseT * chaseT) % LAMPS;
      for (let k = 0; k < LAMPS; k++) {
        const x = lampX[k];
        const y = lampY[k];
        if (k >= lit) {
          ctx.globalAlpha = 0.45 * open;
          drawGlow(ctx, GOLD, x, y, LAMP_DIM);
        } else {
          const t = ms - gulpAt[k];
          const pop = 1 + POP * Math.max(0, 1 - t / POP_MS);
          const big = blink ? 1.4 : 1;
          ctx.globalAlpha = 1;
          drawGlow(ctx, GOLD, x, y, LAMP_LIT * pop * big);
          drawGlow(ctx, WHITE, x, y, LAMP_CORE * pop * big);
        }
        if (ms >= FEED_START && !hold && k === chase) {
          ctx.globalAlpha = 0.9;
          drawGlow(ctx, WHITE, x, y, LAMP_LIT * 0.8);
        }
      }
      endLightBatch(ctx);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      // the slit itself, a dark mouth with bright lips
      if (w > 0) {
        ctx.fillStyle = SLOT_DARK;
        ctx.fillRect(-w / 2, SLOT_Y - SLOT_H / 2, w, SLOT_H);
        ctx.fillStyle = flash > 0.5 || blink ? COLOR.white : COLOR.heavenlyGold;
        ctx.fillRect(-w / 2, SLOT_Y - SLOT_H / 2 - RIM, w, RIM);
        ctx.fillRect(-w / 2, SLOT_Y + SLOT_H / 2, w, RIM);
      }
      ctx.restore();
    }

    // the river into the slot, shrinking as each coin drops in
    if (ms >= FIRST_LEAVE && ms < LAST_LEAVE + TRAVEL_MS) {
      const base = ctx.getTransform();
      beginCoinBatch(ctx);
      for (let i = 0; i < COINS; i++) {
        const u = (ms - leave[i]) / TRAVEL_MS;
        if (u < 0 || u >= 1) continue;
        const uu = u ** 1.15;
        riverAt(plan, uu, coin);
        const side = across[i] * thick[i] * Math.sin(Math.PI * uu);
        coin.x += plan.nx * side;
        coin.y += plan.ny * side;
        const sprite = sprites[i];
        sprite.spinFrame = ms * COIN_SPIN + i;
        const shrink = Math.min(1, (1 - u) * 6 + 0.3);
        drawCoinBurstFrame(ctx, sprite, coin.x, coin.y, size[i] * shrink, base);
      }
      endCoinBatch(ctx);
    }
    drawWispBetween(
      ctx,
      plan.wisp,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], fill),
      fill,
      IN_MS,
      OPEN_MS,
    );

    // the jackpot: the lock bursting, the fountain pouring onto the new bar
    drawDetonation(ctx, plan.slot, ms - OPEN_MS, OPEN_BLAST, now);
    const since = ms - OPEN_MS;
    if (since >= 0 && since < STAGGER_MS + FOUNT_MS) {
      const base = ctx.getTransform();
      const { slot, barStart, barEnd } = plan;
      beginCoinBatch(ctx);
      for (let i = 0; i < FOUNT; i++) {
        const u = (since - delay[i]) / FOUNT_MS;
        if (u < 0 || u >= 1) continue;
        const tx = lerp(barStart.x, barEnd.x, landAt[i]);
        const x = lerp(slot.x, tx, u);
        const y = lerp(slot.y, barStart.y, u) - rise[i] * 4 * u * (1 - u);
        const sprite = sprites[i];
        sprite.spinFrame = ms * COIN_SPIN * 1.5 + i;
        drawCoinBurstFrame(ctx, sprite, x, y, fountSize[i], base);
      }
      endCoinBatch(ctx);
    }
    // the bar glowing as the coins land on it
    barMid.x = (plan.barStart.x + plan.barEnd.x) / 2;
    barMid.y = plan.barStart.y;
    const landing = ms - (OPEN_MS + FOUNT_MS);
    if (landing >= 0 && landing < STAGGER_MS + DETONATION_MS * 0.4) {
      const glow = Math.max(
        0,
        landing < STAGGER_MS
          ? landing / STAGGER_MS
          : 1 - (landing - STAGGER_MS) / (DETONATION_MS * 0.4),
      );
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = glow;
      drawGlow(
        ctx,
        GOLD,
        barMid.x,
        barMid.y,
        Math.max(0, BAR_GLOW * (0.6 + 0.6 * glow)),
        0.35,
      );
      ctx.restore();
    }
    drawDetonation(ctx, barMid, ms - PAY_MS, BAR_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
