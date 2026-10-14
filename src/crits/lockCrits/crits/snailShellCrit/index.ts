// Snail Shell, a lock crit: the number drops into the dark locked floor's
// corner as a wisp ball and rolls round the floor in a squared-off spiral,
// each side from rest and quicker than the last, tighter and tighter, every
// speck of dust it touches sticking on and turning with it, a jolt and a
// blast at every corner; it rolls into the lock at the middle and bursts
// the floor open, its crust flung off all round, and the new floor pays out
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
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the number dropping into the spiral's corner
const DROP_MS = 200;
// the spiral: WIDE of the floor's half width and TALL of its half height,
// stepping STEP px in a side; SIDES sides, SIDE_MS each (quicker each),
// then INTO_MS onto the lock
const WIDE = 0.86;
const TALL = 0.62;
const STEP = 85;
const SIDES = 8;
const SIDE_MS: [number, number] = [330, 120];
const INTO_MS = 140;
// the dust over the floor; the ball picks up what's within REACH of its line
const DUST = 100;
const REACH = 42;
const SPECK = 20;
const BASE = 30;
const GROW = 8;
const WISP: [number, number] = [1, 2.4];
const CORNER_BLAST: [number, number] = [50, 110];
const CORNER_SHAKE: [number, number] = [0.35, 1];
const CLICK_EVERY = 10;
const CLICK_SHAKE = 0.2;
// the burst: the crust flung FLING px out over FLING_MS
const FLING_MS = 360;
const FLING = 480;
const OPEN_BLAST = 360;
const PAY_GAP_MS = 300;
// shakes by step: -, the floor bursting open, the payout
const SHAKES = [0.4, 3, 1.2];

interface State {
  ball: Snowball;
  ends: number[];
  inMs: number;
  payAt: number;
  angles: Float32Array;
  clicks: number;
  path: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const head: Point = { x: 0, y: 0 };
const corner: Point = { x: 0, y: 0 };
const ORIGIN: Point = { x: 0, y: 0 };

registerFloorCrit("snailShellCrit", {
  reward(t) {
    t.payPayouts(t.count * meta.values.payouts);
    t.punch("Payout!");
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const mid = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x;
    const w = ((FLOOR_X_MAX - FLOOR_X_MIN) / 2) * WIDE;
    const h = (FLOOR_H / 2) * TALL;
    // the squared spiral's corners, from the lock's middle, clockwise in
    const corners: Point[] = [{ x: mid - w, y: -h }];
    let left = mid - w;
    let right = mid + w;
    let top = -h;
    let bottom = h;
    for (let k = 0; k < SIDES; k++) {
      const side = k % 4;
      if (side === 0) corners.push({ x: right, y: top });
      else if (side === 1) corners.push({ x: right, y: bottom });
      else if (side === 2) corners.push({ x: left, y: bottom });
      else {
        top += STEP;
        corners.push({ x: left, y: top });
        left += STEP;
        right -= STEP;
        bottom -= STEP;
      }
    }
    const passes: RollPass[] = [];
    let t = DROP_MS;
    for (let k = 0; k < SIDES; k++) {
      const ms = lerp(SIDE_MS[0], SIDE_MS[1], k / (SIDES - 1));
      passes.push({
        from: corners[k],
        to: corners[k + 1],
        startMs: t,
        endMs: t + ms,
      });
      t += ms;
    }
    passes.push({
      from: corners[SIDES],
      to: ORIGIN,
      startMs: t,
      endMs: t + INTO_MS,
    });
    const inMs = t + INTO_MS;
    const dust = Array.from({ length: DUST }, (_, i) => ({
      x: mid + (holeHash(i, 3210) * 2 - 1) * w,
      y: (holeHash(i, 3211) * 2 - 1) * h,
    }));
    const ball = planSnowball(passes, dust, REACH);
    const roll: Point = { x: 0, y: 0 };
    const state: State = {
      ball,
      ends: passes.slice(0, -1).map((p) => p.endMs),
      inMs,
      payAt: inMs + PAY_GAP_MS,
      angles: Float32Array.from(
        dust,
        (_, i) => holeHash(i, 3212) * Math.PI * 2,
      ),
      clicks: 0,
      path: (ms) => (ms < DROP_MS || ms > inMs ? null : rollAt(ball, ms, roll)),
    };
    states.set(r, state);
    for (const end of state.ends) hit(0, end, 0);
    hit(0, inMs, 1);
    hit(0, state.payAt, 2);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const first = state.ball.passes[0].from;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, lock.x + first.x, p),
        lerp(0, lock.y + first.y, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    const stuck = stuckAt(state.ball, ms);
    while (state.clicks < Math.floor(stuck / CLICK_EVERY)) {
      state.clicks++;
      r.shake(CLICK_SHAKE);
    }
    while (r.kicked < state.ends.length && ms >= state.ends[r.kicked]) {
      r.shake(
        lerp(
          CORNER_SHAKE[0],
          CORNER_SHAKE[1],
          r.kicked / (state.ends.length - 1),
        ),
      );
      r.kicked++;
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    const radius = snowballRadius(state.ball, ms, BASE, GROW);
    const ball = state.path(ms);
    if (ball) {
      head.x = ball.x;
      head.y = ball.y;
    }
    if (ms < state.inMs) drawSnowball(ctx, state.ball, ms, head, radius, SPECK);
    else if (ms < state.inMs + FLING_MS) {
      // the crust flung off all round
      const u = (ms - state.inMs) / FLING_MS;
      const out = FLING * (1 - (1 - u) ** 2);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 1 - u;
      beginLightBatch(ctx);
      for (let i = 0; i < DUST; i++) {
        if (state.ball.picks[i] > state.inMs) continue;
        const a = state.angles[i];
        stampGlimmer(
          ctx,
          Math.cos(a) * out,
          Math.sin(a) * out * 0.6,
          SPECK * 1.3,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }
    drawWispBetween(
      ctx,
      state.path,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], clamp01(stuck / DUST)),
      0.6,
      DROP_MS,
      state.inMs,
    );
    const passes = state.ball.passes;
    for (let k = 0; k < state.ends.length; k++) {
      corner.x = passes[k].to.x;
      corner.y = passes[k].to.y;
      drawDetonation(
        ctx,
        corner,
        ms - state.ends[k],
        lerp(CORNER_BLAST[0], CORNER_BLAST[1], k / (state.ends.length - 1)),
        now,
      );
    }
    drawDetonation(ctx, ORIGIN, ms - state.inMs, OPEN_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
