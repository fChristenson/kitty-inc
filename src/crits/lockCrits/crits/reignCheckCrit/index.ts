// Reign Check, a lock crit: the number arcs onto the dark locked floor and
// bursts; glitter rains down over the floor in squalls, each drop falling
// into its place in a giant crown from the bottom up, each squall heavier
// and quicker than the last and ending in a click and a jolt; the finished
// crown blazes, then slams down into the lock in the biggest blast, the
// floor bursts open, and its new bar is crowned with levels
import meta from "./meta";
import {
  drawDots,
  shapeFill,
  SHAPES,
} from "../../../../shared/animationStyles/drawing";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import { FLOOR_X_MAX, FLOOR_X_MIN } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const ARC_MS = 170;
const ARC_RISE = 120;
const ARRIVE_BLAST = 120;
// the crown: about DOTS dots, CROWN px from its middle to its edge, LIFT up
const DOTS = 240;
const CROWN = 300;
const LIFT = 30;
const DOT = 18;
// the squalls: SQUALLS of them from ARC_MS + RAIN_GAP_MS, each SQUALL_MS
// long and GAP_MS after the last (both shrinking), every drop falling FALL
// px over FALL_MS
const RAIN_GAP_MS = 100;
const SQUALLS = 7;
const SQUALL_MS: [number, number] = [330, 120];
const GAP_MS: [number, number] = [120, 30];
const FALL = 260;
const FALL_MS = 150;
const STREAK = 0.3;
// the crown blazing, then slammed down into the lock
const BLAZE_MS = 260;
const SLAM_MS = 150;
const OPEN_BLAST = 380;
const REWARD_GAP_MS = 320;
const REWARD_BLAST = 220;
// shakes by step: a squall, the slam, the crowning
const SHAKES = [0.6, 3.2, 1.4];

interface State {
  // from the lock's middle, bottom up, and when each lands
  dots: Point[];
  landAt: Float32Array;
  landed: number;
  doneMs: number;
  slamAt: number;
  openAt: number;
  rewardAt: number;
  bar: Point;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };

registerFloorCrit("reignCheckCrit", {
  reward(t) {
    t.levelUp(t.count * meta.values.levels);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const mid = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x;
    const dots = shapeFill(SHAPES.crown, DOTS, { x: mid, y: -LIFT }, CROWN);
    dots.sort((a, b) => b.y - a.y);
    const landAt = new Float32Array(dots.length);
    const per = Math.ceil(dots.length / SQUALLS);
    let t = ARC_MS + RAIN_GAP_MS;
    for (let k = 0; k < SQUALLS; k++) {
      const u = k / (SQUALLS - 1);
      const ms = lerp(SQUALL_MS[0], SQUALL_MS[1], u);
      const first = k * per;
      const last = Math.min(dots.length, first + per);
      for (let i = first; i < last; i++)
        landAt[i] =
          t + ((i - first) / Math.max(1, last - first - 1)) * ms + FALL_MS;
      hit(0, t + ms + FALL_MS, 0);
      t += ms + lerp(GAP_MS[0], GAP_MS[1], u);
    }
    const doneMs = landAt[dots.length - 1];
    const slamAt = doneMs + BLAZE_MS;
    const openAt = slamAt + SLAM_MS;
    const rewardAt = openAt + REWARD_GAP_MS;
    hit(0, ARC_MS, 0);
    hit(0, openAt, 1);
    hit(0, rewardAt, 2);
    const box = getIncomeBarBox(false);
    states.set(r, {
      dots,
      landAt,
      landed: 0,
      doneMs,
      slamAt,
      openAt,
      rewardAt,
      bar: {
        x: box.x + box.width / 2 - lock.x,
        y: box.y + box.height / 2 - lock.y,
      },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.5 * p),
      );
    }
    const { dots, landAt } = state;
    while (state.landed < dots.length && ms >= landAt[state.landed])
      state.landed++;
    ctx.save();
    ctx.translate(lock.x, lock.y);
    drawDetonation(ctx, ORIGIN, ms - ARC_MS, ARRIVE_BLAST, now);
    if (ms < state.openAt) {
      // the drops still falling
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = state.landed; i < dots.length; i++) {
        const until = landAt[i] - ms;
        if (until > FALL_MS) break;
        const u = 1 - until / FALL_MS;
        const y = dots[i].y - FALL * (1 - u * u);
        stampGlimmer(
          ctx,
          dots[i].x,
          y - FALL * STREAK * u,
          DOT * 0.5,
          i,
          COLOR.heavenlyGold,
        );
        stampGlimmer(ctx, dots[i].x, y, DOT, i, COLOR.white);
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      // the crown, blazing once it's done, then slammed into the lock
      const slam = clamp01((ms - state.slamAt) / SLAM_MS) ** 2;
      ctx.save();
      ctx.scale(1 - 0.95 * slam, 1 - 0.95 * slam);
      drawDots(
        ctx,
        dots,
        state.landed,
        DOT,
        ms,
        clamp01((ms - state.doneMs) / BLAZE_MS),
      );
      ctx.restore();
    }
    drawDetonation(ctx, ORIGIN, ms - state.openAt, OPEN_BLAST, now);
    drawDetonation(ctx, state.bar, ms - state.rewardAt, REWARD_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
