// Closing In, a lock crit: the number bursts into balls of light that drop
// against both walls of the dark locked floor and hop in towards the lock
// from either side, each hop shorter, lower and quicker, a splash and a
// jolt on every landing, the floor glowing hotter as they close in; they
// all smash into the lock at the same instant and the floor bursts open,
// three of them bouncing back out onto it where new cats are hired
import {
  drawBounceSplash,
  hops,
  type Bounce,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { FLOOR_X_MAX, FLOOR_X_MIN } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { WORKER_FEET_Y } from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";

// where its cats land across the floor it opens, 0..1 of its walk
const HIRE_SPOTS = [0.2, 0.5, 0.8];

const BURST_MS = 120;
// the balls: BALLS of them, half off each wall WALL_IN px in, hopping onto
// the ground at these shares of the way to the lock, the last onto the
// lock itself, LEG_MS a hop (quickening) LIFT px high (lowering), all
// smashing in at once; each a few ms after the last off its wall
const BALLS = 6;
const WALL_IN = 50;
const STEPS = [0.42, 0.68, 0.86, 1];
const LEG_MS: [number, number] = [240, 100];
const LIFT: [number, number] = [260, 70];
const STAGGER_MS = 40;
const BALL = WISP_SIZE * 1.2;
const SPLASH = 130;
const GLOW = 320;
const GLOW_ALPHA = 0.55;
// the hires: three balls bouncing out over HOP_MS, HOP px high, STAGGER apart
const HOP_MS = 200;
const HOP = 220;
const HIRE_STAGGER_MS = 70;
const CAT_MID = 70;
const OPEN_BLAST = 460;
const LAND_BLAST = 140;
// shakes by step: -, the floor bursting open, a cat
const SHAKES = [0.4, 3.2, 1];

interface State {
  paths: BouncePath[];
  landings: Bounce[];
  openAt: number;
  hires: { at: number; to: Point; path: (ms: number) => Point }[];
}
const states = new WeakMap<Running, State>();
const GOLD = glowStops(COLOR.heavenlyGold);
const ORIGIN: Point = { x: 0, y: 0 };

registerFloorCrit("closingInCrit", {
  // a cat hired where each ball lands
  reward: (t) => t.hire(HIRE_SPOTS[t.index % HIRE_SPOTS.length]),
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const ground = WORKER_FEET_Y - lock.y;
    const walls = [
      FLOOR_X_MIN + WALL_IN - lock.x,
      FLOOR_X_MAX - WALL_IN - lock.x,
    ];
    // all smashing in at once, whenever each sets off
    const total = STEPS.reduce(
      (sum, _, k) => sum + lerp(LEG_MS[0], LEG_MS[1], k / (STEPS.length - 1)),
      0,
    );
    const openAt = BURST_MS + (BALLS / 2) * STAGGER_MS + total;
    const paths: BouncePath[] = [];
    for (let b = 0; b < BALLS; b++) {
      const wall = walls[b % 2];
      const start = BURST_MS + Math.floor(b / 2) * STAGGER_MS;
      const scale = (openAt - start) / total;
      const from = { x: wall, y: ground - 200 - 120 * Math.floor(b / 2) };
      const points = [
        from,
        ...STEPS.map((s, k) =>
          k === STEPS.length - 1 ? ORIGIN : { x: wall * (1 - s), y: ground },
        ),
      ];
      paths.push(
        hops(points, [LEG_MS[0] * scale, LEG_MS[1] * scale], LIFT, start),
      );
    }
    const landings = paths
      .flatMap((p) => p.bounces.slice(0, -1))
      .sort((a, b) => a.ms - b.ms);
    hit(0, openAt, 1);
    const hires = HIRE_SPOTS.map((share, k) => {
      const to = {
        x: FLOOR_X_MIN + (FLOOR_X_MAX - FLOOR_X_MIN) * share - lock.x,
        y: ground - CAT_MID,
      };
      const from = openAt + k * HIRE_STAGGER_MS;
      const at = from + HOP_MS;
      hit(0, at, 2);
      const p: Point = { x: 0, y: 0 };
      return {
        at,
        to,
        path: (ms: number): Point => {
          const u = clamp01((ms - from) / HOP_MS);
          p.x = to.x * u;
          p.y = to.y * u - HOP * 4 * u * (1 - u);
          return p;
        },
      };
    });
    states.set(r, { paths, landings, openAt, hires });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { paths, landings, openAt, hires } = state;
    if (ms < BURST_MS) {
      const p = ms / BURST_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p,
        r.flashFont * (1 - 0.6 * p),
      );
      return;
    }
    // a jolt on every landing
    while (r.kicked < landings.length && ms >= landings[r.kicked].ms) {
      r.shake(0.25 + 0.5 * (r.kicked / landings.length));
      r.kicked++;
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    // the floor glowing hotter as they close in
    if (ms < openAt) {
      const c = r.kicked / landings.length;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = c * GLOW_ALPHA;
      drawGlow(ctx, GOLD, 0, 0, GLOW * (0.6 + 0.6 * c), 0.45);
      ctx.restore();
    }
    for (let k = 0; k < landings.length; k++)
      drawBounceSplash(ctx, landings[k], ms - landings[k].ms, SPLASH, now);
    for (let b = 0; b < paths.length; b++)
      drawWispBetween(
        ctx,
        paths[b].at,
        ms,
        now,
        BALL,
        clamp01(ms / openAt),
        paths[b].startMs,
        openAt,
      );
    drawDetonation(ctx, ORIGIN, ms - openAt, OPEN_BLAST, now);
    for (const h of hires) {
      drawWispBetween(ctx, h.path, ms, now, BALL, 1, openAt, h.at);
      drawDetonation(ctx, h.to, ms - h.at, LAND_BLAST, now);
    }
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
