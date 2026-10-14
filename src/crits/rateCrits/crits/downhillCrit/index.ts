// Downhill, a rate crit: a ball of light drops onto the top bar in view and
// rolls across it, then drops to the next and rolls back, on down the
// building, each pass from rest and quicker than the last, a jolt at every
// end; every speck of glitter lying on the bars sticks on and turns with it,
// the ball growing; it rolls onto its own bar last and bursts in its middle,
// the crust flung off in a rattle of blasts. Each bar it crossed turns over:
// its next payouts each pay more than the last
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { COLOR } from "../../../../palette";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawSnowball,
  planSnowball,
  rollAt,
  snowballRadius,
  stuckAt,
  type RollPass,
  type Snowball,
} from "../../../../shared/animationStyles/snowball";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";
import {
  BAR_HALF_H,
  holeHash,
  ownLast,
} from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// it drops onto the top bar's end from DROP_IN px up over DROP_IN_MS
const DROP_IN = 320;
const DROP_IN_MS = 260;
// each bar rolled across in CROSS_MS (quicker each), INSET in from its ends;
// its own only to its middle; the drop to the next bar in DROP_MS
const CROSS_MS: [number, number] = [460, 230];
const OWN_CROSS_MS = 320;
const DROP_MS: [number, number] = [170, 110];
const INSET = 60;
// the glitter lying along each bar's top, up to SPREAD px over it; the ball
// picks up what's within REACH of its line
const SPECKS = 22;
const SPREAD = 16;
const REACH = 40;
const SPECK = 20;
// the ball: BASE round, growing GROW a sqrt of a speck, its glow GLOW of it
const BASE = 30;
const GROW = 8;
const GLOW = 2.2;
const GLOW_ALPHA = 0.5;
const WISP: [number, number] = [1, 2.6];
// every CLICK_EVERY-th speck stuck a little jolt
const CLICK_EVERY = 8;
const CLICK_SHAKE = 0.2;
const END_BLAST = 70;
const BAR_BLAST = 110;
// the burst on its own bar: the big blast, then CRUST blasts flung out
// FLING px round it, CRUST_GAP_MS apart
const BURST_BLAST = 250;
const CRUST = 10;
const FLING: [number, number] = [150, 300];
const CRUST_GAP_MS = 40;
const CRUST_BLAST = 90;
// shakes by step: a drop's landing, a bar crossed, the burst
const SHAKES = [0.5, 1, 2.8];

interface Plan {
  ball: Snowball;
  // the bars where it was planned: a scroll since carries all of it along
  planned: Point;
  ends: number[];
  burstMs: number;
  crust: Point[];
  clicks: number;
  path: (ms: number) => Point;
}
const plans = new WeakMap<Running, Plan>();
const GOLD = glowStops(COLOR.heavenlyGold);
const head: Point = { x: 0, y: 0 };
// the ball's radius this frame: the path lifts it off the bar by it
let lift = BASE;

// payouts growing one after another
const rolling = defineBarEffect<{ left: number; step: number }>({
  payout: (run) => 1 + meta.values.growth * run.step,
  onPayout: (run) =>
    run.left > 1 ? { left: run.left - 1, step: run.step + 1 } : undefined,
});

