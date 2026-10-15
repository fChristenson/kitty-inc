// Thunderball, a lock crit: the number arcs onto the dark locked floor's lock
// and balls up into a crackling orb of lightning that rockets off to a wall
// and ricochets back and forth across the floor, faster every pass, arcs
// flickering from it to the ceiling and the floor; every pass over the lock
// a bolt cracks down onto it, a jolt and a flash; then it leaps to the
// ceiling and slams down into the lock under a giant bolt, bursting the
// floor open, and a forked bolt leaps on into its new button: each of its
// next taps also pays out a random floor
import meta from "./meta";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import type { Floor } from "../../../../gameState";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/animationStyles/lightning";
import { drawChargeGlow } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01 } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
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
// the passes: wall to wall WIDE of the way to the nearer wall, PASSES_MS each
// (quickening), hopping HOP px up each pass; the ceiling and floor ROOM of a
// floor's height over and under the lock
const WIDE = 0.85;
const PASSES_MS: [number, number] = [300, 110];
const PASSES = 6;
const HOP = 60;
const ROOM = 0.42;
// then up to the ceiling over LEAP_MS and down into the lock over SLAM_MS
const LEAP_MS = 140;
const SLAM_MS = 90;
const BALL = WISP_SIZE * 1.2;
const BALL_GROW = 0.15;
const GLOW = 180;
// arcs flicker on and off every FLICKER_MS; a crackle CRACKLE px round it
const FLICKER_MS = 50;
const CRACKLE = 70;
const STRIKE_MS = 140;
const STRIKE_POP = 110;
const OPEN_BLAST = 440;
const GIANT = 2.2;
// the forked bolt into the button REWARD_GAP_MS after it opens, lasting BOLT_MS
const REWARD_GAP_MS = 200;
const BOLT_MS = 220;
const REWARD_BLAST = 160;
// shakes by step: a strike on the lock, it bursting open, the button
const SHAKES = [0.8, 3.2, 1.2];

interface State {
  // the ball's path from the lock's middle
  ballAt: (ms: number) => Point;
  strikes: number[];
  openAt: number;
  rewardAt: number;
  button: Point;
  up: Bolt;
  down: Bolt;
  crackles: Bolt[];
  strike: Bolt;
  reward: Bolt;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };

// each tap also paying out a random open floor
const strikeTaps = defineTapPerk("Strike", (t) => {
  let pick: Floor | null = null;
  let seen = 0;
  for (const floor of t.floors)
    if (floor.unlocked && Math.random() * ++seen < 1) pick = floor;
  if (pick) t.payout(pick, 1);
});

