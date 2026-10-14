// Wraparound, an income crit: twin rings of light stand up either side of
// the total's readout; the green amount dives into the left one as a wisp
// and shoots out through the readout into the right one, bursting straight
// back out of the left, round and round, faster and faster, a share every
// pass through the readout; the last pass stops dead in its middle with the
// finale
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  type Warp,
  type WarpLeg,
} from "../../../../shared/animationStyles/portal";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { drawFinale } from "../shared";

// the amount sliding into the left ring, shrinking into the wisp
const IN_MS = 220;
// the rings RING_X either side of the readout's middle, RING px round,
// opening over OPEN_MS, closing CLOSE_MS after the last pass
const RING_X = 430;
const RING = 90;
const OPEN_MS = 140;
const CLOSE_MS = 200;
// the passes: PASSES of them, each from PASS_MS[0] to [1], then the last
// from the left ring into the readout's middle
const PASSES = 9;
const PASS_MS: [number, number] = [420, 75];
const LAST_MS = 90;
// the wisp, growing hotter, its streak behind it TAIL_MS of its flight long
const WISP = WISP_SIZE * 1.3;
const WISP_GROW = WISP_SIZE * 0.9;
const TAIL_MS = 60;
const STREAK = 46;
const SHARE_BLAST = 70;
// shakes by step: a pass's share, unused, the finale
const SHAKES = [0.35, 0.8, 2.4];

interface State {
  warp: Warp;
  // when each pass crosses the readout's middle
  crossings: number[];
  end: number;
  live: Point;
}
const states = new WeakMap<Running, State>();
const into: Point = { x: 0, y: 0 };
const ORIGIN: Point = { x: 0, y: 0 };
const SIDES = [-1, 1];
const head: Point = { x: 0, y: 0 };
const tail: Point = { x: 0, y: 0 };
const atHead = () => head;

registerFloorCrit("wraparoundCrit", {
  plan(r, bars, hit) {
    const state: State = {
      warp: null as unknown as Warp,
      crossings: [],
      end: 0,
      live: bars[0],
    };
    const ringAt = (side: number) => {
      const spot: Point = { x: 0, y: 0 };
      return () => {
        spot.x = state.live.x + side * RING_X;
        spot.y = state.live.y;
        return spot;
      };
    };
    const left = ringAt(-1);
    const right = ringAt(1);
    const legs: WarpLeg[] = [];
    let t = IN_MS;
    for (let k = 0; k < PASSES; k++) {
      const ms = lerp(PASS_MS[0], PASS_MS[1], (k / (PASSES - 1)) ** 0.8);
      legs.push({ from: left, to: right, startMs: t, endMs: t + ms });
      state.crossings.push(t + ms / 2);
      t += ms;
    }
    legs.push({
      from: left,
      to: () => state.live,
      startMs: t,
      endMs: t + LAST_MS,
    });
    state.warp = planWarp(legs);
    state.end = t + LAST_MS;
    for (const at of state.crossings) hit(0, at, 0);
    hit(0, state.end, 2);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    state.live = to;
    const { warp } = state;
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, to.x - RING_X, p),
        lerp(0, to.y, p),
        r.flashFont * lerp(1, 0.25, p),
      );
    }
    const open =
      clamp01(ms / OPEN_MS) * (1 - clamp01((ms - state.end) / CLOSE_MS));
    for (const side of SIDES) {
      ctx.save();
      ctx.translate(to.x + side * RING_X, to.y);
      ctx.rotate(Math.PI / 2);
      if (open > 0) drawPortal(ctx, ORIGIN, RING, open, now);
      for (let k = 0; k < warp.passes.length; k++)
        drawPortalPass(ctx, ORIGIN, ms - warp.passes[k], RING);
      drawPortalPass(ctx, ORIGIN, ms - IN_MS, RING);
      ctx.restore();
    }
    if (ms >= IN_MS && ms <= state.end && warp.at(ms, into)) {
      head.x = into.x;
      head.y = into.y;
      const u = clamp01((ms - IN_MS) / (state.end - IN_MS));
      if (warp.at(Math.max(IN_MS, ms - TAIL_MS), into) && into.x < head.x) {
        tail.x = into.x;
        tail.y = into.y;
        drawBeam(ctx, tail, head, STREAK * (0.5 + u), 0.9);
      }
      drawWispHead(ctx, atHead, ms, now, WISP + WISP_GROW * u, u);
    }
    for (const at of state.crossings)
      drawDetonation(ctx, to, ms - at, SHARE_BLAST, now);
    drawFinale(ctx, to, ms - state.end, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
