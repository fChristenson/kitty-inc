// Move In, a lock crit: the number bursts into wisps that drop onto a bar
// below the locked floor and bounce up the building bar by bar, quicker each
// hop, slamming into the dark locked floor one by one, which glows hotter;
// it bursts open and each wisp drops in where a new cat is hired
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { drawGlow } from "../../../../shared/glowSprite";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarCenter } from "../../../../floors/incomePanel";
import { WORKER_FEET_Y } from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
  glowStops,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { MOVE_IN_SPOTS } from "../..";

const POP_MS = 100;
const POP_BLAST = 120;
// each wisp a beat after the last, its hops quickening, at most this many
// bars below the floor on the way up
const WISP_GAP_MS = 90;
const MAX_BARS = 3;
const FIRST_LEG_MS = 220;
const LEG_MS: [number, number] = [190, 130];
const LAST_LEG_MS = 140;
const LIFT = 140;
const DROP_LIFT = 60;
const JITTER_X = 200;
const BOUNCE_BLAST = 60;
// where it slams into the floor, under its middle
const ENTRY_Y = -FLOOR_H * 0.1;
const IMPACT_BLAST = 100;
const GLOW = FLOOR_H * 0.9;
const GLOW_PER_HIT = 40;
const GLOW_ALPHA = 0.6;
// the floor bursting open, then each wisp dropping in onto its new cat
const OPEN_GAP_MS = 160;
const OPEN_BLAST = 270;
const DROP_DELAY_MS = 80;
const DROP_GAP_MS = 70;
const DROP_MS = 200;
// a cat's middle above its feet
const CAT_MID = 70;
const LAND_BLAST = 120;
const TAIL_MS = 900;

interface Mover {
  start: number;
  // when it lands on each of its spots, the last its slam into the floor
  times: number[];
  // its spots from the lock's middle (the first is the flash's middle)
  route: Point[];
  climb: (ms: number) => Point | null;
  hover: () => Point;
  drops: number;
  lands: number;
  drop: (ms: number) => Point | null;
  // where its cat stands, from the lock's middle
  cat: Point;
}

interface State {
  bars: Point[];
  movers: Mover[];
  open: number;
}

const states = new WeakMap<Running, State>();
const GOLD = glowStops(COLOR.heavenlyGold);
const ORIGIN: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// a bounce from a onto b, bowed up lift over the higher of the two
function bounce(a: Point, b: Point, lift: number, u: number, into: Point) {
  const peak = Math.min(a.y, b.y) - lift;
  into.x = lerp(a.x, b.x, u);
  into.y = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * peak + u * u * b.y;
  return into;
}

