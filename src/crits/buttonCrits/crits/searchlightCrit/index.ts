// Searchlight, a button crit: the number drops to a searchlight lamp at the
// foot of the buttons, off to their side; a flickering aim laser swings up
// over them, then the beam sweeps back and forth across the column, wider and
// quicker each pass, every button it crosses flaring and jolting; then it
// locks on, top to bottom, quicker each, snapping onto a button and blazing
// as it turns over: each of its next taps also hires a worker on the floor
// above; its own button last, the widest beam and the biggest blast
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed } from "../../../../gameState";
import {
  drawAimLaser,
  drawBeam,
  drawBeamFlare,
} from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import {
  bottomBarY,
  groundY,
  ownLast,
  topBarY,
} from "../../../floorCrits/critPlayer/shared";

// the number dropping onto the lamp, LAMP_SIDE px off the buttons' left end
// and LAMP_BELOW px under the lowest
const DROP_MS = 190;
const DROP_RISE = 90;
const DROP_BLAST = 120;
const LAMP_SIDE = 130;
const LAMP_BELOW = 150;
const LAMP = WISP_SIZE * 1.3;
// the sweeps: up, down, up, down, each quicker; the first an aim laser, then
// a beam ever wider, swept OVERSHOOT of a button past the column's ends and
// reaching on REACH times past it
const SWEEP_MS = [300, 230, 170, 125];
const SWEEP_BEAM = [0, 18, 28, 40];
const OVERSHOOT = 0.8;
const REACH = 1.5;
const CROSS_MS = 140;
const CROSS_FLARE = [0, 34, 44, 56];
// the locks: snapping SNAP_MS onto each, LOCK_GAP_MS apart (quicker each, the
// lot squeezed into LOCKS_MS), its own OWN_GAP_MS after the last
const SNAP_MS = 70;
const LOCK_GAP_MS: [number, number] = [170, 90];
const LOCKS_MS = 760;
const OWN_GAP_MS = 230;
const LOCK_BEAM: [number, number] = [44, 62];
const OWN_BEAM = 110;
const SPIKE = 60;
const OWN_SPIKE = 120;
const SPIKE_MS = 130;
const FLARE = 60;
const OWN_FLARE = 120;
const LOCK_BLAST = 160;
const OWN_BLAST = 400;
const FADE_MS = 320;
// shakes by step: a crossing, a lock, its own
const SHAKES = [0.4, 1.1, 3];

interface State {
  // the sweeps' start times, and when the locks begin
  sweeps: number[];
  sweepEnd: number;
  // each crossing: its time, button and sweep
  crossAt: Float32Array;
  crossBar: Uint8Array;
  crossPass: Uint8Array;
  // the buttons top to bottom, its own last, each locked at its time
  order: number[];
  locks: number[];
  end: number;
}
const states = new WeakMap<Running, State>();
const lamp: Point = { x: 0, y: 0 };
const aim: Point = { x: 0, y: 0 };
const tip: Point = { x: 0, y: 0 };
const atLamp = () => lamp;

// each tap also hiring a worker on the floor above
const spotTaps = defineTapPerk("Spot", (t) => {
  const above = t.floors[t.floors.indexOf(t.floor) + 1];
  if (above?.unlocked && !isFloorMaxed(above)) t.hire(above);
});

// the sweep's ends on the column: below the lowest button and over the top one
const sweepLow = (bars: Point[]) => bottomBarY(bars) + BTN_H * OVERSHOOT;
const sweepHigh = (bars: Point[]) => topBarY(bars) - BTN_H * OVERSHOOT;

// where sweep k aims at ms (into aim): straight up or down the column
function sweepAim(bars: Point[], k: number, u: number): void {
  const low = sweepLow(bars);
  const high = sweepHigh(bars);
  aim.x = bars[0].x;
  aim.y = k % 2 === 0 ? lerp(low, high, u) : lerp(high, low, u);
}

