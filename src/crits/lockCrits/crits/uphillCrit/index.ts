// Uphill, a lock crit: the number drops as a little ball of light onto the
// bar of the lowest floor below the dark locked one and rolls up the
// building, along each bar from rest and hopping up to the next, quicker
// every pass, the glitter strewn along each bar sticking on, the ball
// swelling and wobbling, a crunch and a jolt at each bar's end; at the top
// it slams into the lock and bursts it open, its crust spraying out over the
// new floor: every worker on the floors it rolled past gets a boost
import meta from "./meta";
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
import { playBloop } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { FLOOR_H } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  getIncomeBarBox,
  punchIncomeBar,
} from "../../../../floors/incomePanel";
import {
  getRenderedWorkerCount,
  wiggleWorkerBoost,
} from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the number dropping onto the lowest bar's left end, shrinking into the ball
const DROP_MS = 180;
const DROP_SHRINK = 0.25;
// at least MIN_ROLLS rolls (a bar rolled again a LANE px lane over when
// there are few), each ROLL_MS (quicker each), HOP_MS up to the next bar
// (or over a lane), then SLAM_MS from the last bar's end into the lock
const MIN_ROLLS = 3;
const ROLL_MS: [number, number] = [380, 170];
const HOP_MS: [number, number] = [120, 70];
const SLAM_MS = 120;
const LANES = [0, -26, 26];
const END_IN = 30;
// the glitter: GLITTER specks a bar, SPREAD px either side of its middle,
// picked up within REACH
const GLITTER = 34;
const SPREAD = 30;
const REACH = 40;
const SPECK = 20;
const BASE = 22;
const GROW = 7;
const GLOW = 2.3;
const GLOW_ALPHA = 0.55;
// it wobbles up to WOBBLE of its radius as it fills, bulging BUMP at each
// bar's end for BUMP_MS
const WOBBLE = 0.12;
const WOBBLE_RATE = 0.045;
const BUMP = 0.35;
const BUMP_MS = 140;
const WISP: [number, number] = [0.8, 2.2];
const CLICK_EVERY = 12;
const CLICK_SHAKE = 0.2;
const CRUNCH_BLAST: [number, number] = [60, 130];
const CRUNCH_SHAKE: [number, number] = [0.4, 1.1];
// the lock bursting, the crust spraying ARC px up and out over the new floor
// in SPRAY_MS (staggered up to STAGGER_MS), landing on its bar
const OPEN_BLAST = 380;
const SPRAY_MS = 260;
const STAGGER_MS = 70;
const ARC: [number, number] = [180, 320];
const SPRAY_DOWN = 0.25;
const FADE_MS = 140;
const BAR_BLAST = 280;
// shakes by step: a crunch, the lock bursting, the spray landing
const SHAKES = [0.4, 3, 1.4];

