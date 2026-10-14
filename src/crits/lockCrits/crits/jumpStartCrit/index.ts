// Jump Start, a lock crit: the number lands in the dark locked floor as a
// wisp and charges, the dust in the room sucked into it while the lock
// shudders harder and harder; at the climax the floor bursts open and the
// wisp leaps onto its new bar and races along it, which pays out at once
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
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const ARC_MS = 180;
const ARC_RISE = 120;
const ARRIVE_BLAST = 90;
// the charge: from the number landing till the floor bursts open
const CHARGE_MS = 1000;
const OPEN_MS = ARC_MS + CHARGE_MS;
const CORE: [number, number] = [1.1, 2.2];
const CORE_TREMBLE = 21;
const LOCK_TREMBLE = 14;
const LOCK_WASH = 0.6;
const GLOW = 420;
const STREAKS = 300;
// the room's dust, scattered over FLOOR_SPREAD of its height, each speck
// pulled in over PULL_MS, landing quicker and quicker
const DUST = 70;
const FLOOR_SPREAD = 0.7;
const PULL_MS: [number, number] = [380, 150];
const DUST_LANDS = 0.95;
const SPECK: [number, number] = [16, 30];
const OPEN_BLAST = 280;
// the wisp leaping onto the opened floor's bar, racing along it, paying
const LEAP_DELAY_MS = 120;
const LEAP_MS = 220;
const LEAP_ARC = 140;
const RACE_MS = 160;
const BAR_INSET = 60;
const LANDS_MS = OPEN_MS + LEAP_DELAY_MS + LEAP_MS;
const PAY_MS = LANDS_MS + RACE_MS;
const LAND_BLAST = 90;
const PAY_BLAST = 160;
const TAIL_MS = 900;

interface Speck {
  x: number;
  y: number;
  pull: number;
  lands: number;
}
interface State {
  bars: Point[];
  charge: Charge;
  dust: Speck[];
  // the opened floor's bar's ends from the lock's middle
  barStart: Point;
  barEnd: Point;
  core: (ms: number) => Point | null;
  leap: (ms: number) => Point | null;
}

const states = new WeakMap<Running, State>();
const shiver: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("jumpStartCrit", {
  // payouts from the floor it opened
  reward(t) {
    const payouts = t.count * CONFIG.crit.jumpStartPayouts;
    t.payPayouts(payouts);
    t.punch(`x${payouts} Payout`);
  },
  plan(r, bars, hit) {
    const lock = getLockCenter();
    const box = getIncomeBarBox(false);
    const barY = box.y + box.height / 2 - lock.y;
    const barStart = { x: box.x + BAR_INSET - lock.x, y: barY };
    const barEnd = { x: box.x + box.width - BAR_INSET - lock.x, y: barY };
    const dust = Array.from({ length: DUST }, (_, i) => {
      const lands = ARC_MS + CHARGE_MS * DUST_LANDS * Math.sqrt((i + 1) / DUST);
      return {
        x:
          FLOOR_X_MIN +
          holeHash(i, 1610) * (FLOOR_X_MAX - FLOOR_X_MIN) -
          lock.x,
        y: (holeHash(i, 1611) - 0.5) * FLOOR_H * FLOOR_SPREAD,
        pull: lands - lerp(...PULL_MS, i / DUST),
        lands,
      };
    });
    const charge = planCharge(ARC_MS, CHARGE_MS);
    const at: Point = { x: 0, y: 0 };
    const jump: Point = { x: 0, y: 0 };
    const state: State = {
      bars,
      charge,
      dust,
      barStart,
      barEnd,
      core: (ms) => {
        if (ms < ARC_MS || ms > OPEN_MS) return null;
        trembleAt(chargeAt(charge, ms), ms, CORE_TREMBLE, at);
        at.x += state.bars[0].x;
        at.y += state.bars[0].y;
        return at;
      },
      leap: (ms) => {
        const from = OPEN_MS + LEAP_DELAY_MS;
        if (ms < from || ms > PAY_MS) return null;
        const c = state.bars[0];
        if (ms < LANDS_MS) {
          const u = (ms - from) / LEAP_MS;
          jump.x = c.x + barStart.x * u;
          jump.y = c.y + barStart.y * u - LEAP_ARC * 4 * u * (1 - u);
        } else {
          const u = (ms - LANDS_MS) / RACE_MS;
          jump.x = c.x + lerp(barStart.x, barEnd.x, u * u);
          jump.y = c.y + barStart.y;
        }
        return jump;
      },
    };
    states.set(r, state);
    r.play.hideBars?.([0]);
    hit(0, ARC_MS, 0);
    hit(0, OPEN_MS, 1);
    hit(0, PAY_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    const c = bars[0];
    tickCharge(state.charge, ms, r.shake);
    const charge = chargeAt(state.charge, ms);

    // the lock's price, shuddering harder and washing white as it charges
    if (ms < OPEN_MS) {
      trembleAt(charge, ms, LOCK_TREMBLE, shiver);
      ctx.save();
      ctx.translate(c.x + shiver.x, c.y + shiver.y);
      r.play.drawBar?.(ctx, 0, LOCK_WASH * charge);
      ctx.restore();
    }
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        c.x * p,
        c.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
      );
    }
    drawDetonation(ctx, c, ms - ARC_MS, ARRIVE_BLAST, now);

    // the core charging, the room's dust pulled into it
    const core = state.core(ms);
    if (core) {
      drawChargeStreaks(ctx, core, charge, STREAKS, ms);
      drawChargeGlow(ctx, core, charge, GLOW, now);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < state.dust.length; i++) {
        const d = state.dust[i];
        if (ms >= d.lands) continue;
        const u = clamp01((ms - d.pull) / (d.lands - d.pull)) ** 2;
        stampGlimmer(
          ctx,
          lerp(c.x + d.x, core.x, u),
          lerp(c.y + d.y, core.y, u),
          lerp(...SPECK, u),
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
      drawWisp(
        ctx,
        state.core,
        ms,
        now,
        WISP_SIZE * lerp(...CORE, charge),
        charge,
      );
    }

    // bursting open, the wisp leaping onto the new bar and racing along it
    drawDetonation(ctx, c, ms - OPEN_MS, OPEN_BLAST, now);
    drawWispBetween(
      ctx,
      state.leap,
      ms,
      now,
      WISP_SIZE * CORE[1],
      1,
      OPEN_MS + LEAP_DELAY_MS,
      PAY_MS,
    );
    spot.x = c.x + state.barStart.x;
    spot.y = c.y + state.barStart.y;
    drawDetonation(ctx, spot, ms - LANDS_MS, LAND_BLAST, now);
    spot.x = c.x + state.barEnd.x;
    drawDetonation(ctx, spot, ms - PAY_MS, PAY_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 1.4 : step === 2 ? 1.6 : 0.7),
});
