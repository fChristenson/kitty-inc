// Quickstep, a rate crit: a wisp drops onto each bar's left end and hops
// along it to the right, each hop quicker and shorter, the crit's own last;
// every landing a tick that turns the bar's readout over a step faster, and
// for a while after, each of its payouts comes quicker than the last
import { defineBarEffect } from "../../rateBonus";
import { CONFIG } from "../../../../config";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  drawBounceSplash,
  hops,
  SPLASH_MS,
  type Bounce,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const FIRST = 120;
// each run starts this much sooner after the last, down to MIN_GAP
const GAP = 260;
const GAP_DROP = 25;
const MIN_GAP = 130;
const LANDINGS = 7;
const INSET = 50;
// it drops in from this far over the bar's left end
const DROP = 200;
const HOP_MS: [number, number] = [130, 45];
const HOP_LIFT: [number, number] = [110, 40];
const SPLASH = 70;
const LAND_BLAST = 90;
const OWN_LAND_BLAST = 170;
const TAIL_MS = 700;

interface Run {
  bar: number;
  path: BouncePath;
  at: (ms: number) => Point;
}

interface State {
  bars: Point[];
  runs: Run[];
}

const states = new WeakMap<Running, State>();
const splash: Bounce = { at: { x: 0, y: 0 }, ms: 0, normal: -Math.PI / 2 };

// a run of quickening: each landing and payout in it a step faster
const quicksteps = defineBarEffect<{ until: number; steps: number }>({
  speed: (run) =>
    Math.min(
      CONFIG.crit.quickstepMaxSpeed,
      1 + CONFIG.crit.quickstepStep * run.steps,
    ),
  onPayout: (run) => {
    run.steps++;
    return run;
  },
  ended: (run, now) => now >= run.until,
});

registerFloorCrit("quickstepCrit", {
  // a step, starting a run if none is on
  reward(t) {
    const run = quicksteps.get(t.floor);
    if (run && t.now < run.until) run.steps++;
    else
      quicksteps.set(t.floor, {
        until: t.now + CONFIG.crit.quickstepMs,
        steps: 1,
      });
  },
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth - INSET;
    const top = -getIncomeBarBox(false).height / 2;
    const order = [...byHeight(bars).filter((bar) => bar !== 0), 0];
    const state: State = { bars, runs: [] };
    // the drop in, then each landing along the bar's top edge, from its middle
    const points: Point[] = [{ x: -half, y: top - DROP }];
    for (let j = 0; j < LANDINGS; j++)
      points.push({ x: lerp(-half, half, j / (LANDINGS - 1)), y: top });
    let t = FIRST;
    order.forEach((bar, k) => {
      const path = hops(points, HOP_MS, HOP_LIFT, t);
      const at: Point = { x: 0, y: 0 };
      state.runs.push({
        bar,
        path,
        at: (ms) => {
          const mid = state.bars[bar];
          const p = path.at(ms);
          at.x = mid.x + p.x;
          at.y = mid.y + p.y;
          return at;
        },
      });
      path.bounces.forEach((bounce, j) =>
        hit(bar, bounce.ms, j < LANDINGS - 1 ? 1 : bar === 0 ? 3 : 2),
      );
      t += Math.max(MIN_GAP, GAP - GAP_DROP * k);
    });
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r)!;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < FIRST)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / FIRST,
      });
    for (const run of state.runs) {
      const { path } = run;
      if (ms < path.startMs) continue;
      drawWispBetween(
        ctx,
        run.at,
        ms,
        now,
        WISP_SIZE * 1.2,
        0.7,
        path.startMs,
        path.endMs,
      );
      const mid = bars[run.bar];
      const { bounces } = path;
      for (let j = bounces.length - 1; j >= 0; j--) {
        const since = ms - bounces[j].ms;
        if (since < 0) continue;
        if (since >= SPLASH_MS) break;
        splash.at.x = mid.x + bounces[j].at.x;
        splash.at.y = mid.y + bounces[j].at.y;
        drawBounceSplash(ctx, splash, since, SPLASH, now);
      }
      const last = bounces[bounces.length - 1];
      splash.at.x = mid.x + last.at.x;
      splash.at.y = mid.y + last.at.y;
      drawDetonation(
        ctx,
        splash.at,
        ms - last.ms,
        run.bar === 0 ? OWN_LAND_BLAST : LAND_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) =>
    step === 3 ? 2.8 : step === 2 ? 1.2 : step === 1 ? 0.4 : 0.6,
});