registerFloorCrit("thunderballCrit", {
  reward(t) {
    strikeTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const wide = Math.min(lock.x - FLOOR_X_MIN, FLOOR_X_MAX - lock.x) * WIDE;
    const ceiling = -FLOOR_H * ROOM;
    const ground = FLOOR_H * ROOM;
    // each pass's start, wall to wall after the first from the lock
    const starts: number[] = [];
    let t = ARC_MS;
    for (let k = 0; k < PASSES; k++) {
      starts.push(t);
      t += lerp(PASSES_MS[0], PASSES_MS[1], k / (PASSES - 1)) * (k ? 1 : 0.5);
    }
    const passesEnd = t;
    const sideOf = (k: number) => (k % 2 ? -1 : 1) * wide;
    // every pass after the first crosses the lock halfway
    const strikes = starts
      .slice(1)
      .map((s, i) => (s + (starts[i + 2] ?? passesEnd)) / 2);
    for (const at of strikes) hit(0, at, 0);
    const openAt = passesEnd + LEAP_MS + SLAM_MS;
    const rewardAt = openAt + REWARD_GAP_MS;
    hit(0, openAt, 1);
    hit(0, rewardAt, 2);
    const ball: Point = { x: 0, y: 0 };
    const last = sideOf(PASSES - 1);
    const ballAt = (ms: number): Point => {
      if (ms < ARC_MS) {
        ball.x = 0;
        ball.y = 0;
      } else if (ms < passesEnd) {
        let k = 0;
        while (k < PASSES - 1 && ms >= starts[k + 1]) k++;
        const end = starts[k + 1] ?? passesEnd;
        const u = clamp01((ms - starts[k]) / (end - starts[k]));
        const from = k === 0 ? 0 : sideOf(k - 1);
        ball.x = lerp(from, sideOf(k), u);
        ball.y = -HOP * Math.sin(Math.PI * u);
      } else if (ms < passesEnd + LEAP_MS) {
        const u = (ms - passesEnd) / LEAP_MS;
        const e = 1 - (1 - u) ** 2;
        ball.x = lerp(last, 0, e);
        ball.y = lerp(0, ceiling, e);
      } else {
        const u = clamp01((ms - passesEnd - LEAP_MS) / SLAM_MS);
        ball.x = 0;
        ball.y = lerp(ceiling, 0, u * u);
      }
      return ball;
    };
    const btn = getButtonCenter(false);
    const button = { x: btn.x - lock.x, y: btn.y - lock.y };
    states.set(r, {
      ballAt,
      strikes,
      openAt,
      rewardAt,
      button,
      up: createBolt({ x: 0, y: 0 }, { x: 0, y: ceiling }, 0),
      down: createBolt({ x: 0, y: 0 }, { x: 0, y: ground }, 0),
      crackles: [0, 1].map(() =>
        createBolt({ x: 0, y: 0 }, { x: CRACKLE, y: 0 }, 0),
      ),
      strike: createBolt({ x: 0, y: ceiling }, { x: 0, y: 0 }, 2),
      reward: createBolt({ x: 0, y: 0 }, button, 2),
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
    const { openAt } = state;
    ctx.save();
    ctx.translate(lock.x, lock.y);
    const rolling = ms >= ARC_MS && ms < openAt;
    // how many strikes it has landed: it swells and brightens with each
    let struck = 0;
    while (struck < state.strikes.length && ms >= state.strikes[struck])
      struck++;
    const c = clamp01(0.3 + struck / state.strikes.length);
    const ball = state.ballAt(ms);
    if (rolling) {
      drawChargeGlow(ctx, ball, c, GLOW, now);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      // arcs to the ceiling and the floor, flickering on and off
      const beat = Math.floor(ms / FLICKER_MS);
      const { up, down } = state;
      up.from = down.from = ball;
      up.to.x = ball.x + (hash01(beat, 5101) - 0.5) * 160;
      down.to.x = ball.x + (hash01(beat, 5102) - 0.5) * 160;
      if (hash01(beat, 5103) < 0.6) drawBolt(ctx, up, 0.8, 0.6);
      if (hash01(beat, 5104) < 0.6) drawBolt(ctx, down, 0.8, 0.6);
      for (let i = 0; i < state.crackles.length; i++) {
        const bolt = state.crackles[i];
        const a = hash01(beat, 5110 + i) * Math.PI * 2;
        bolt.from = ball;
        bolt.to.x = ball.x + Math.cos(a) * CRACKLE * (1 + c);
        bolt.to.y = ball.y + Math.sin(a) * CRACKLE * (1 + c);
        drawBolt(ctx, bolt, 1, 0.5);
      }
      // a bolt cracking down onto the lock at every pass over it
      for (const at of state.strikes) {
        const since = ms - at;
        if (since < 0 || since >= STRIKE_MS) continue;
        drawBolt(ctx, state.strike, 1 - since / STRIKE_MS, 1);
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      drawWisp(ctx, state.ballAt, ms, now, BALL * (1 + BALL_GROW * struck), c);
    }
    for (const at of state.strikes) {
      drawStrike(ctx, ORIGIN, 1 - clamp01((ms - at) / STRIKE_MS), 1.4, now);
      drawDetonation(ctx, ORIGIN, ms - at, STRIKE_POP, now);
    }
    // the giant bolt as it slams in, then the forked one into the button
    const slam = ms - openAt;
    if (slam >= 0 && slam < STRIKE_MS * 2) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      drawBolt(ctx, state.strike, 1 - slam / (STRIKE_MS * 2), GIANT);
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, ORIGIN, slam, OPEN_BLAST, now);
    const zap = ms - state.rewardAt;
    if (zap >= 0 && zap < BOLT_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      drawBolt(ctx, state.reward, 1 - zap / BOLT_MS, 1.2);
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      drawStrike(ctx, state.button, 1 - zap / BOLT_MS, 1.6, now);
    }
    drawDetonation(ctx, state.button, zap, REWARD_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
