// Snowball Effect, a rate crit: a little ball of light drops onto the top
// bar's left end and rolls along its readout's row from rest, every speck of
// glitter strewn there sticking on, the ball swelling and wobbling; at the
// readout a chunk of it bursts off into it in a flash, and it swoops back
// left and down onto the next bar, quicker and bigger each row, a jolt at
// every landing; on its own bar it rolls up to its readout and the whole
// giant ball slams into it in the big blast, its crust flung off all round.
// Every bar it hit shares one snowball: each payout from any of them makes
// all of them pay more
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
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSpinTick } from "../../../../sound";
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

const IN_MS = 140;
// it drops onto the top bar from DROP_IN px up over DROP_IN_MS
const DROP_IN = 300;
const DROP_IN_MS = 200;
// each row rolled from INSET in from a bar's left end to its readout
// (READOUT of its half width out, CONTACT_Y off its middle) in ROLL_MS, the
// swoop to the next row in SWOOP_MS, quicker each; all squeezed into MAX_MS
const INSET = 50;
const READOUT = 0.6;
const CONTACT_Y = -20;
const ROLL_MS: [number, number] = [320, 170];
const SWOOP_MS: [number, number] = [150, 90];
const MAX_MS = 1600;
// the giant ball slamming down into its own readout
const SLAM_MS = 90;
// the glitter strewn along each row, up to SPREAD px over it; picked up
// within REACH of the ball's line
const SPECKS = 18;
const SPREAD = 14;
const REACH = 40;
const SPECK = 20;
// the ball: BASE round, growing GROW a sqrt of a speck, its glow GLOW of it,
// wobbling up to WOBBLE of its size as it fills (WOBBLE_W rad/ms)
const BASE = 26;
const GROW = 7;
const GLOW = 2.2;
const GLOW_ALPHA = 0.5;
const WOBBLE = 0.1;
const WOBBLE_W = 0.045;
const WISP: [number, number] = [1, 2.6];
// a chunk of CHUNK specks bursting off into a readout in CHUNK_MS, the ball
// dipping CHUNK_DIP smaller over DIP_MS; the readout flashing FLASH px round
// over FLASH_MS
const CHUNK = 8;
const CHUNK_MS = 90;
const CHUNK_DIP = 0.22;
const DIP_MS = 110;
const FLASH = 90;
const FLASH_MS = 160;
// the burst: one big blast, the crust flung FLING px out over FLING_MS
const BURST_BLAST = 300;
const FLING: [number, number] = [140, 320];
const FLING_MS = 420;
// a jolt landing on each row, harder down the building
const LAND_SHAKE: [number, number] = [0.3, 0.9];
// shakes by step: -, a readout, its own
const SHAKES = [0.5, 0.8, 3];

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);
// a chunk's specks' spread round where they leave, in ball radii
const CJX = new Float32Array(CHUNK);
const CJY = new Float32Array(CHUNK);
for (let j = 0; j < CHUNK; j++) {
  const a = (j / CHUNK) * Math.PI * 2 + holeHash(j, 2311);
  CJX[j] = Math.cos(a) * 0.8;
  CJY[j] = Math.sin(a) * 0.8;
}

interface Plan {
  ball: Snowball;
  // the bars where it was planned: a scroll since carries all of it along
  planned: Point;
  // each row's landing (a jolt)
  landAt: Float32Array;
  // each readout's chunk: when it leaves the ball, from where, to where
  chunkAt: Float32Array;
  chunkX: Float32Array;
  chunkY: Float32Array;
  chunkTX: Float32Array;
  chunkTY: Float32Array;
  // each speck's fling out of the burst
  fling: Float32Array;
  slamFrom: number;
  burstMs: number;
  burst: Point;
  path: (ms: number) => Point;
}
const plans = new WeakMap<Running, Plan>();
const head: Point = { x: 0, y: 0 };
const TEXT = { alpha: 1 };
// the ball's lift off its line this frame
let lift = BASE;

// one snowball shared by every bar it's on: each payout on any of them
// adds `step` to all of them, till none has it any more
let pileRun = 0;
let pileCount = 0;
let pileUntil = 0;
const pileMultiplier = () =>
  Math.min(meta.values.cap, 1 + meta.values.step * pileCount);