registerFloorCrit("searchlightCrit", {
  reward(t) {
    spotTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    hit(0, DROP_MS, 0);
    const low = sweepLow(bars);
    const high = sweepHigh(bars);
    const sweeps: number[] = [];
    const crossAt: number[] = [];
    const crossBar: number[] = [];
    const crossPass: number[] = [];
    let t = DROP_MS;
    for (let k = 0; k < SWEEP_MS.length; k++) {
      sweeps.push(t);
      const from = k % 2 === 0 ? low : high;
      const to = k % 2 === 0 ? high : low;
      for (let bar = 0; bar < bars.length; bar++) {
        const u = (bars[bar].y - from) / (to - from);
        if (k === 0 || u <= 0 || u >= 1) continue;
        const at = t + u * SWEEP_MS[k];
        crossAt.push(at);
        crossBar.push(bar);
        crossPass.push(k);
        hit(bar, at, 0);
      }
      t += SWEEP_MS[k];
    }
    const sweepEnd = t;
    const order = ownLast(bars);
    const others = order.length - 1;
    let total = 0;
    for (let k = 1; k < others; k++)
      total += lerp(
        LOCK_GAP_MS[0],
        LOCK_GAP_MS[1],
        k / Math.max(1, others - 1),
      );
    const squeeze = total > LOCKS_MS ? LOCKS_MS / total : 1;
    const locks: number[] = [];
    let at = sweepEnd + SNAP_MS;
    for (let k = 0; k < order.length; k++) {
      if (k > 0)
        at +=
          k === others
            ? OWN_GAP_MS
            : lerp(
                LOCK_GAP_MS[0],
                LOCK_GAP_MS[1],
                k / Math.max(1, others - 1),
              ) * squeeze;
      locks.push(at);
      hit(order[k], at, order[k] === 0 ? 2 : 1);
    }
    states.set(r, {
      sweeps,
      sweepEnd,
      crossAt: Float32Array.from(crossAt),
      crossBar: Uint8Array.from(crossBar),
      crossPass: Uint8Array.from(crossPass),
      order,
      locks,
      end: at,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    let left = Infinity;
    for (let i = 0; i < bars.length; i++)
      if (bars[i].x < left) left = bars[i].x;
    lamp.x = left - BTN_W / 2 - LAMP_SIDE;
    lamp.y = groundY(r, bars, LAMP_BELOW);
    if (ms < DROP_MS) {
      const u = ms / DROP_MS;
      const p = u * u;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lamp.x * p,
        lamp.y * p - DROP_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.5 * p),
      );
      return;
    }
    const { sweeps, sweepEnd, order, locks, end } = state;
    const fade = ms > end ? 1 - clamp01((ms - end) / FADE_MS) : 1;
    // the lamp heating up as the sweeps quicken, white hot through the locks
    drawWispHead(
      ctx,
      atLamp,
      ms,
      now,
      LAMP,
      clamp01((ms - DROP_MS) / (end - DROP_MS)),
      fade,
    );
    drawDetonation(ctx, lamp, ms - DROP_MS, DROP_BLAST, now);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    if (ms < sweepEnd) {
      let k = sweeps.length - 1;
      while (k > 0 && ms < sweeps[k]) k--;
      sweepAim(bars, k, (ms - sweeps[k]) / SWEEP_MS[k]);
      tip.x = lamp.x + (aim.x - lamp.x) * REACH;
      tip.y = lamp.y + (aim.y - lamp.y) * REACH;
      if (k === 0) drawAimLaser(ctx, lamp, tip);
      else drawBeam(ctx, lamp, tip, SWEEP_BEAM[k], 0.7);
    } else if (fade > 0) {
      // locked on: snapping from the last button (or the sweep's foot) onto
      // the next, then blazing on it
      let k = 0;
      while (k < locks.length - 1 && ms >= locks[k + 1] - SNAP_MS) k++;
      const to = bars[order[k]];
      const u = clamp01((ms - (locks[k] - SNAP_MS)) / SNAP_MS);
      if (k > 0) {
        const from = bars[order[k - 1]];
        tip.x = lerp(from.x, to.x, u);
        tip.y = lerp(from.y, to.y, u);
      } else {
        tip.x = lerp(bars[0].x, to.x, u);
        tip.y = lerp(sweepLow(bars), to.y, u);
      }
      const own = order[k] === 0;
      const since = ms - locks[k];
      const spike = since >= 0 ? Math.exp(-since / SPIKE_MS) : 0;
      const width = own
        ? OWN_BEAM + OWN_SPIKE * spike
        : lerp(LOCK_BEAM[0], LOCK_BEAM[1], k / Math.max(1, locks.length - 1)) +
          SPIKE * spike;
      drawBeam(ctx, lamp, tip, width, fade);
      if (since >= 0)
        drawBeamFlare(
          ctx,
          to,
          (own ? OWN_FLARE : FLARE) * (1 + spike),
          fade,
          now,
        );
    }
    const { crossAt, crossBar, crossPass } = state;
    for (let i = 0; i < crossAt.length; i++) {
      const since = ms - crossAt[i];
      if (since < 0 || since >= CROSS_MS) continue;
      const p = crossPass[i];
      drawBeamFlare(
        ctx,
        bars[crossBar[i]],
        CROSS_FLARE[p] * (1.4 - since / CROSS_MS),
        1 - since / CROSS_MS,
        now,
      );
    }
    ctx.globalCompositeOperation = previous;
    for (let k = 0; k < order.length; k++)
      drawDetonation(
        ctx,
        bars[order[k]],
        ms - locks[k],
        order[k] === 0 ? OWN_BLAST : LOCK_BLAST,
        now,
      );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
