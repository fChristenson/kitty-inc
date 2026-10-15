// Catch Up, a rate crit: the number splits into wisps that pair up round
// every bar's readout, one fleeing, one chasing, whipping round it on a
// tightening loop faster and faster, the chaser gaining every lap, until it
// catches the other dead on the readout in a blast and the readout turns
// over; bar after bar, quicker each, its own last and biggest: each bar's
// next payouts grow bigger one after another
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// round each readout (READOUT of a bar's half width out): a loop RX by RY
// px, closing in to nothing by the catch; laps a second rising through HZ
const READOUT = 0.6;
const RX = 180;
const RY = 80;
const HZ: [number, number] = [4, 9];
// each chase CHASE_MS (quicker each), the next STAGGER_MS on (closing)
const CHASE_MS: [number, number] = [560, 400];
const OWN_CHASE_MS = 640;
const STAGGER_MS: [number, number] = [110, 60];
const RUNNER = WISP_SIZE * 0.9;
const CHASER = WISP_SIZE * 1.2;
const OWN = 1.4;
const BLAST = 180;
const OWN_BLAST = 400;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1.1, 3];

interface Chase {
  bar: number;
  own: boolean;
  start: number;
  catchAt: number;
  // the readout, live
  at: Point;
  runner: (ms: number) => Point;
  chaser: (ms: number) => Point;
}
const states = new WeakMap<Running, Chase[]>();

// growing payouts: each one STEP bigger than the last
const growing = defineBarEffect<{ left: number; k: number }>({
  payout: (g) => 1 + meta.values.step * g.k,
  onPayout: (g) => (g.left > 1 ? { left: g.left - 1, k: g.k + 1 } : undefined),
});

registerFloorCrit("catchUpCrit", {
  reward(t) {
    t.flipRate();
    growing.set(t.floor, { left: meta.values.payouts * (t.own ? 2 : 1), k: 1 });
    t.punch(`+${Math.round(meta.values.step * 100)}% a Payout`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const chases: Chase[] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const u = k / Math.max(1, order.length - 2);
      const ms = own ? OWN_CHASE_MS : lerp(CHASE_MS[0], CHASE_MS[1], u);
      const start = t;
      const catchAt = start + ms;
      const a0 = holeHash(k, 5210) * Math.PI * 2;
      const at: Point = { x: 0, y: 0 };
      // the angle round the loop and how tight it is, `lag` rad behind
      const loop = (lag: (u: number) => number) => {
        const p: Point = { x: 0, y: 0 };
        return (now: number): Point => {
          const s = clamp01((now - start) / ms);
          const secs = (s * ms) / 1000;
          const turn =
            Math.PI * 2 * (HZ[0] * secs + ((HZ[1] - HZ[0]) * secs * s) / 2);
          const a = a0 + turn - lag(s);
          const tight = 1 - s ** 3;
          const size = own ? OWN : 1;
          p.x = at.x + Math.cos(a) * RX * tight * size;
          p.y = at.y + Math.sin(a) * RY * tight * size;
          return p;
        };
      };
      chases.push({
        bar,
        own,
        start,
        catchAt,
        at,
        runner: loop(() => 0),
        chaser: loop((s) => Math.PI * (1 - s) ** 2),
      });
      hit(bar, catchAt, own ? 2 : 1);
      t += lerp(STAGGER_MS[0], STAGGER_MS[1], u);
    });
    states.set(r, chases);
  },
  draw(ctx, r, ms, bars) {
    const chases = states.get(r);
    if (!chases) return;
    const now = r.startedAt + ms;
    const half = r.play.barHalfWidth;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - 0.5 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    // a whoosh as each chase sets off
    while (r.kicked < chases.length && ms >= chases[r.kicked].start) {
      playSwoosh();
      r.kicked++;
    }
    for (let k = 0; k < chases.length; k++) {
      const c = chases[k];
      const bar = bars[c.bar];
      c.at.x = bar.x + half * READOUT;
      c.at.y = bar.y;
      const size = c.own ? OWN : 1;
      drawWispBetween(
        ctx,
        c.runner,
        ms,
        now,
        RUNNER * size,
        0.5,
        c.start,
        c.catchAt,
      );
      drawWispBetween(
        ctx,
        c.chaser,
        ms,
        now,
        CHASER * size,
        1,
        c.start,
        c.catchAt,
      );
      drawDetonation(ctx, c.at, ms - c.catchAt, c.own ? OWN_BLAST : BLAST, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