const piled = defineBarEffect<{ until: number; run: number }>({
  payout: (v) => (v.run === pileRun ? pileMultiplier() : 1),
  onPayout: (v) => {
    if (v.run === pileRun) pileCount++;
    return v;
  },
  ended: (v, now) => v.run !== pileRun || now >= v.until,
});

function planSnowballEffect(
  r: Running,
  bars: Point[],
  hit: (bar: number, at: number, step?: number) => void,
): Plan {
  const order = ownLast(bars);
  const n = order.length;
  const half = r.play.barHalfWidth;
  const readX = half * READOUT;
  const startX = -half + INSET;
  const top = (bar: number) => bars[bar].y - BAR_HALF_H;
  const rolls: number[] = [];
  const swoops: number[] = [];
  let natural = 0;
  for (let k = 0; k < n; k++) {
    rolls.push(lerp(ROLL_MS[0], ROLL_MS[1], n > 1 ? k / (n - 1) : 1));
    swoops.push(
      k > 0 ? lerp(SWOOP_MS[0], SWOOP_MS[1], n > 2 ? (k - 1) / (n - 2) : 1) : 0,
    );
    natural += rolls[k] + swoops[k];
  }
  const squeeze = Math.min(1, MAX_MS / natural);
  const passes: RollPass[] = [];
  const specks: Point[] = [];
  const lands: number[] = [];
  const chunks: { bar: number; at: number }[] = [];
  const first = order[0];
  let at: Point = { x: bars[first].x + startX, y: top(first) };
  let t = 0;
  passes.push({
    from: { x: at.x, y: at.y - DROP_IN },
    to: at,
    startMs: t,
    endMs: (t += DROP_IN_MS),
  });
  lands.push(t);
  for (let k = 0; k < n; k++) {
    const bar = order[k];
    const from = { x: bars[bar].x + startX, y: top(bar) };
    if (k > 0) {
      passes.push({
        from: at,
        to: from,
        startMs: t,
        endMs: (t += swoops[k] * squeeze),
      });
      lands.push(t);
    }
    const to = { x: bars[bar].x + readX, y: from.y };
    passes.push({ from, to, startMs: t, endMs: (t += rolls[k] * squeeze) });
    for (let j = 0; j < SPECKS; j++) {
      const s = j + k * SPECKS;
      specks.push({
        x: lerp(from.x, to.x, (j + holeHash(s, 2312)) / SPECKS),
        y: from.y - 4 - holeHash(s, 2313) * SPREAD,
      });
    }
    at = to;
    if (bar !== 0) chunks.push({ bar, at: t });
  }
  const burst = { x: bars[0].x + readX, y: bars[0].y + CONTACT_Y };
  const slamFrom = t;
  passes.push({ from: at, to: burst, startMs: t, endMs: (t += SLAM_MS) });
  const ball = planSnowball(passes, specks, REACH);
  const m = chunks.length;
  const chunkAt = new Float32Array(m);
  const chunkX = new Float32Array(m);
  const chunkY = new Float32Array(m);
  const chunkTX = new Float32Array(m);
  const chunkTY = new Float32Array(m);
  for (let c = 0; c < m; c++) {
    const { bar, at: leave } = chunks[c];
    chunkAt[c] = leave;
    chunkX[c] = bars[bar].x + readX;
    chunkY[c] = top(bar) - snowballRadius(ball, leave, BASE, GROW);
    chunkTX[c] = bars[bar].x + readX;
    chunkTY[c] = bars[bar].y + CONTACT_Y;
    hit(bar, leave + CHUNK_MS, 1);
  }
  hit(0, t, 2);
  const fling = new Float32Array(specks.length);
  for (let i = 0; i < specks.length; i++)
    fling[i] = lerp(FLING[0], FLING[1], holeHash(i, 2314));
  const point: Point = { x: 0, y: 0 };
  return {
    ball,
    planned: { x: bars[0].x, y: bars[0].y },
    landAt: Float32Array.from(lands),
    chunkAt,
    chunkX,
    chunkY,
    chunkTX,
    chunkTY,
    fling,
    slamFrom,
    burstMs: t,
    burst,
    path: (ms) => {
      rollAt(ball, ms, point);
      point.y -= lift;
      return point;
    },
  };
}

