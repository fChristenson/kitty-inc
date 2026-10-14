// Pressure Wash, a lock crit: the number arcs onto the dark locked floor and
// splits into two nozzle wisps either side of the lock; they blast it with
// converging jets of gold mist in bursts, each burst longer and the gaps
// shorter, a jolt each, the lock's gold coat building and the rumble rising,
// until one long full blast makes it give: the coat flashes white, the floor
// bursts open, and both nozzles swing down and wash its new bar end to end:
// it pays double for a while
import meta from "./meta";
import { defineBarEffect } from "../../../rateCrits/rateBonus";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sweepAim,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import {
  planCharge,
  tickCharge,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { FLOOR_X_MAX, FLOOR_X_MIN } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number arcing onto the lock, then the nozzles sliding out to NOZZLE of
// the floor's half width either side, LIFT px up, over SPLIT_MS
const ARC_MS = 180;
const ARC_RISE = 120;
const SPLIT_MS = 160;
const NOZZLE = 0.8;
const LIFT = 60;
// the bursts: BURSTS from FIRST_MS, each BURST_MS long (longer each), GAP_MS
// after the last (shorter each), the last a long full blast of LAST_MS
const FIRST_MS = ARC_MS + SPLIT_MS;
const BURSTS = 4;
const BURST_MS: [number, number] = [130, 230];
const GAP_MS: [number, number] = [170, 50];
const LAST_MS = 360;
const SPREAD = 0.12;
const SWAY = 0.08;
const SWAY_RATE = 0.04;
const FLIGHT_MS = 160;
const DROPLET = 100;
const MIST = 140;
// the coat over the lock, COAT px across, flashing over FLASH_MS
const COAT = 280;
const FLASH_MS = 200;
const OPEN_BLAST = 320;
// the wash along the new bar, BAR_INSET in from its ends, over WASH_MS
const WASH_GAP_MS = 120;
const WASH_MS = 320;
const BAR_INSET = 60;
const WISP = WISP_SIZE * 1.2;
const BURST_BLAST = 80;
const WASH_BLAST = 160;
// shakes by step: a burst, the floor bursting open, the bar washed
const SHAKES = [0.6, 3, 1.2];

interface State {
  bars: Point[];
  // from the lock's middle: the nozzles, the new bar's right end
  nozzles: Point[];
  sprays: Spray[];
  bursts: number[];
  openMs: number;
  doneMs: number;
  barEnd: Point;
  charge: Charge;
  wisps: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };

// a wash: the bar pays `payout` times as much till then
const washes = defineBarEffect<number>({
  payout: () => meta.values.payout,
  ended: (until, now) => now >= until,
});

registerFloorCrit("pressureWashCrit", {
  reward(t) {
    t.flipRate();
    washes.set(t.floor, t.now + meta.values.ms);
    t.punch(`x${meta.values.payout} Payouts`);
  },
  plan(r, bars, hit) {
    const lock = getLockCenter();
    const half = ((FLOOR_X_MAX - FLOOR_X_MIN) / 2) * NOZZLE;
    const mid = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x;
    const nozzles = [
      { x: mid - half, y: -LIFT },
      { x: mid + half, y: -LIFT },
    ];
    const box = getIncomeBarBox(false);
    const barY = box.y + box.height / 2 - lock.y;
    const barStart = { x: box.x + BAR_INSET - lock.x, y: barY };
    const barEnd = { x: box.x + box.width - BAR_INSET - lock.x, y: barY };
    const bursts: number[] = [];
    const sprays: Spray[] = [];
    let t = FIRST_MS;
    const blast = (from: Point, startMs: number, endMs: number) => {
      const aim = Math.atan2(-from.y, -from.x);
      return planSpray(from, (ms) => aim + SWAY * Math.sin(ms * SWAY_RATE), {
        startMs,
        endMs,
        spread: SPREAD,
        reach: Math.hypot(from.x, from.y),
        flightMs: FLIGHT_MS,
      });
    };
    for (let k = 0; k <= BURSTS; k++) {
      const u = k / BURSTS;
      const ms = k === BURSTS ? LAST_MS : lerp(BURST_MS[0], BURST_MS[1], u);
      bursts.push(t);
      for (const from of nozzles) sprays.push(blast(from, t, t + ms));
      hit(0, t, 0);
      t += ms + (k < BURSTS ? lerp(GAP_MS[0], GAP_MS[1], u) : 0);
    }
    const openMs = t + FLIGHT_MS;
    const washMs = openMs + WASH_GAP_MS;
    const doneMs = washMs + WASH_MS;
    // both nozzles rake the new bar, from opposite ends
    nozzles.forEach((from, k) =>
      sprays.push(
        planSpray(
          from,
          sweepAim(
            from,
            k ? [barEnd, barStart] : [barStart, barEnd],
            washMs,
            WASH_MS,
          ),
          {
            startMs: washMs,
            endMs: doneMs,
            spread: SPREAD,
            reach: Math.hypot(barStart.x - from.x, barStart.y - from.y),
            flightMs: FLIGHT_MS,
          },
        ),
      ),
    );
    hit(0, openMs, 1);
    hit(0, doneMs + FLIGHT_MS, 2);
    const state: State = {
      bars,
      nozzles,
      sprays,
      bursts,
      openMs,
      doneMs,
      barEnd,
      charge: planCharge(FIRST_MS, openMs - FIRST_MS, { bang: false }),
      wisps: nozzles.map((n) => {
        const at: Point = { x: 0, y: 0 };
        return (ms) => {
          if (ms < ARC_MS || ms > doneMs + FLIGHT_MS) return null;
          const out = clamp01((ms - ARC_MS) / SPLIT_MS);
          const lock = state.bars[0];
          at.x = lock.x + n.x * out;
          at.y = lock.y + n.y * out;
          return at;
        };
      }),
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    state.bars = bars;
    const lock = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
        { alpha: 1 - p * p },
      );
    }
    tickCharge(state.charge, ms, r.shake);
    const build = clamp01((ms - FIRST_MS) / (state.openMs - FIRST_MS));
    // the coat building on the lock, flashing as it gives
    drawSprayCoat(
      ctx,
      lock,
      COAT,
      COAT,
      ms < state.openMs ? build ** 1.2 : 0,
      clamp01(1 - Math.abs(ms - state.openMs) / FLASH_MS),
    );
    if (ms >= FIRST_MS && ms < state.openMs)
      drawSprayMist(ctx, lock, ms - FIRST_MS, build, MIST, now);
    ctx.save();
    ctx.translate(lock.x, lock.y);
    for (const spray of state.sprays) drawSpray(ctx, spray, ms, now, DROPLET);
    for (let k = 0; k < state.bursts.length * 2; k++)
      drawDetonation(
        ctx,
        state.nozzles[k & 1],
        ms - state.bursts[k >> 1],
        BURST_BLAST,
        now,
      );
    drawDetonation(
      ctx,
      state.barEnd,
      ms - state.doneMs - FLIGHT_MS,
      WASH_BLAST,
      now,
    );
    ctx.restore();
    for (const wisp of state.wisps)
      drawWispBetween(
        ctx,
        wisp,
        ms,
        now,
        WISP,
        0.3 + 0.7 * build,
        ARC_MS,
        state.doneMs + FLIGHT_MS,
      );
    spot.x = lock.x;
    spot.y = lock.y;
    drawDetonation(ctx, spot, ms - state.openMs, OPEN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
