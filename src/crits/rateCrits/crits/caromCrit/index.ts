// Carom, a rate crit: the number balls up into a wisp that shoots off to the
// screen's side and banks off it down onto the top bar's readout, then off
// the other side onto the next bar down, and on down the building, quicker
// and quicker, a splash and a tick at every wall and a blast on every
// readout, which turns over: each of the bar's next payouts pays more than
// the last; it banks in onto its own bar last, the hardest hit
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  drawBounceSplash,
  ricochetThrough,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSpinTick } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { BAR_HALF_H, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the walls EDGE in from the screen's sides, hit ABOVE each bar; the bars hit
// READOUT of the way out along them
const EDGE = 40;
const ABOVE = 260;
const READOUT = 0.55;
// each leg LEG_MS (quickening)
const LEG_MS: [number, number] = [260, 90];
const WISP: [number, number] = [1.1, 1.8];
const SPLASH = 120;
const WALL_SHAKE = 0.4;
const BLAST = 130;
const OWN_BLAST = 260;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1, 2.4];

interface State {
  path: BouncePath;
  // each bounce's bar, -1 off a wall
  bars: number[];
  walls: number[];
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };

// a carom run: each payout `step` bigger than the last, `left` to go
const runs = defineBarEffect<{ left: number; n: number }>({
  payout: (run) => 1 + meta.values.step * run.n,
  onPayout: (run) =>
    run.left > 1 ? { left: run.left - 1, n: run.n + 1 } : undefined,
});

registerFloorCrit("caromCrit", {
  reward(t) {
    t.flipRate();
    runs.set(t.floor, {
      left: t.own ? meta.values.ownPayouts : meta.values.payouts,
      n: 1,
    });
    t.punch("Carom!");
  },
  plan(r, bars, hit) {
    const base = bars[0];
    const half = r.play.barHalfWidth;
    const wall = r.viewportWidth / 2 - EDGE;
    const points: Point[] = [{ x: -base.x, y: -base.y }];
    const of: number[] = [];
    ownLast(bars).forEach((bar, k) => {
      const side = k % 2 ? 1 : -1;
      const b = bars[bar];
      points.push({ x: side * wall - base.x, y: b.y - ABOVE - base.y });
      of.push(-1);
      points.push({
        x: b.x - side * half * READOUT - base.x,
        y: b.y - BAR_HALF_H - base.y,
      });
      of.push(bar);
    });
    const path = ricochetThrough(points, LEG_MS, IN_MS);
    const walls: number[] = [];
    path.bounces.forEach((bounce, k) => {
      if (of[k] < 0) walls.push(bounce.ms);
      else hit(of[k], bounce.ms, of[k] === 0 ? 2 : 1);
    });
    states.set(r, { path, bars: of, walls });
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
    // a tick and a jolt off every wall
    while (r.kicked < state.walls.length && ms >= state.walls[r.kicked]) {
      r.shake(WALL_SHAKE);
      playSpinTick(1 + r.kicked * 0.1);
      r.kicked++;
    }
    const { path } = state;
    ctx.save();
    ctx.translate(bars[0].x, bars[0].y);
    const u = clamp01((ms - path.startMs) / (path.endMs - path.startMs));
    drawWispBetween(
      ctx,
      path.at,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], u),
      u,
      path.startMs,
      path.endMs,
    );
    for (let k = 0; k < path.bounces.length; k++) {
      const bounce = path.bounces[k];
      const bar = state.bars[k];
      drawBounceSplash(ctx, bounce, ms - bounce.ms, SPLASH, now);
      if (bar < 0) continue;
      at.x = bounce.at.x;
      at.y = bounce.at.y;
      drawDetonation(
        ctx,
        at,
        ms - bounce.ms,
        bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
