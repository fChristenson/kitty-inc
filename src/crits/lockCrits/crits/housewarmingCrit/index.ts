// Housewarming, a lock crit: the number drops into the dark locked floor as a
// wisp ball that rolls across it from rest, its dust sticking on and turning
// with it; it rolls back lower down, bigger and quicker, a jolt at each wall,
// and in the middle it bursts the floor open: its new bar's first payouts
// pay double
import { CONFIG } from "../../../../config";
import { bankDoublePayout } from "../../../rateCrits/barEffects";
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
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
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
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
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the number dropping onto the first lane's start, shrinking into the ball
const DROP_MS = 200;
const DROP_SHRINK = 0.3;
// the lanes, LANES of the floor's height from its middle, WALL_IN from its
// sides; each roll quicker, TURN_MS dropping to the next lane, the last
// ending in the middle
const LANES = [-0.13, 0, 0.13];
const WALL_IN = 90;
const ROLL_MS: [number, number] = [520, 320];
const TURN_MS = 120;
// the dust: DUST specks over the floor, picked up within REACH
const DUST = 60;
const SPREAD_H = 0.36;
const REACH = 60;
const SPECK = 22;
const BASE = 34;
const GROW = 9;
const GLOW = 2.2;
const GLOW_ALPHA = 0.5;
const CLICK_EVERY = 8;
const CLICK_SHAKE = 0.25;
const WALL_SHAKE: [number, number] = [0.5, 1.1];
// the burst, then the doubled payouts
const OPEN_BLAST = 240;
const PAY_GAP_MS = 400;
const TAIL_MS = 900;
// shakes by step: a jolt, the opening, the payouts
const SHAKES = [0.6, 2.6, 1];

interface State {
  ball: Snowball;
  // the floor's middle from the lock's
  offset: Point;
  walls: number[];
  wall: number;
  clicks: number;
  openAt: number;
}
const states = new WeakMap<Running, State>();
const GOLD = glowStops(COLOR.heavenlyGold);
const at: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };

registerFloorCrit("housewarmingCrit", {
  // double payouts banked on the floor it opened
  reward(t) {
    const payouts = CONFIG.crit.housewarmingPayouts;
    bankDoublePayout(t.floor, payouts);
    t.flipRate();
    t.punch(`2x Pay x${payouts}`);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const right = (FLOOR_X_MAX - FLOOR_X_MIN) / 2 - WALL_IN;
    const passes: RollPass[] = [];
    let t = DROP_MS;
    LANES.forEach((lane, k) => {
      const y = lane * FLOOR_H;
      const dir = k % 2 ? -1 : 1;
      const last = k === LANES.length - 1;
      const from = { x: -dir * right, y };
      if (k > 0) {
        passes.push({
          from: passes[passes.length - 1].to,
          to: from,
          startMs: t,
          endMs: t + TURN_MS,
        });
        t += TURN_MS;
      }
      const ms = lerp(ROLL_MS[0], ROLL_MS[1], k / (LANES.length - 1));
      passes.push({
        from,
        to: { x: last ? 0 : dir * right, y },
        startMs: t,
        endMs: t + ms,
      });
      t += ms;
    });
    const dust = Array.from({ length: DUST }, (_, i) => ({
      x: (holeHash(i, 1960) * 2 - 1) * right,
      y: (holeHash(i, 1961) * 2 - 1) * FLOOR_H * SPREAD_H,
    }));
    const walls = passes
      .filter((_, i) => i % 2 === 0)
      .slice(0, -1)
      .map((p) => p.endMs);
    for (const w of walls) hit(0, w, 0);
    hit(0, t, 1);
    hit(0, t + PAY_GAP_MS, 2);
    states.set(r, {
      ball: planSnowball(passes, dust, REACH),
      offset: { x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x, y: 0 },
      walls,
      wall: 0,
      clicks: 0,
      openAt: t,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    at.x = bars[0].x + state.offset.x;
    at.y = bars[0].y + state.offset.y;
    const first = state.ball.passes[0].from;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, at.x + first.x, p),
        lerp(0, at.y + first.y, p),
        r.flashFont * lerp(1, DROP_SHRINK, p),
      );
    }
    const stuck = stuckAt(state.ball, ms);
    while (state.clicks < Math.floor(stuck / CLICK_EVERY)) {
      state.clicks++;
      r.shake(CLICK_SHAKE);
    }
    while (state.wall < state.walls.length && ms >= state.walls[state.wall]) {
      r.shake(
        lerp(...WALL_SHAKE, state.wall / Math.max(1, state.walls.length - 1)),
      );
      state.wall++;
    }
    if (ms < state.openAt) {
      ctx.save();
      ctx.translate(at.x, at.y);
      rollAt(state.ball, ms, head);
      const radius = snowballRadius(state.ball, ms, BASE, GROW);
      const rolling = ms >= DROP_MS ? 1 : 0;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = GLOW_ALPHA * rolling;
      drawGlow(ctx, GOLD, head.x, head.y, radius * GLOW);
      ctx.restore();
      drawSnowball(ctx, state.ball, ms, head, radius, SPECK, rolling);
      if (rolling)
        drawWispHead(
          ctx,
          () => head,
          ms,
          now,
          WISP_SIZE * (1 + radius / 70),
          clamp01(stuck / DUST),
        );
      ctx.restore();
    }
    drawDetonation(ctx, at, ms - state.openAt, OPEN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
