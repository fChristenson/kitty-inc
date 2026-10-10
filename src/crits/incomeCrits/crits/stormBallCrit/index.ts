// the storm ball income crit: the number balls up into a crackling ball of
// lightning ricocheting round the screen, faster and faster, every wall it
// hits firing a bolt up into the total; then it shoots straight up into the
// middle
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const BOUNCES = 11;
// its first heading, speed (px per ms) and the speed-up on every bounce
const HEADING = -0.9;
const SPEED = 2.4;
const GAIN = 1.13;
const UP_DELAY_MS = 140;
const BOLT_MS = 120;
const ZAP_DELAY_MS = 20;
// the box it bounces round: in from the screen's sides, from under the total
// down to the bottom (as far under the middle as this share of the total's
// height over it)
const EDGE = 50;
const UNDER = 200;
const BOTTOM = 0.75;
const FLOOR_UP = 110;
// arcs crackling off it, re-aimed every CRACKLE_MS
const CRACKLES = 6;
const CRACKLE_MS = 50;
const CRACKLE_REACH = 90;
const CRACKLE = 0.6;
const CRACKLE_ALPHA = 0.8;
const BOLT = 1.2;
const STRIKE = 1;
const BALL = WISP_SIZE * 1.8;
const ZAP_BLAST = 170;
const BOUNCE_KICK = 0.5;
// shakes by step: a bolt into the total, the ball in
const SHAKES = [0.6, 2.4];

interface Strike {
  at: number;
  from: Point;
  to: Point;
  bolt: Bolt;
}
interface Storm {
  strikes: Strike[];
  endAt: number;
  ball: (ms: number) => Point;
}
const storms = new WeakMap<Running, Storm>();
const crackles = Array.from({ length: CRACKLES }, () =>
  createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 0),
);

function planStorm(to: Point, viewportWidth: number): Storm {
  const box = {
    left: -viewportWidth / 2 + EDGE,
    right: viewportWidth / 2 - EDGE,
    top: to.y + UNDER,
    bottom: -to.y * BOTTOM - FLOOR_UP,
  };
  const points: Point[] = [{ x: 0, y: 0 }];
  const times = [0];
  let x = 0;
  let y = 0;
  let dx = Math.cos(HEADING);
  let dy = Math.sin(HEADING);
  let speed = SPEED;
  for (let k = 0; k < BOUNCES; k++) {
    const tx = dx > 0 ? (box.right - x) / dx : (box.left - x) / dx;
    const ty = dy > 0 ? (box.bottom - y) / dy : (box.top - y) / dy;
    const t = Math.min(tx, ty);
    x += dx * t;
    y += dy * t;
    points.push({ x, y });
    times.push(times[times.length - 1] + t / speed);
    if (tx <= ty) dx = -dx;
    else dy = -dy;
    speed *= GAIN;
  }
  const endAt = times[times.length - 1] + UP_DELAY_MS;
  points.push(to);
  times.push(endAt);
  const strikes = points.slice(1, -1).map((from, k) => {
    const spot = readoutSpot(to, k, 271);
    return {
      at: times[k + 1],
      from,
      to: spot,
      bolt: createBolt(from, spot, 1),
    };
  });
  const spot: Point = { x: 0, y: 0 };
  return {
    strikes,
    endAt,
    ball: (ms) => {
      let k = 1;
      while (k < times.length - 1 && ms > times[k]) k++;
      const u = clamp01((ms - times[k - 1]) / (times[k] - times[k - 1]));
      spot.x = lerp(points[k - 1].x, points[k].x, u);
      spot.y = lerp(points[k - 1].y, points[k].y, u);
      return spot;
    },
  };
}

registerFloorCrit("stormBallCrit", {
  plan(r, bars, hit) {
    const storm = planStorm(bars[0], r.viewportWidth);
    storms.set(r, storm);
    for (const s of storm.strikes) hit(0, s.at + ZAP_DELAY_MS);
    hit(0, storm.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const storm = storms.get(r);
    if (!storm) return;
    const now = r.startedAt + ms;
    const { strikes, endAt } = storm;
    drawNumberShrink(ctx, r, ms);
    while (r.kicked < strikes.length && ms >= strikes[r.kicked].at) {
      r.kicked++;
      r.shake(BOUNCE_KICK);
    }
    for (let k = 0; k < strikes.length; k++) {
      const s = strikes[k];
      const t = ms - s.at;
      if (t >= 0 && t < BOLT_MS) {
        drawBolt(ctx, s.bolt, 1 - t / BOLT_MS, BOLT);
        drawStrike(ctx, s.from, 1 - t / BOLT_MS, STRIKE, now);
      }
      drawDetonation(ctx, s.to, t - ZAP_DELAY_MS, ZAP_BLAST, now);
    }
    if (ms < endAt) {
      const c = storm.ball(ms);
      const seed = Math.floor(ms / CRACKLE_MS) * CRACKLES;
      for (let k = 0; k < CRACKLES; k++) {
        const a = holeHash(seed + k, 272) * Math.PI * 2;
        const b = crackles[k];
        b.from.x = c.x;
        b.from.y = c.y;
        b.to.x = c.x + Math.cos(a) * CRACKLE_REACH;
        b.to.y = c.y + Math.sin(a) * CRACKLE_REACH;
        drawBolt(ctx, b, CRACKLE_ALPHA, CRACKLE);
      }
    }
    drawWispBetween(ctx, storm.ball, ms, now, BALL, 1, 0, endAt);
    drawFinale(ctx, bars[0], ms - endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