interface State {
  ball: Snowball;
  // each roll's end, the slam into the lock and the spray landing
  ends: number[];
  openAt: number;
  payAt: number;
  // each speck's spray: where it lands from the lock's middle, its rise
  // and its start after the burst
  sprayX: Float32Array;
  sprayY: Float32Array;
  rise: Float32Array;
  delay: Float32Array;
  barMid: Point;
  clicks: number;
  path: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const GOLD = glowStops(COLOR.heavenlyGold);
const ORIGIN: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const crunch: Point = { x: 0, y: 0 };
// how many floors below the new one the last play rolled past
let rolledFloors = 1;

registerFloorCrit("uphillCrit", {
  // every worker on the floors it rolled past boosted, as if tapped
  reward(t) {
    const at = t.floors.indexOf(t.floor);
    let boosted = 0;
    for (let k = 1; k <= rolledFloors; k++) {
      const below = t.floors[at - k];
      if (!below?.unlocked) continue;
      const count = getRenderedWorkerCount(below);
      for (let i = 0; i < count; i++) wiggleWorkerBoost(below, i, t.now);
      punchIncomeBar(below, count > 0 ? "Boost!" : null, t.color);
      boosted += count;
    }
    if (boosted > 0) playBloop();
    t.punch(`Uphill x${boosted}`);
  },
  plan(r, bars, hit) {
    const lock = getLockCenter();
    const box = getIncomeBarBox(false);
    const barY = box.y + box.height / 2 - lock.y;
    const left = box.x - lock.x + END_IN;
    const right = box.x + box.width - lock.x - END_IN;
    // the bars between the flash and the lock, the one under the lock at least
    const below = Math.max(
      1,
      Math.min(meta.values.floors, Math.round((-bars[0].y - barY) / FLOOR_H)),
    );
    rolledFloors = below;
    const rolls = Math.max(below, MIN_ROLLS);
    const passes: RollPass[] = [];
    const ends: number[] = [];
    let t = DROP_MS;
    let lane = 0;
    let lastBar = -1;
    for (let i = 0; i < rolls; i++) {
      const bar = below - Math.floor((i * below) / rolls);
      lane = bar === lastBar ? lane + 1 : 0;
      lastBar = bar;
      const y = barY + bar * FLOOR_H + LANES[lane % LANES.length];
      const from = { x: i % 2 ? right : left, y };
      const u = i / (rolls - 1);
      if (i > 0) {
        const ms = lerp(HOP_MS[0], HOP_MS[1], u);
        passes.push({
          from: passes[passes.length - 1].to,
          to: from,
          startMs: t,
          endMs: t + ms,
        });
        t += ms;
      }
      const ms = lerp(ROLL_MS[0], ROLL_MS[1], u);
      passes.push({
        from,
        to: { x: i % 2 ? left : right, y },
        startMs: t,
        endMs: t + ms,
      });
      t += ms;
      ends.push(t);
      hit(0, t, 0);
    }
    passes.push({
      from: passes[passes.length - 1].to,
      to: ORIGIN,
      startMs: t,
      endMs: t + SLAM_MS,
    });
    const openAt = t + SLAM_MS;
    const payAt = openAt + SPRAY_MS + STAGGER_MS;
    const count = below * GLITTER;
    const glitter: Point[] = [];
    for (let i = 0; i < count; i++) {
      const bar = 1 + Math.floor(i / GLITTER);
      glitter.push({
        x: lerp(left, right, holeHash(i, 4410)),
        y: barY + bar * FLOOR_H + (holeHash(i, 4411) * 2 - 1) * SPREAD,
      });
    }
    const sprayX = new Float32Array(count);
    const sprayY = new Float32Array(count);
    const rise = new Float32Array(count);
    const delay = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      sprayX[i] = lerp(left, right, holeHash(i, 4412));
      sprayY[i] = barY + (holeHash(i, 4413) * 2 - 1) * FLOOR_H * SPRAY_DOWN;
      rise[i] = lerp(ARC[0], ARC[1], holeHash(i, 4414));
      delay[i] = holeHash(i, 4415) * STAGGER_MS;
    }
    const ball = planSnowball(passes, glitter, REACH);
    const roll: Point = { x: 0, y: 0 };
    states.set(r, {
      ball,
      ends,
      openAt,
      payAt,
      sprayX,
      sprayY,
      rise,
      delay,
      barMid: { x: (left + right) / 2, y: barY },
      clicks: 0,
      path: (ms) =>
        ms < DROP_MS || ms > openAt ? null : rollAt(ball, ms, roll),
    });
    hit(0, openAt, 1);
    hit(0, payAt, 2);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { ball, ends, openAt } = state;
    if (ms < DROP_MS) {
      const first = ball.passes[0].from;
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, lock.x + first.x, p),
        lerp(0, lock.y + first.y, p),
        r.flashFont * lerp(1, DROP_SHRINK, p),
      );
    }
    const stuck = stuckAt(ball, ms);
    const fill = clamp01(stuck / Math.max(1, ball.specks.length));
    while (state.clicks < Math.floor(stuck / CLICK_EVERY)) {
      state.clicks++;
      r.shake(CLICK_SHAKE);
    }
    while (r.kicked < ends.length && ms >= ends[r.kicked]) {
      r.shake(lerp(...CRUNCH_SHAKE, r.kicked / Math.max(1, ends.length - 1)));
      r.kicked++;
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    if (ms >= DROP_MS && ms < openAt) {
      rollAt(ball, ms, head);
      let bump = 0;
      for (let k = 0; k < ends.length; k++) {
        const since = ms - ends[k];
        if (since >= 0 && since < BUMP_MS)
          bump = Math.max(bump, 1 - since / BUMP_MS);
      }
      const radius =
        snowballRadius(ball, ms, BASE, GROW) *
        (1 + WOBBLE * fill * Math.sin(ms * WOBBLE_RATE) + BUMP * bump);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = GLOW_ALPHA;
      drawGlow(ctx, GOLD, head.x, head.y, radius * GLOW);
      ctx.restore();
      drawSnowball(ctx, ball, ms, head, radius, SPECK);
    } else if (ms < DROP_MS) {
      drawSnowball(ctx, ball, ms, ball.passes[0].from, BASE, SPECK, 0);
    }
    drawWispBetween(
      ctx,
      state.path,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], fill),
      fill,
      DROP_MS,
      openAt,
    );
    for (let k = 0; k < ends.length; k++) {
      const to = ball.passes[k * 2].to;
      crunch.x = to.x;
      crunch.y = to.y;
      drawDetonation(
        ctx,
        crunch,
        ms - ends[k],
        lerp(...CRUNCH_BLAST, k / Math.max(1, ends.length - 1)),
        now,
      );
    }
    drawDetonation(ctx, ORIGIN, ms - openAt, OPEN_BLAST, now);
    // the crust spraying up and out over the new floor, flaring as it lands
    const since = ms - openAt;
    if (since >= 0 && since < SPRAY_MS + STAGGER_MS + FADE_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < ball.specks.length; i++) {
        const u = (since - state.delay[i]) / SPRAY_MS;
        if (u < 0) continue;
        const fade = u > 1 ? 1 - ((u - 1) * SPRAY_MS) / FADE_MS : 1;
        if (fade <= 0) continue;
        const p = Math.min(1, u);
        const ease = 1 - (1 - p) * (1 - p);
        ctx.globalAlpha = fade;
        stampGlimmer(
          ctx,
          state.sprayX[i] * ease,
          state.sprayY[i] * p - state.rise[i] * 4 * p * (1 - p),
          SPECK * (u > 1 ? 1.3 + 0.8 * (1 - fade) : 1.3),
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, state.barMid, ms - state.payAt, BAR_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
