// Sticky Ball, an income crit: the green amount drops under the total as a
// wisp ball and rolls back and forth along a band of glitter, every speck it
// touches sticking on and turning with it, the ball growing and speeding up
// each pass, a jolt at each end; then it rolls up into the readout and
// bursts across it in a rattle of blasts, a share each, the last huge
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
  lerp,
  clamp01,
  drawText,
  glowStops,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, readoutSpot } from "../shared";

// the amount dropping onto the band's first lane, shrinking into the ball
const DROP_MS = 220;
const DROP_SHRINK = 0.3;
// the band's lanes under the total, rolled one after another, quicker each,
// WALL_IN in from the screen's sides
const LANES = [520, 420, 320];
const PASS_MS = [560, 430, 300];
const WALL_IN = 120;
// the glitter on the band, scattered SPREAD up and down each lane; the ball
// picks up what's within REACH of its line
const SPECKS = 96;
const SPREAD = 50;
const REACH = 40;
const SPECK = 22;
// the ball: BASE round, growing GROW a sqrt of a speck; its glow GLOW of it
const BASE = 40;
const GROW = 9;
const GLOW = 2.2;
const GLOW_ALPHA = 0.5;
const WISP: [number, number] = [1.2, 2.8];
const WALL_BLAST = 60;
// every CLICK_EVERY-th speck stuck a little jolt
const CLICK_EVERY = 8;
const CLICK_SHAKE = 0.25;
const WALL_SHAKE: [number, number] = [0.5, 1.1];
// rolling up into the readout, then the rattle across it
const UP_MS = 220;
const POPS = 10;
const FIRST_POP_MS = 40;
const POP_GAP_MS = 45;
const POP_BLAST = 110;
const IN_BLAST = 200;
// shakes by step: a pop, the ball in, the last blast
const SHAKES = [0.5, 1.4, 2.4];

interface Plan {
  ball: Snowball;
  upFrom: Point;
  passEnds: number[];
  inMs: number;
  endMs: number;
  pops: Point[];
  clicks: number;
  walls: number;
  path: (ms: number) => Point | null;
}
const plans = new WeakMap<Running, Plan>();
const GOLD = glowStops(COLOR.heavenlyGold);
const head: Point = { x: 0, y: 0 };
const wall: Point = { x: 0, y: 0 };
// the total this frame: the path reads it
let total: Point = { x: 0, y: 0 };

function planRoll(r: Running, to: Point): Plan {
  const right = r.viewportWidth / 2 - WALL_IN;
  const passes: RollPass[] = [];
  let t = DROP_MS;
  LANES.forEach((below, k) => {
    const y = to.y + below;
    const dir = k % 2 ? -1 : 1;
    passes.push({
      from: { x: -dir * right, y },
      to: { x: dir * right, y },
      startMs: t,
      endMs: t + PASS_MS[k],
    });
    t += PASS_MS[k];
  });
  const specks = Array.from({ length: SPECKS }, (_, i) => ({
    x: lerp(-right + REACH, right - REACH, holeHash(i, 1710)),
    y: to.y + LANES[i % LANES.length] + (holeHash(i, 1711) - 0.5) * SPREAD,
  }));
  const ball = planSnowball(passes, specks, REACH);
  const upFrom = passes[passes.length - 1].to;
  const inMs = t + UP_MS;
  const roll: Point = { x: 0, y: 0 };
  return {
    ball,
    upFrom,
    passEnds: passes.map((p) => p.endMs),
    inMs,
    endMs: inMs + FIRST_POP_MS + (POPS - 1) * POP_GAP_MS + 60,
    pops: Array.from({ length: POPS }, (_, k) => readoutSpot(to, k, 1712)),
    clicks: 0,
    walls: 0,
    path: (ms) => {
      if (ms < DROP_MS || ms > inMs) return null;
      if (ms < t) return rollAt(ball, ms, roll);
      const u = (ms - t) / UP_MS;
      roll.x = lerp(upFrom.x, total.x, u);
      roll.y = lerp(upFrom.y, total.y, u * u);
      return roll;
    },
  };
}

registerFloorCrit("stickyBallCrit", {
  plan(r, bars, hit) {
    const plan = planRoll(r, bars[0]);
    plans.set(r, plan);
    hit(0, plan.inMs, 1);
    for (let k = 0; k < POPS; k++)
      hit(0, plan.inMs + FIRST_POP_MS + k * POP_GAP_MS);
    hit(0, plan.endMs, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    total = to;
    const first = plan.ball.passes[0].from;

    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, first.x, p),
        lerp(0, first.y, p),
        r.flashFont * lerp(1, DROP_SHRINK, p),
      );
    }

    // a jolt every few specks stuck and at each end of a lane
    const stuck = stuckAt(plan.ball, ms);
    while (plan.clicks < Math.floor(stuck / CLICK_EVERY)) {
      plan.clicks++;
      r.shake(CLICK_SHAKE);
    }
    while (
      plan.walls < plan.passEnds.length &&
      ms >= plan.passEnds[plan.walls]
    ) {
      r.shake(lerp(...WALL_SHAKE, plan.walls / (plan.passEnds.length - 1)));
      plan.walls++;
    }

    const radius = snowballRadius(plan.ball, ms, BASE, GROW);
    const ball = plan.path(ms);
    if (ball) {
      head.x = ball.x;
      head.y = ball.y;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = GLOW_ALPHA;
      drawGlow(ctx, GOLD, head.x, head.y, radius * GLOW);
      ctx.restore();
    }
    if (ms < plan.inMs + DETONATION_MS)
      drawSnowball(
        ctx,
        plan.ball,
        ms,
        head,
        radius,
        SPECK,
        ms < plan.inMs ? 1 : 0,
      );
    drawWispBetween(
      ctx,
      plan.path,
      ms,
      now,
      WISP_SIZE * lerp(...WISP, clamp01(stuck / SPECKS)),
      0.6,
      DROP_MS,
      plan.inMs,
    );
    for (let k = 0; k < plan.passEnds.length; k++) {
      const p = plan.ball.passes[k];
      wall.x = p.to.x;
      wall.y = p.to.y;
      drawDetonation(ctx, wall, ms - p.endMs, WALL_BLAST, now);
    }
    drawDetonation(ctx, to, ms - plan.inMs, IN_BLAST, now);
    for (let k = 0; k < POPS; k++)
      drawDetonation(
        ctx,
        plan.pops[k],
        ms - plan.inMs - FIRST_POP_MS - k * POP_GAP_MS,
        POP_BLAST,
        now,
      );
    drawFinale(ctx, to, ms - plan.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