registerFloorCrit("snowballEffectCrit", {
  reward(t) {
    t.flipRate();
    if (t.now >= pileUntil) {
      pileRun++;
      pileCount = 0;
    }
    const until = t.now + meta.values.ms;
    pileUntil = Math.max(pileUntil, until);
    const v = piled.get(t.floor);
    if (v && v.run === pileRun) v.until = Math.max(v.until, until);
    else piled.set(t.floor, { until, run: pileRun });
    t.punch("Piling up!");
  },
  plan(r, bars, hit) {
    plans.set(r, planSnowballEffect(r, bars, hit));
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      TEXT.alpha = 1 - ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, TEXT);
    }
    const lands = plan.landAt.length;
    while (r.kicked < lands && ms >= plan.landAt[r.kicked]) {
      const k = r.kicked;
      const u = lands > 1 ? k / (lands - 1) : 1;
      r.shake(lerp(LAND_SHAKE[0], LAND_SHAKE[1], u));
      playSpinTick(1 + 0.6 * u);
      r.kicked++;
    }

    const { ball, burstMs } = plan;
    const share = clamp01(stuckAt(ball, ms) / ball.specks.length);
    let radius = snowballRadius(ball, Math.min(ms, burstMs), BASE, GROW);
    for (let c = 0; c < plan.chunkAt.length; c++) {
      const d = ms - plan.chunkAt[c];
      if (d >= 0 && d < DIP_MS) radius *= 1 - CHUNK_DIP * (1 - d / DIP_MS);
    }
    const wobble = WOBBLE * share * Math.sin(ms * WOBBLE_W);
    radius *= 1 + wobble;
    lift = radius * (1 - clamp01((ms - plan.slamFrom) / SLAM_MS));

    ctx.save();
    ctx.translate(bars[0].x - plan.planned.x, bars[0].y - plan.planned.y);
    const moving = ms < burstMs;
    if (moving) {
      const at = plan.path(ms);
      head.x = at.x;
      head.y = at.y;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = GLOW_ALPHA;
      drawGlow(ctx, GOLD, head.x, head.y, radius * GLOW, 1 - wobble);
      ctx.restore();
    }
    drawSnowball(ctx, ball, ms, head, radius, SPECK, moving ? 1 : 0);
    drawWispBetween(
      ctx,
      plan.path,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], share),
      0.6,
      0,
      burstMs,
    );

    // the chunks bursting off into the readouts, each landing in a flash
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let c = 0; c < plan.chunkAt.length; c++) {
      const d = ms - plan.chunkAt[c];
      if (d < 0 || d >= CHUNK_MS + FLASH_MS) continue;
      const tx = plan.chunkTX[c];
      const ty = plan.chunkTY[c];
      if (d < CHUNK_MS) {
        const e = (d / CHUNK_MS) ** 2;
        const spread = BASE * (1 - e);
        for (let j = 0; j < CHUNK; j++)
          stampGlimmer(
            ctx,
            lerp(plan.chunkX[c], tx, e) + CJX[j] * spread,
            lerp(plan.chunkY[c], ty, e) + CJY[j] * spread,
            SPECK * 1.3,
            j + c * CHUNK,
            j % 3 ? COLOR.heavenlyGold : COLOR.white,
          );
      } else {
        const f = 1 - (d - CHUNK_MS) / FLASH_MS;
        ctx.globalAlpha = f;
        drawGlow(ctx, GOLD, tx, ty, FLASH * (1.6 - 0.4 * f));
        drawGlow(ctx, WHITE, tx, ty, FLASH * 0.6 * f);
      }
    }
    // the giant ball's crust flung off all round its own readout
    const d = ms - burstMs;
    if (d >= 0 && d < FLING_MS) {
      const u = d / FLING_MS;
      const e = 1 - (1 - u) ** 3;
      ctx.globalAlpha = 1 - u;
      const { burst, fling } = plan;
      for (let i = 0; i < ball.specks.length; i++) {
        if (ball.picks[i] > burstMs) continue;
        const a = ball.angles[i];
        stampGlimmer(
          ctx,
          burst.x + Math.cos(a) * fling[i] * e,
          burst.y + Math.sin(a) * fling[i] * e * 0.7,
          SPECK * (1.4 - 0.5 * u),
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, plan.burst, d, BURST_BLAST, now);
    ctx.restore();
  },
  tailMs: Math.max(DETONATION_MS, FLING_MS),
  shake: (step) => SHAKES[step],
});