function planDownhill(r: Running, bars: Point[]): Plan {
  const order = ownLast(bars);
  const half = r.play.barHalfWidth - INSET;
  const top = (bar: number) => bars[bar].y - BAR_HALF_H;
  const passes: RollPass[] = [];
  const specks: Point[] = [];
  const ends: number[] = [];
  let at: Point = { x: bars[order[0]].x - half, y: top(order[0]) };
  let t = 0;
  passes.push({
    from: { x: at.x, y: at.y - DROP_IN },
    to: at,
    startMs: t,
    endMs: (t += DROP_IN_MS),
  });
  ends.push(t);
  order.forEach((bar, k) => {
    const own = bar === 0;
    const dir = k % 2 ? -1 : 1;
    const from = { x: bars[bar].x - dir * half, y: top(bar) };
    if (k > 0) {
      const ms = lerp(
        DROP_MS[0],
        DROP_MS[1],
        k / Math.max(1, order.length - 1),
      );
      passes.push({ from: at, to: from, startMs: t, endMs: (t += ms) });
      ends.push(t);
    }
    const to = { x: own ? bars[bar].x : bars[bar].x + dir * half, y: from.y };
    const ms = own
      ? OWN_CROSS_MS
      : lerp(CROSS_MS[0], CROSS_MS[1], k / Math.max(1, order.length - 2));
    passes.push({ from, to, startMs: t, endMs: (t += ms) });
    for (let j = 0; j < SPECKS; j++)
      specks.push({
        x: lerp(from.x, to.x, (j + holeHash(j + k * SPECKS, 1910)) / SPECKS),
        y: from.y - 4 - holeHash(j + k * SPECKS, 1911) * SPREAD,
      });
    at = to;
  });
  const ball = planSnowball(passes, specks, REACH);
  const burstMs = t;
  const path: Point = { x: 0, y: 0 };
  return {
    ball,
    planned: { x: bars[0].x, y: bars[0].y },
    ends,
    burstMs,
    crust: Array.from({ length: CRUST }, (_, k) => {
      const a = holeHash(k, 1912) * Math.PI * 2;
      const d = lerp(FLING[0], FLING[1], holeHash(k, 1913));
      return { x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.6 };
    }),
    clicks: 0,
    path: (ms) => {
      rollAt(ball, ms, path);
      path.y -= lift;
      return path;
    },
  };
}

registerFloorCrit("downhillCrit", {
  // payouts growing, twice as many on its own bar
  reward(t) {
    const { payouts, ownPayouts } = meta.values;
    const left = t.own ? ownPayouts : payouts;
    const run = rolling.get(t.floor);
    rolling.set(
      t.floor,
      run ? { left: run.left + left, step: run.step } : { left, step: 1 },
    );
  },
  plan(r, bars, hit) {
    const plan = planDownhill(r, bars);
    plans.set(r, plan);
    const order = ownLast(bars);
    // a jolt landing on each bar, the reward as it rolls off each
    plan.ends.forEach((at, k) => hit(order[k], at, 0));
    const crossings = plan.ball.passes.filter((_, k) => k > 0 && k % 2 === 1);
    crossings.forEach((pass, k) => {
      if (order[k] !== 0) hit(order[k], pass.endMs, 1);
    });
    hit(0, plan.burstMs, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });

    const stuck = stuckAt(plan.ball, ms);
    while (plan.clicks < Math.floor(stuck / CLICK_EVERY)) {
      plan.clicks++;
      r.shake(CLICK_SHAKE);
    }
    lift = snowballRadius(plan.ball, Math.min(ms, plan.burstMs), BASE, GROW);
    ctx.save();
    ctx.translate(bars[0].x - plan.planned.x, bars[0].y - plan.planned.y);
    const moving = ms < plan.burstMs;
    if (moving) {
      const at = plan.path(ms);
      head.x = at.x;
      head.y = at.y;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = GLOW_ALPHA;
      drawGlow(ctx, GOLD, head.x, head.y, lift * GLOW);
      ctx.restore();
    }
    drawSnowball(ctx, plan.ball, ms, head, lift, SPECK, moving ? 1 : 0);
    drawWispBetween(
      ctx,
      plan.path,
      ms,
      now,
      WISP_SIZE * lerp(...WISP, clamp01(stuck / plan.ball.specks.length)),
      0.6,
      0,
      plan.burstMs,
    );
    // a blast at every end, bigger rolling off a bar
    const { passes } = plan.ball;
    for (let k = 0; k < passes.length - 1; k++) {
      const pass = passes[k];
      drawDetonation(
        ctx,
        pass.to,
        ms - pass.endMs,
        pass.to.y === pass.from.y ? BAR_BLAST : END_BLAST,
        now,
      );
    }
    const last = passes[passes.length - 1].to;
    drawDetonation(ctx, last, ms - plan.burstMs, BURST_BLAST, now);
    for (let k = 0; k < CRUST; k++)
      drawDetonation(
        ctx,
        plan.crust[k],
        ms - plan.burstMs - (k + 1) * CRUST_GAP_MS,
        CRUST_BLAST,
        now,
      );
    ctx.restore();
  },
  tailMs: DETONATION_MS + CRUST * CRUST_GAP_MS,
  shake: (step) => SHAKES[step],
});