registerFloorCrit("moveInCrit", {
  plan(r, bars, hit) {
    const state: State = { bars, movers: [], open: 0 };
    const lock = getLockCenter();
    const barY = getIncomeBarCenter(false).y - lock.y;
    const catY = WORKER_FEET_Y - lock.y - CAT_MID;
    // the bars between the flash and the floor, the one under it at least
    const below = Math.max(
      1,
      Math.min(MAX_BARS, Math.floor(-(bars[0].y + barY) / FLOOR_H)),
    );
    let lastImpact = 0;
    MOVE_IN_SPOTS.forEach((share, k) => {
      const x = FLOOR_X_MIN + (FLOOR_X_MAX - FLOOR_X_MIN) * share - lock.x;
      const route: Point[] = [ORIGIN];
      for (let j = below; j >= 1; j--)
        route.push({
          x: x + (holeHash(k * 7 + j, 51) - 0.5) * JITTER_X,
          y: barY + j * FLOOR_H,
        });
      route.push({ x, y: ENTRY_Y });
      const start = POP_MS + k * WISP_GAP_MS;
      const times = [start];
      for (let i = 1; i < route.length; i++) {
        const leg =
          i === 1
            ? FIRST_LEG_MS
            : i === route.length - 1
              ? LAST_LEG_MS
              : lerp(LEG_MS[0], LEG_MS[1], (i - 2) / Math.max(1, below - 1));
        times.push(times[i - 1] + leg);
        hit(0, times[i], 0);
      }
      lastImpact = Math.max(lastImpact, times[times.length - 1]);
      const a: Point = { x: 0, y: 0 };
      const b: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      // a route spot, live: the first stays at the flash's middle
      const place = (i: number, into: Point) => {
        const mid = state.bars[0];
        into.x = i === 0 ? 0 : mid.x + route[i].x;
        into.y = i === 0 ? 0 : mid.y + route[i].y;
        return into;
      };
      const mover: Mover = {
        start,
        times,
        route,
        climb: (ms) => {
          if (ms < start || ms > times[times.length - 1]) return null;
          let i = 0;
          while (i < times.length - 2 && ms >= times[i + 1]) i++;
          const u = (ms - times[i]) / (times[i + 1] - times[i]);
          return bounce(
            place(i, a),
            place(i + 1, b),
            i === 0 ? LIFT / 2 : LIFT,
            Math.min(1, u),
            at,
          );
        },
        hover: () => place(route.length - 1, at),
        drops: 0,
        lands: 0,
        drop: () => null,
        cat: { x, y: catY },
      };
      state.movers.push(mover);
    });
    state.open = lastImpact + OPEN_GAP_MS;
    hit(0, state.open, 1);
    state.movers.forEach((mover, k) => {
      mover.drops = state.open + DROP_DELAY_MS + k * DROP_GAP_MS;
      mover.lands = mover.drops + DROP_MS;
      hit(0, mover.lands, 2);
      const a: Point = { x: 0, y: 0 };
      const b: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      mover.drop = (ms) => {
        if (ms < mover.drops || ms > mover.lands) return null;
        const mid = state.bars[0];
        const end = mover.route[mover.route.length - 1];
        a.x = mid.x + end.x;
        a.y = mid.y + end.y;
        b.x = mid.x + mover.cat.x;
        b.y = mid.y + mover.cat.y;
        const u = (ms - mover.drops) / DROP_MS;
        return bounce(a, b, DROP_LIFT, u * u, at);
      };
    });
    hit(0, POP_MS, 0);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    const mid = bars[0];
    if (ms < POP_MS) drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont);
    drawDetonation(ctx, ORIGIN, ms - POP_MS, POP_BLAST, now);
    let slammed = 0;
    for (const mover of state.movers)
      if (ms >= mover.times[mover.times.length - 1]) slammed++;
    if (ms < state.open && slammed > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (slammed / state.movers.length) * GLOW_ALPHA;
      drawGlow(ctx, GOLD, mid.x, mid.y, GLOW + slammed * GLOW_PER_HIT, 0.45);
      ctx.restore();
    }
    for (const mover of state.movers) {
      const { times, route } = mover;
      const last = times.length - 1;
      drawWispBetween(
        ctx,
        mover.climb,
        ms,
        now,
        WISP_SIZE * 1.3,
        0.6,
        mover.start,
        times[last],
      );
      if (ms >= times[last] && ms < mover.drops)
        drawWisp(ctx, mover.hover, ms, now, WISP_SIZE * 1.3, 0.8);
      drawWispBetween(
        ctx,
        mover.drop,
        ms,
        now,
        WISP_SIZE * 1.3,
        0.8,
        mover.drops,
        mover.lands,
      );
      for (let i = 1; i <= last; i++) {
        spot.x = mid.x + route[i].x;
        spot.y = mid.y + route[i].y;
        drawDetonation(
          ctx,
          spot,
          ms - times[i],
          i === last ? IMPACT_BLAST : BOUNCE_BLAST,
          now,
        );
      }
      spot.x = mid.x + mover.cat.x;
      spot.y = mid.y + mover.cat.y;
      drawDetonation(ctx, spot, ms - mover.lands, LAND_BLAST, now);
    }
    drawDetonation(ctx, mid, ms - state.open, OPEN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 3 : step === 2 ? 1.2 : 0.7),
});
