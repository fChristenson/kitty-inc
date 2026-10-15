// Swing By, a rate crit: the number shrinks into a wisp that shoots onto the
// top bar's readout, whips round it in one tight loop and is slung off onto
// the next, and the next, down the building, faster each, every readout it
// loops turning over in a blast; at its own it whips round three times,
// tighter and faster, and dives into it for the biggest blast: each bar's
// next payouts come quicker and bigger
import meta from "./meta";
import { countDown, defineBarEffect } from "../../rateBonus";
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

const IN_MS = 120;
// the loops LOOP px round each readout (READOUT of a bar's half width out),
// SQUASH as tall, LOOP_MS each (quickening), TRANSIT_MS from one to the next
// (quickening); its own OWN_LOOPS loops tightening to TIGHT, then a dive
const READOUT = 0.6;
const LOOP = 130;
const SQUASH = 0.6;
const LOOP_MS: [number, number] = [220, 120];
const TRANSIT_MS: [number, number] = [140, 70];
const OWN_LOOPS = [200, 150, 110];
const TIGHT = 0.35;
const DIVE_MS = 70;
const WISP = WISP_SIZE * 1.3;
const BLAST = 160;
const OWN_BLAST = 400;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1.1, 3];

// a leg of its flight: a dash from one readout's loop onto the next's, a
// loop round a readout, or the dive into one
interface Leg {
  kind: "dash" | "loop" | "dive";
  t0: number;
  t1: number;
  // the readout it's on (its order index) and the one it left (-1: the start)
  k: number;
  from: number;
  // the loop's radius at its start and end (a dash's: the left one's, then
  // the arrival's)
  r0: number;
  r1: number;
}
interface State {
  order: number[];
  readouts: Point[];
  legs: Leg[];
  loops: number[];
  hits: number[];
  wisp: (ms: number) => Point;
}
const states = new WeakMap<Running, State>();

// boosted payouts: quicker and bigger, `left` left
const boosts = defineBarEffect<number>({
  speed: () => meta.values.speed,
  payout: () => meta.values.payout,
  onPayout: countDown,
});

registerFloorCrit("swingByCrit", {
  reward(t) {
    t.flipRate();
    boosts.set(t.floor, meta.values.payouts * (t.own ? 2 : 1));
    t.punch(`x${meta.values.speed} Speed x${meta.values.payout} Pay`);
  },
  plan(r, bars, hit) {
    const order = bars
      .map((_, k) => k)
      .filter((k) => k > 0)
      .sort((p, q) => bars[p].y - bars[q].y);
    order.push(0);
    const legs: Leg[] = [];
    const loops: number[] = [];
    const hits: number[] = [];
    let t = IN_MS;
    let from = -1;
    order.forEach((bar, k) => {
      const u = k / Math.max(1, order.length - 2);
      const dash = lerp(TRANSIT_MS[0], TRANSIT_MS[1], u);
      legs.push({
        kind: "dash",
        t0: t,
        t1: t + dash,
        k,
        from,
        r0: LOOP,
        r1: LOOP,
      });
      t += dash;
      if (bar === 0) {
        OWN_LOOPS.forEach((ms, j) => {
          const r0 = LOOP * lerp(1, TIGHT, j / OWN_LOOPS.length);
          const r1 = LOOP * lerp(1, TIGHT, (j + 1) / OWN_LOOPS.length);
          legs.push({ kind: "loop", t0: t, t1: t + ms, k, from: k, r0, r1 });
          loops.push(t);
          t += ms;
        });
        legs.push({
          kind: "dive",
          t0: t,
          t1: t + DIVE_MS,
          k,
          from: k,
          r0: LOOP * TIGHT,
          r1: 0,
        });
        t += DIVE_MS;
      } else {
        const ms = lerp(LOOP_MS[0], LOOP_MS[1], u);
        legs.push({
          kind: "loop",
          t0: t,
          t1: t + ms,
          k,
          from: k,
          r0: LOOP,
          r1: LOOP,
        });
        loops.push(t);
        t += ms;
      }
      hits.push(t);
      hit(bar, t, bar === 0 ? 2 : 1);
      from = k;
    });
    const readouts = order.map(() => ({ x: 0, y: 0 }));
    const at: Point = { x: 0, y: 0 };
    // a point on readout k's loop, `r` round, at angle a
    const onLoop = (k: number, r: number, a: number, into: Point) => {
      into.x = readouts[k].x + Math.cos(a) * r;
      into.y = readouts[k].y + Math.sin(a) * r * SQUASH;
      return into;
    };
    const p: Point = { x: 0, y: 0 };
    const q: Point = { x: 0, y: 0 };
    states.set(r, {
      order,
      readouts,
      legs,
      loops,
      hits,
      wisp: (ms) => {
        let i = 0;
        while (i < legs.length - 1 && ms > legs[i].t1) i++;
        const leg = legs[i];
        const u = clamp01((ms - leg.t0) / (leg.t1 - leg.t0));
        if (leg.kind === "loop")
          return onLoop(
            leg.k,
            lerp(leg.r0, leg.r1, u),
            Math.PI + Math.PI * 2 * u,
            at,
          );
        if (leg.kind === "dive") {
          onLoop(leg.k, leg.r0, Math.PI, p);
          at.x = lerp(p.x, readouts[leg.k].x, u * u);
          at.y = lerp(p.y, readouts[leg.k].y, u * u);
          return at;
        }
        if (leg.from < 0) {
          p.x = 0;
          p.y = 0;
        } else
          onLoop(leg.from, LOOP * (leg.from === leg.k ? TIGHT : 1), Math.PI, p);
        onLoop(leg.k, leg.r0, Math.PI, q);
        at.x = lerp(p.x, q.x, u);
        at.y = lerp(p.y, q.y, u);
        return at;
      },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const half = r.play.barHalfWidth;
    const { order, readouts, legs, loops, hits } = state;
    for (let k = 0; k < order.length; k++) {
      readouts[k].x = bars[order[k]].x + half * READOUT;
      readouts[k].y = bars[order[k]].y;
    }
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - 0.7 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    // a whoosh as it whips into every loop
    while (r.kicked < loops.length && ms >= loops[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    const end = legs[legs.length - 1].t1;
    drawWispBetween(
      ctx,
      state.wisp,
      ms,
      now,
      WISP,
      clamp01((ms - IN_MS) / (end - IN_MS)),
      IN_MS,
      end,
    );
    for (let k = 0; k < order.length; k++)
      drawDetonation(
        ctx,
        readouts[k],
        ms - hits[k],
        order[k] === 0 ? OWN_BLAST : BLAST,
        now,
      );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
