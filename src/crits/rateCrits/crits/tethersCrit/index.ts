// Tethers, a rate crit: two aim lasers flicker out of its own readout and
// sweep the building, snapping onto every other readout top to bottom, one
// by one, quicker each; each locked tether blazes up into a beam, the bar's
// readout turning over under a flare; the beams thrum faster and faster, its
// own readout swelling, then every beam pulses back into it at once in one
// blast: its next payouts each also pay out every tethered floor
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import type { Floor } from "../../../../gameState";
import {
  drawAimLaser,
  drawBeam,
  drawBeamFlare,
} from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
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
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const IN_MS = 140;
// a readout READOUT of a bar's half width out from its middle
const READOUT = 0.6;
// the lasers seeking from SEEK_UP px above its own readout, swinging SWING px
// aside, locking GAP_MS apart (closing), all within SWEEP_MAX
const SEEK_UP = 260;
const SWING = 160;
const GAP_MS: [number, number] = [240, 95];
const SWEEP_MAX = 1050;
// a lock firing its beam LOCK_MS on, blazing BEAM_HOT px wide, settling to
// BEAM_HOLD over SETTLE_MS, its flare FLARE px round over FLARE_MS
const LOCK_MS = 80;
const BEAM_HOT = 70;
const BEAM_HOLD = 20;
const SETTLE_MS = 200;
const FLARE = 42;
const FLARE_MS = 220;
// HOLD_MS after the last fires, the beams thrum THRUM_MS (THRUM laps,
// quickening), then pulse home in PULSE_MS, PULSE_LEN of the way long
const HOLD_MS = 60;
const THRUM_MS = 320;
const THRUM_LAPS: [number, number] = [2, 6];
const THRUM = 1.2;
const PULSE_MS = 140;
const PULSE_LEN = 0.3;
const PULSE_W = 60;
// its own readout swelling OWN_GLOW[0]..[1] px, then flaring OWN_FLARE
// and the beams flashing BEAM_FINAL wide, fading over FADE_MS
const OWN_GLOW: [number, number] = [18, 70];
const OWN_FLARE = 150;
const BEAM_FINAL = 110;
const FADE_MS = 380;
const OWN_BLAST = 300;
// shakes by step: a lock, a tether firing, its own
const SHAKES = [0.5, 1, 2.8];

interface Lock {
  bar: number;
  from: number;
  lockAt: number;
  fireAt: number;
}
interface State {
  locks: Lock[];
  spots: Point[];
  firstFire: number;
  thrumAt: number;
  pulseAt: number;
  ownAt: number;
}
const states = new WeakMap<Running, State>();
const start: Point = { x: 0, y: 0 };
const aim: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const tail: Point = { x: 0, y: 0 };

// this run's tethered floors, by its own floor, till its own reward lands
const runs = new WeakMap<Floor, Floor[]>();

// its own bar's next `left` payouts each also paying out every tethered floor
const tethered = defineBarEffect<{
  floors: Floor[];
  left: number;
  color: string;
}>({
  onPayout: (v, now) => {
    let paid = false;
    for (let i = 0; i < v.floors.length; i++) {
      const floor = v.floors[i];
      if (!floor.unlocked) continue;
      addTotalIncome(currentPayoutAmount(floor, now));
      punchIncomeBar(floor, null, v.color);
      paid = true;
    }
    if (paid) pulseHudTotalFlash();
    v.left--;
    return v.left > 0 ? v : undefined;
  },
});

