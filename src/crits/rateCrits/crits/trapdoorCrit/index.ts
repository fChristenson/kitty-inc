// Trapdoor, a rate crit: a gold ring opens flat under the building and its
// twin over the top bar's readout; the number drops as a wisp into the lower
// ring and falls out of the upper one at once, keeping its speed, straight
// down through the readout, which turns over, and on into the lower ring
// again; the upper ring hops down to the next bar each time, every fall
// quicker, a pop and a jolt at every pass; it ends falling out over its own
// bar and slamming into its readout in the biggest blast: every bar it fell
// through pays twice as much for a while
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  portalLook,
  type Warp,
  type WarpLeg,
} from "../../../../shared/animationStyles/portal";
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
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the rings: over READOUT of the way out along the bars, the lower one BELOW
// the lowest bar, the upper one ABOVE each bar; RING px round, opening over
// OPEN_MS
const READOUT = 0.55;
const BELOW = 260;
const ABOVE = 230;
const RING = 90;
const LOW_RING = 120;
const OPEN_MS = 120;
// the drop into the lower ring, then each fall FALL_MS (quickening), its
// own OWN_MS
const DROP_MS = 300;
const FALL_MS: [number, number] = [520, 220];
const OWN_MS = 200;
const WISP: [number, number] = [1, 1.8];
const PASS_SHAKE: [number, number] = [0.3, 0.8];
const BLAST = 130;
const OWN_BLAST = 300;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1, 2.6];

interface Fall {
  bar: number;
  // the upper ring over it, from bars[0], open from opens to shuts
  ring: Point;
  opens: number;
  shuts: number;
  through: number;
}
interface State {
  warp: Warp;
  runner: (ms: number) => Point | null;
  low: Point;
  falls: Fall[];
  passes: number[];
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// a fallen-through bar: pays `payout` times as much till then
const trapped = defineBarEffect<number>({
  payout: () => meta.values.payout,
  ended: (until, now) => now >= until,
});

// how far through a falling leg (0..1 of its time) it's gone `share` of the way
const fallTime = (share: number) => -0.5 + Math.sqrt(0.25 + 2 * share);

registerFloorCrit("trapdoorCrit", {
  reward(t) {
    t.flipRate();
    trapped.set(t.floor, t.now + (t.own ? meta.values.ownMs : meta.values.ms));
    t.punch(`x${meta.values.payout} Payouts`);
  },
  plan(r, bars, hit) {
    const own = bars[0];
    const x = r.play.barHalfWidth * READOUT;
    let lowest = 0;
    for (const b of bars) lowest = Math.max(lowest, b.y - own.y);
    const low = { x, y: lowest + BELOW };
    const legs: WarpLeg[] = [
      {
        from: { x: -own.x, y: -own.y },
        to: low,
        startMs: IN_MS,
        endMs: IN_MS + DROP_MS,
        fall: true,
      },
    ];
    const falls: Fall[] = [];
    const order = ownLast(bars);
    let t = IN_MS + DROP_MS;
    order.forEach((bar, k) => {
      const y = bars[bar].y - own.y;
      const ring = { x, y: y - ABOVE };
      const isOwn = bar === 0;
      const ms = isOwn
        ? OWN_MS
        : lerp(FALL_MS[0], FALL_MS[1], k / Math.max(1, order.length - 2));
      const to = isOwn ? { x, y } : low;
      legs.push({ from: ring, to, startMs: t, endMs: t + ms, fall: true });
      const through = isOwn
        ? t + ms
        : t + ms * fallTime((y - ring.y) / (low.y - ring.y));
      falls.push({
        bar,
        ring,
        opens: t - OPEN_MS,
        shuts: t + OPEN_MS,
        through,
      });
      hit(bar, through, isOwn ? 2 : 1);
      t += ms;
    });
    const warp = planWarp(legs);
    states.set(r, {
      warp,
      runner: (ms) => warp.at(ms, spot),
      low,
      falls,
      passes: [...warp.passes].sort((a, b) => a - b),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - (0.6 * ms) / IN_MS),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    // a whoosh and a jolt at every pass, harder each
    const { passes, warp, low, falls } = state;
    while (r.kicked < passes.length && ms >= passes[r.kicked]) {
      r.shake(
        lerp(
          PASS_SHAKE[0],
          PASS_SHAKE[1],
          r.kicked / Math.max(1, passes.length - 1),
        ),
      );
      playSwoosh();
      r.kicked++;
    }
    const own = bars[0];
    ctx.save();
    ctx.translate(own.x, own.y);
    // the lower ring, open till the last dive into it
    const lastDive = passes[passes.length - 1] ?? warp.endMs;
    const lowOpen =
      clamp01((ms - IN_MS + OPEN_MS) / OPEN_MS) *
      (1 - clamp01((ms - lastDive - OPEN_MS) / OPEN_MS));
    drawPortal(ctx, low, LOW_RING, lowOpen, now, 1, portalLook(4));
    for (const f of falls) {
      const open = Math.min(
        clamp01((ms - f.opens) / OPEN_MS),
        1 - clamp01((ms - f.shuts) / OPEN_MS),
      );
      drawPortal(ctx, f.ring, RING, open, now, 1, portalLook(2));
      drawPortalPass(ctx, f.ring, ms - f.opens - OPEN_MS, RING);
    }
    for (let k = 0; k < passes.length; k++)
      drawPortalPass(ctx, low, ms - passes[k], LOW_RING);
    const u = clamp01((ms - warp.startMs) / (warp.endMs - warp.startMs));
    drawWispBetween(
      ctx,
      state.runner,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], u),
      u,
      warp.startMs,
      warp.endMs,
    );
    ctx.restore();
    for (const f of falls) {
      at.x = bars[f.bar].x + f.ring.x;
      at.y = bars[f.bar].y;
      drawDetonation(
        ctx,
        at,
        ms - f.through,
        f.bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
