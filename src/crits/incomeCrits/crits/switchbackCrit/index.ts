// Switchback, an income crit: the green amount drops low and shrinks into a
// wisp ball that climbs to the total up a zigzag of glitter, lane after
// lane, each one shorter, steeper and quicker, every speck it touches
// sticking on and turning with it, a jolt and a blast at every hairpin; it
// launches off the last lane into the readout and bursts there, its crust
// flung off all round in a rattle of blasts, a share each, the last huge
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
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
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
import { drawFinale } from "../shared";

// the amount dropping to the zigzag's foot, shrinking into the ball
const DROP_MS = 200;
const DROP_SHRINK = 0.3;
// the zigzag: PASSES lanes from CLIMB below the total up to TOP below it,
// each from one side to the other, narrowing from WIDE to NARROW of the
// screen's half width, PASS_MS each (quicker each)
const PASSES = 6;
const CLIMB = 1150;
const TOP = 230;
const WIDE = 0.82;
const NARROW = 0.3;
const PASS_MS: [number, number] = [430, 170];
// the glitter along the lanes, SPREAD off them; the ball picks up what's
// within REACH of its line
const SPECKS = 96;
const SPREAD = 36;
const REACH = 38;
const SPECK = 22;
// the ball: BASE round, growing GROW a sqrt of a speck
const BASE = 36;
const GROW = 9;
const GLOW = 2.2;
const GLOW_ALPHA = 0.5;
const WISP: [number, number] = [1.1, 2.8];
const CORNER_BLAST: [number, number] = [60, 120];
const CORNER_SHAKE: [number, number] = [0.4, 1.2];
const CLICK_EVERY = 8;
const CLICK_SHAKE = 0.22;
// launching into the readout, then the crust flung off over FLING_MS out to
// FLING px, the rattle round a ring RING_X by RING_Y
const UP_MS = 150;
const FLING_MS = 380;
const FLING = 520;
const POPS = 12;
const FIRST_POP_MS = 50;
const POP_GAP_MS = 40;
const RING_X = 380;
const RING_Y = 120;
const POP_BLAST = 110;
const IN_BLAST = 230;
// shakes by step: a pop, the ball in, the last blast
const SHAKES = [0.5, 1.6, 2.6];

interface Plan {
  ball: Snowball;
  passEnds: number[];
  climbMs: number;
  inMs: number;
  endMs: number;
  pops: Point[];
  angles: Float32Array;
  clicks: number;
  corners: number;
  path: (ms: number) => Point | null;
}
const plans = new WeakMap<Running, Plan>();
const GOLD = glowStops(COLOR.heavenlyGold);
const head: Point = { x: 0, y: 0 };
const corner: Point = { x: 0, y: 0 };
// the total this frame: the path reads it
let total: Point = { x: 0, y: 0 };

function planClimb(r: Running, to: Point): Plan {
  const half = r.viewportWidth / 2;
  const passes: RollPass[] = [];
  let t = DROP_MS;
  const laneY = (k: number) => to.y + lerp(CLIMB, TOP, k / PASSES);
  const laneX = (k: number) =>
    (k % 2 ? 1 : -1) * half * lerp(WIDE, NARROW, k / PASSES);
  for (let k = 0; k < PASSES; k++) {
    const ms = lerp(PASS_MS[0], PASS_MS[1], k / (PASSES - 1));
    passes.push({
      from: { x: laneX(k), y: laneY(k) },
      to: { x: laneX(k + 1), y: laneY(k + 1) },
      startMs: t,
      endMs: t + ms,
    });
    t += ms;
  }
  const specks = Array.from({ length: SPECKS }, (_, i) => {
    const p = passes[i % PASSES];
    const u = lerp(0.06, 0.94, holeHash(i, 2310));
    return {
      x: lerp(p.from.x, p.to.x, u),
      y: lerp(p.from.y, p.to.y, u) + (holeHash(i, 2311) * 2 - 1) * SPREAD,
    };
  });
  const ball = planSnowball(passes, specks, REACH);
  const top = passes[PASSES - 1].to;
  const climbMs = t;
  const inMs = t + UP_MS;
  const roll: Point = { x: 0, y: 0 };
  return {
    ball,
    passEnds: passes.map((p) => p.endMs),
    climbMs,
    inMs,
    endMs: inMs + FIRST_POP_MS + (POPS - 1) * POP_GAP_MS + 60,
    pops: Array.from({ length: POPS }, (_, k) => {
      const a = (k / POPS) * Math.PI * 2 + holeHash(k, 2312);
      return {
        x: to.x + Math.cos(a) * RING_X,
        y: to.y + Math.sin(a) * RING_Y,
      };
    }),
    angles: Float32Array.from(
      specks,
      (_, i) => holeHash(i, 2313) * Math.PI * 2,
    ),
    clicks: 0,
    corners: 0,
    path: (ms) => {
      if (ms < DROP_MS || ms > inMs) return null;
      if (ms < climbMs) return rollAt(ball, ms, roll);
      const u = (ms - climbMs) / UP_MS;
      roll.x = lerp(top.x, total.x, u);
      roll.y = lerp(top.y, total.y, u * (2 - u));
      return roll;
    },
  };
}

registerFloorCrit("switchbackCrit", {
  plan(r, bars, hit) {
    const plan = planClimb(r, bars[0]);
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
    const foot = plan.ball.passes[0].from;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, foot.x, p),
        lerp(0, foot.y, p),
        r.flashFont * lerp(1, DROP_SHRINK, p),
      );
    }
    // a jolt every few specks stuck and at every hairpin, harder up the hill
    const stuck = stuckAt(plan.ball, ms);
    while (plan.clicks < Math.floor(stuck / CLICK_EVERY)) {
      plan.clicks++;
      r.shake(CLICK_SHAKE);
    }
    while (plan.corners < PASSES - 1 && ms >= plan.passEnds[plan.corners]) {
      r.shake(
        lerp(CORNER_SHAKE[0], CORNER_SHAKE[1], plan.corners / (PASSES - 2)),
      );
      plan.corners++;
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
    if (ms < plan.inMs) drawSnowball(ctx, plan.ball, ms, head, radius, SPECK);
    else if (ms < plan.inMs + FLING_MS) {
      // the crust flung off the burst all round
      const u = (ms - plan.inMs) / FLING_MS;
      const out = FLING * (1 - (1 - u) ** 2);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 1 - u;
      beginLightBatch(ctx);
      for (let i = 0; i < SPECKS; i++) {
        if (plan.ball.picks[i] > plan.inMs) continue;
        const a = plan.angles[i];
        stampGlimmer(
          ctx,
          to.x + Math.cos(a) * out,
          to.y + Math.sin(a) * out * 0.5,
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
      plan.path,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], clamp01(stuck / SPECKS)),
      0.6,
      DROP_MS,
      plan.inMs,
    );
    for (let k = 0; k < PASSES - 1; k++) {
      const p = plan.ball.passes[k];
      corner.x = p.to.x;
      corner.y = p.to.y;
      drawDetonation(
        ctx,
        corner,
        ms - p.endMs,
        lerp(CORNER_BLAST[0], CORNER_BLAST[1], k / (PASSES - 2)),
        now,
      );
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
