// Rebound, a lock crit: the number drops into the dark locked floor as a
// wisp that ricochets dead straight off its walls, faster every hit; it
// splits in two, then four, the room filling with criss-crossing trails;
// all four slam into its middle and burst it open, its new bar running
// twice as fast for a while
import {
  drawBounceSplash,
  ricochet,
  type Bounce,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import type { Box } from "../../../../shared/animationStyles/bullets";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
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
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number dropping onto the wisp's start, START from the floor's middle
const DROP_MS = 200;
const DROP_SHRINK = 0.3;
const START_X = -200;
const START_IN = 20;
// the room the wisps ricochet in, WALL_IN from the floor's sides and
// CEILING_IN from its top and bottom
const WALL_IN = 70;
const CEILING_IN = 30;
// the first wisp's angle, bounces and speed (px a ms, GAIN times faster at
// every bounce); each split fans SPLIT rad either side of the wall's normal
const ANGLE = 0.5;
const BOUNCES = 3;
const SPEED = 1.5;
const GAIN = 1.12;
const SPLIT = 0.7;
const SPLASH = 110;
const WISP = WISP_SIZE * 1.2;
const WISP_HEAT = 0.7;
const SLAM_BLAST = 110;
const OPEN_BLAST = 240;
const OPEN_GAP_MS = 80;
const PAY_GAP_MS = 400;
const TAIL_MS = 900;
const BOUNCE_SHAKE: [number, number] = [0.3, 0.6];
// shakes by step: a slam, the opening, the speed
const SHAKES = [0.9, 2.6, 1];

interface State {
  paths: { path: BouncePath; at: (ms: number) => Point | null }[];
  bounces: Bounce[];
  slams: number[];
  start: Point;
  openAt: number;
  offset: Point;
}
const states = new WeakMap<Running, State>();
const room: Point = { x: 0, y: 0 };

// two wisps split off `from`'s last wall, one each way off its normal
function split(
  from: BouncePath,
  gen: number,
  box: Box,
  finish: Point | undefined,
): BouncePath[] {
  const last = from.bounces[from.bounces.length - 1];
  const speed = SPEED * GAIN ** (BOUNCES * gen);
  return [-SPLIT, SPLIT].map((d) =>
    ricochet({ ...last.at }, last.normal + d, box, {
      bounces: finish ? 2 + (d > 0 ? 1 : 0) : BOUNCES,
      speed,
      gain: GAIN,
      startMs: last.ms,
      finish,
    }),
  );
}

registerFloorCrit("reboundCrit", {
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const halfW = (FLOOR_X_MAX - FLOOR_X_MIN) / 2 - WALL_IN;
    const halfH = FLOOR_H / 2 - CEILING_IN;
    const box: Box = { left: -halfW, right: halfW, top: -halfH, bottom: halfH };
    const start = { x: START_X, y: -halfH + START_IN };
    const middle = { x: 0, y: 0 };
    const first = ricochet(start, ANGLE, box, {
      bounces: BOUNCES,
      speed: SPEED,
      gain: GAIN,
      startMs: DROP_MS,
    });
    const twos = split(first, 1, box, undefined);
    const fours = twos.flatMap((p) => split(p, 2, box, middle));
    const paths = [first, ...twos, ...fours];
    const slams = fours.map((p) => p.endMs).sort((a, b) => a - b);
    const openAt = slams[slams.length - 1] + OPEN_GAP_MS;
    // every wall hit, the slams into the middle aside
    const bounces = paths
      .flatMap((p, i) => (i < 3 ? p.bounces : p.bounces.slice(0, -1)))
      .sort((a, b) => a.ms - b.ms);
    for (const at of slams) hit(0, at, 0);
    hit(0, openAt, 1);
    hit(0, openAt + PAY_GAP_MS, 2);
    states.set(r, {
      paths: paths.map((path) => ({
        path,
        at: (ms: number) =>
          ms >= path.startMs && ms <= path.endMs ? path.at(ms) : null,
      })),
      bounces,
      slams,
      start,
      openAt,
      offset: { x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x, y: 0 },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    room.x = bars[0].x + state.offset.x;
    room.y = bars[0].y + state.offset.y;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, room.x + state.start.x, p),
        lerp(0, room.y + state.start.y, p),
        r.flashFont * lerp(1, DROP_SHRINK, p),
      );
    }
    const { bounces } = state;
    while (r.kicked < bounces.length && ms >= bounces[r.kicked].ms) {
      r.shake(
        lerp(BOUNCE_SHAKE[0], BOUNCE_SHAKE[1], r.kicked / bounces.length),
      );
      r.kicked++;
    }
    ctx.save();
    ctx.translate(room.x, room.y);
    for (let i = 0; i < bounces.length; i++)
      drawBounceSplash(ctx, bounces[i], ms - bounces[i].ms, SPLASH, now);
    if (ms < state.openAt)
      for (const p of state.paths)
        if (ms >= p.path.startMs) drawWisp(ctx, p.at, ms, now, WISP, WISP_HEAT);
    ctx.restore();
    for (const at of state.slams)
      drawDetonation(ctx, room, ms - at, SLAM_BLAST, now);
    drawDetonation(ctx, room, ms - state.openAt, OPEN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
