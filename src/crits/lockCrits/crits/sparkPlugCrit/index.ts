// Spark Plug, a lock crit: the number arcs down onto the dark locked floor's
// lock and splits into wisps circling it; as the lock charges they close in,
// round and round faster and faster, its glow swelling and trembling, light
// racing into it and the rumble building, until they slam into it: the floor
// bursts open and the wisps leap out into the new room one after another,
// each landing as a worker hired there
import meta from "./meta";
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
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { FLOOR_X_MAX, FLOOR_X_MIN } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { WORKER_FEET_Y } from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number arcing down onto the lock
const ARC_MS = 180;
const ARC_RISE = 120;
const ARRIVE_BLAST = 100;
// the charge, the wisps circling in from ORBIT to CORE px out, TURNS times
// round (slow, then whipping), squashed SQUASH tall
const CHARGE_MS = 1100;
const OPEN_MS = ARC_MS + CHARGE_MS;
const ORBIT = 360;
const CORE = 40;
const TURNS = 5;
const SQUASH = 0.45;
const WISP = WISP_SIZE * 1.3;
const GLOW = 420;
const STREAKS = 320;
const TREMBLE = 16;
const OPEN_BLAST = 300;
// out into the room: each wisp LEAP_GAP_MS after the last, a LEAP_MS hop
// LEAP_ARC px high onto its spot on the floor
const LEAP_DELAY_MS = 120;
const LEAP_GAP_MS = 110;
const LEAP_MS = 240;
const LEAP_ARC = 160;
const LAND_BLAST = 110;
const TAIL_MS = 900;
// shakes by step: the arrival, the floor bursting open, a hire
const SHAKES = [0.5, 3, 0.8];

interface State {
  bars: Point[];
  charge: Charge;
  // each wisp's path, and when it lands in the room
  wisps: ((ms: number) => Point | null)[];
  lands: number[];
}
const states = new WeakMap<Running, State>();
const shiver: Point = { x: 0, y: 0 };
const core: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// the spots the wisps move in at, spread across the room
const spotOf = (k: number, n: number) => (k + 1) / (n + 1);

registerFloorCrit("sparkPlugCrit", {
  // a worker hired where its wisp landed
  reward(t) {
    t.hire(spotOf(t.index, meta.values.hires));
  },
  plan(r, bars, hit) {
    const n = meta.values.hires;
    const lock = getLockCenter();
    const charge = planCharge(ARC_MS, CHARGE_MS, { bang: false });
    const state: State = { bars, charge, wisps: [], lands: [] };
    for (let k = 0; k < n; k++) {
      const at: Point = { x: 0, y: 0 };
      const from = OPEN_MS + LEAP_DELAY_MS + k * LEAP_GAP_MS;
      const lands = from + LEAP_MS;
      const room = {
        x: FLOOR_X_MIN + (FLOOR_X_MAX - FLOOR_X_MIN) * spotOf(k, n) - lock.x,
        y: WORKER_FEET_Y - lock.y,
      };
      state.lands.push(lands);
      state.wisps.push((ms) => {
        if (ms < ARC_MS || ms > lands) return null;
        const c = state.bars[0];
        if (ms <= OPEN_MS) {
          const u = (ms - ARC_MS) / CHARGE_MS;
          const a = (k / n) * Math.PI * 2 + TURNS * Math.PI * 2 * u ** 3;
          const d = lerp(ORBIT, CORE, u * u);
          at.x = c.x + Math.cos(a) * d;
          at.y = c.y + Math.sin(a) * d * SQUASH;
          return at;
        }
        const u = clamp01((ms - from) / LEAP_MS);
        at.x = c.x + room.x * u;
        at.y = c.y + room.y * u - LEAP_ARC * 4 * u * (1 - u);
        return at;
      });
      hit(0, lands, 2);
    }
    hit(0, ARC_MS, 0);
    hit(0, OPEN_MS, 1);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
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
    if (ms >= ARC_MS && ms < OPEN_MS) {
      const c = chargeAt(state.charge, ms);
      trembleAt(c, ms, TREMBLE, shiver);
      core.x = lock.x + shiver.x;
      core.y = lock.y + shiver.y;
      drawChargeStreaks(ctx, core, c, STREAKS, ms);
      drawChargeGlow(ctx, core, c, GLOW, now);
    }
    for (let k = 0; k < state.wisps.length; k++)
      drawWispBetween(
        ctx,
        state.wisps[k],
        ms,
        now,
        WISP,
        ms < OPEN_MS ? chargeAt(state.charge, ms) : 0.4,
        ARC_MS,
        state.lands[k],
      );
    drawDetonation(ctx, lock, ms - ARC_MS, ARRIVE_BLAST, now);
    drawDetonation(ctx, lock, ms - OPEN_MS, OPEN_BLAST, now);
    for (let k = 0; k < state.lands.length; k++) {
      const at = state.wisps[k](state.lands[k]);
      if (!at) continue;
      spot.x = at.x;
      spot.y = at.y;
      drawDetonation(ctx, spot, ms - state.lands[k], LAND_BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