registerFloorCrit("tethersCrit", {
  reward(t) {
    t.flipRate();
    if (!t.own) {
      const list = runs.get(t.ownFloor);
      if (list) list.push(t.floor);
      else runs.set(t.ownFloor, [t.floor]);
      t.punch("Tethered");
      return;
    }
    const floors = runs.get(t.floor) ?? [];
    runs.delete(t.floor);
    const { payouts } = meta.values;
    const before = tethered.get(t.floor);
    if (before)
      for (const floor of before.floors)
        if (!floors.includes(floor)) floors.push(floor);
    if (floors.length === 0) return;
    const left = (before?.left ?? 0) + payouts;
    tethered.set(t.floor, { floors, left, color: t.color });
    t.punch(`Tethers x${payouts}`);
  },
  plan(r, bars, hit) {
    // the others top to bottom
    const order: number[] = [];
    for (let i = 1; i < bars.length; i++) order.push(i);
    order.sort((a, b) => bars[a].y - bars[b].y);
    const n = order.length;
    const gaps: number[] = [];
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const gap = lerp(GAP_MS[0], GAP_MS[1], n > 1 ? k / (n - 1) : 0);
      gaps.push(gap);
      sum += gap;
    }
    const scale = Math.min(1, SWEEP_MAX / Math.max(1, sum));
    const locks: Lock[] = [];
    let at = IN_MS;
    for (let k = 0; k < n; k++) {
      const from = at;
      at += gaps[k] * scale;
      locks.push({ bar: order[k], from, lockAt: at, fireAt: at + LOCK_MS });
    }
    const lastFire = n ? locks[n - 1].fireAt : IN_MS;
    const thrumAt = lastFire + HOLD_MS;
    const pulseAt = thrumAt + THRUM_MS;
    const ownAt = pulseAt + PULSE_MS;
    for (const lock of locks) {
      hit(lock.bar, lock.lockAt, 0);
      hit(lock.bar, lock.fireAt, 1);
    }
    hit(0, ownAt, 2);
    const spots: Point[] = [];
    for (let i = 0; i < bars.length; i++) spots.push({ x: 0, y: 0 });
    states.set(r, {
      locks,
      spots,
      firstFire: n ? locks[0].fireAt : IN_MS,
      thrumAt,
      pulseAt,
      ownAt,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { locks, spots, thrumAt, pulseAt, ownAt } = state;
    const half = r.play.barHalfWidth;
    const count = Math.min(bars.length, spots.length);
    for (let i = 0; i < count; i++) {
      spots[i].x = bars[i].x + half * READOUT;
      spots[i].y = bars[i].y;
    }
    const own = spots[0];
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        own.x * u,
        own.y * u,
        r.flashFont * (1 - 0.7 * u),
        {
          alpha: 1 - u,
        },
      );
    }
    // a tick as each tether locks, rising
    while (r.kicked < locks.length && ms >= locks[r.kicked].lockAt) {
      playSpinTick(1 + 0.12 * r.kicked);
      r.kicked++;
    }
    // the seeking lasers, swinging either side onto the next readout
    for (let k = 0; k < locks.length; k++) {
      const lock = locks[k];
      if (ms < lock.from || ms >= lock.lockAt) continue;
      if (k === 0) {
        start.x = own.x;
        start.y = own.y - SEEK_UP;
      } else {
        const prev = spots[locks[k - 1].bar];
        start.x = prev.x;
        start.y = prev.y;
      }
      const to = spots[lock.bar];
      const u = (ms - lock.from) / (lock.lockAt - lock.from);
      const p = u * u;
      const swing = SWING * Math.sin(Math.PI * u);
      aim.x = lerp(start.x, to.x, p) + swing;
      aim.y = lerp(start.y, to.y, p);
      drawAimLaser(ctx, own, aim);
      aim.x -= 2 * swing;
      drawAimLaser(ctx, own, aim);
      break;
    }
    // the thrum's swell 0..1 and beat
    const thrum = clamp01((ms - thrumAt) / THRUM_MS);
    const laps =
      THRUM_LAPS[0] * thrum + (THRUM_LAPS[1] - THRUM_LAPS[0]) * thrum * thrum;
    const beat = 0.5 + 0.5 * Math.sin(Math.PI * 2 * laps);
    const fade = clamp01((ms - ownAt) / FADE_MS);
    const pulse = clamp01((ms - pulseAt) / PULSE_MS);
    const reach = pulse * pulse;
    for (let k = 0; k < locks.length; k++) {
      const lock = locks[k];
      if (ms < lock.lockAt) continue;
      const spot = spots[lock.bar];
      if (ms < lock.fireAt) {
        drawAimLaser(ctx, own, spot);
        continue;
      }
      if (ms < ownAt) {
        const settle = clamp01((ms - lock.fireAt) / SETTLE_MS);
        const width =
          lerp(BEAM_HOT, BEAM_HOLD, settle * (2 - settle)) *
          (1 + THRUM * thrum * beat);
        drawBeam(ctx, own, spot, width, 0.75 + 0.25 * beat * thrum);
      } else if (fade < 1) {
        drawBeam(ctx, own, spot, lerp(BEAM_FINAL, BEAM_HOLD, fade), 1 - fade);
      }
      const since = ms - lock.fireAt;
      if (since < FLARE_MS) {
        const q = since / FLARE_MS;
        drawBeamFlare(ctx, spot, FLARE * (1 + 0.4 * q), 1 - q, now);
      }
      if (ms >= pulseAt && ms < ownAt) {
        head.x = lerp(spot.x, own.x, reach);
        head.y = lerp(spot.y, own.y, reach);
        const back = Math.max(0, reach - PULSE_LEN);
        tail.x = lerp(spot.x, own.x, back);
        tail.y = lerp(spot.y, own.y, back);
        drawBeam(ctx, tail, head, PULSE_W, 1);
      }
    }
    // its own readout swelling with every tether, then the flare
    if (ms >= state.firstFire && ms < ownAt) {
      const c = clamp01((ms - state.firstFire) / (ownAt - state.firstFire));
      drawBeamFlare(
        ctx,
        own,
        lerp(OWN_GLOW[0], OWN_GLOW[1], c * c) * (1 + 0.25 * beat * thrum),
        0.6 + 0.4 * c,
        now,
      );
    } else if (ms >= ownAt && fade < 1)
      drawBeamFlare(ctx, own, OWN_FLARE * (1 + 0.3 * fade), 1 - fade, now);
    drawDetonation(ctx, own, ms - ownAt, OWN_BLAST, now);
  },
  tailMs: Math.max(DETONATION_MS, FADE_MS),
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
