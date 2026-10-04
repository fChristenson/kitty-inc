// bouncing and ricochets for events: paths planned at arm time that ricochet
// off the screen's edges, bank through points, hop in arcs or drop and
// bounce on a floor, each contact a Bounce with when, where and which way
// the surface faced; plus the splash where something bounces. Every leg is
// a straight chord plus a parabola, so gravity arcs are true ballistics
import { COLOR } from "../../palette";
import { drawGlow, fadeStops } from "../glowSprite";
import { drawGlitterLight, type Point } from "../wisp";
import { lerp, type Range } from "../easing";
import { hash01 } from "../twinkle";
import type { Box } from "../bullets";

export interface Bounce {
  at: Point;
  ms: number;
  // the surface's normal (rad), facing the side it bounced off
  normal: number;
}

export interface BouncePath {
  // every contact after the start, the last being where it ends
  bounces: Bounce[];
  startMs: number;
  endMs: number;
  // where it is at ms, held at its ends outside them; one point, rewritten
  at: (ms: number) => Point;
}

interface Leg {
  from: Point;
  to: Point;
  starts: number;
  ends: number;
  // how far the arc bows up above its chord at the middle
  lift: number;
}

const UP = -Math.PI / 2;

function pathOf(legs: Leg[], bounces: Bounce[]): BouncePath {
  const spot: Point = { x: 0, y: 0 };
  const first = legs[0];
  const last = legs[legs.length - 1];
  return {
    bounces,
    startMs: first.starts,
    endMs: last.ends,
    at: (ms) => {
      let k = 0;
      while (k < legs.length - 1 && ms >= legs[k].ends) k++;
      const leg = legs[k];
      const u = Math.min(
        1,
        Math.max(0, (ms - leg.starts) / (leg.ends - leg.starts || 1)),
      );
      spot.x = leg.from.x + (leg.to.x - leg.from.x) * u;
      spot.y =
        leg.from.y + (leg.to.y - leg.from.y) * u - 4 * leg.lift * u * (1 - u);
      return spot;
    },
  };
}

// the normal of a corner turned at p, coming from `from` and going on to `to`
function cornerNormal(from: Point, p: Point, to: Point): number {
  const ax = from.x - p.x;
  const ay = from.y - p.y;
  const bx = to.x - p.x;
  const by = to.y - p.y;
  const la = Math.hypot(ax, ay) || 1;
  const lb = Math.hypot(bx, by) || 1;
  const nx = ax / la + bx / lb;
  const ny = ay / la + by / lb;
  return nx === 0 && ny === 0 ? Math.atan2(ay, ax) : Math.atan2(ny, nx);
}

export interface Ricochet {
  bounces: number;
  // px per ms, multiplied by gain at every bounce
  speed: number;
  gain?: number;
  startMs?: number;
  // after the last bounce it flies here instead of on to the next wall
  finish?: Point;
}

// fired from `from` at `angle`, ricocheting dead straight off the box's
// walls like a ball in a box
export function ricochet(
  from: Point,
  angle: number,
  box: Box,
  { bounces, speed, gain = 1, startMs = 0, finish }: Ricochet,
): BouncePath {
  const legs: Leg[] = [];
  const hits: Bounce[] = [];
  let p = from;
  let dx = Math.cos(angle);
  let dy = Math.sin(angle);
  let clock = startMs;
  for (let i = 0; i <= bounces; i++) {
    if (i === bounces && finish) {
      const ms = Math.hypot(finish.x - p.x, finish.y - p.y) / speed;
      legs.push({
        from: p,
        to: finish,
        starts: clock,
        ends: clock + ms,
        lift: 0,
      });
      hits.push({
        at: finish,
        ms: clock + ms,
        normal: Math.atan2(p.y - finish.y, p.x - finish.x),
      });
      break;
    }
    const tx =
      dx > 0
        ? (box.right - p.x) / dx
        : dx < 0
          ? (box.left - p.x) / dx
          : Infinity;
    const ty =
      dy > 0
        ? (box.bottom - p.y) / dy
        : dy < 0
          ? (box.top - p.y) / dy
          : Infinity;
    const reach = Math.max(0, Math.min(tx, ty));
    const to: Point = { x: p.x + dx * reach, y: p.y + dy * reach };
    const ms = reach / speed;
    clock += ms;
    legs.push({ from: p, to, starts: clock - ms, ends: clock, lift: 0 });
    // off a side wall, the floor or ceiling, or both at a corner
    const side = tx <= ty + 1e-6;
    const flat = ty <= tx + 1e-6;
    const nx = side ? -Math.sign(dx) : 0;
    const ny = flat ? -Math.sign(dy) : 0;
    hits.push({ at: to, ms: clock, normal: Math.atan2(ny, nx) });
    if (side) dx = -dx;
    if (flat) dy = -dy;
    speed *= gain;
    p = to;
  }
  return pathOf(legs, hits);
}

// banked off every point in turn, straight from one to the next; each leg
// takes lerp(legMs) of the way through, so a falling range quickens it
export function ricochetThrough(
  points: Point[],
  legMs: Range,
  startMs = 0,
): BouncePath {
  return through(points, legMs, [0, 0], startMs, false);
}

// hopping from point to point in gravity arcs `lift` px high (from the
// range's first to its last hop), every landing a bounce off the ground
export function hops(
  points: Point[],
  legMs: Range,
  lift: Range,
  startMs = 0,
): BouncePath {
  return through(points, legMs, lift, startMs, true);
}

function through(
  points: Point[],
  legMs: Range,
  lift: Range,
  startMs: number,
  ground: boolean,
): BouncePath {
  const legs: Leg[] = [];
  const hits: Bounce[] = [];
  const count = points.length - 1;
  let clock = startMs;
  for (let k = 0; k < count; k++) {
    const t = k / Math.max(1, count - 1);
    const ms = lerp(legMs, t);
    const from = points[k];
    const to = points[k + 1];
    legs.push({
      from,
      to,
      starts: clock,
      ends: clock + ms,
      lift: lerp(lift, t),
    });
    clock += ms;
    const next = points[k + 2];
    hits.push({
      at: to,
      ms: clock,
      normal: ground
        ? UP
        : next
          ? cornerNormal(from, to, next)
          : Math.atan2(from.y - to.y, from.x - to.x),
    });
  }
  return pathOf(legs, hits);
}

export interface Drop {
  // px per ms², and the share of its speed it keeps at each bounce
  gravity: number;
  restitution: number;
  // sideways px per ms
  drift?: number;
  bounces: number;
  startMs?: number;
}

// dropped from `from` onto the floor at `floorY`, bouncing lower and quicker
// each time like a dropped ball
export function dropBounce(
  from: Point,
  floorY: number,
  { gravity, restitution, drift = 0, bounces, startMs = 0 }: Drop,
): BouncePath {
  const legs: Leg[] = [];
  const hits: Bounce[] = [];
  const fall = Math.sqrt((2 * Math.max(0, floorY - from.y)) / gravity);
  let clock = startMs;
  let p = from;
  let ms = fall;
  // the speed it hits the floor at
  let speed = gravity * fall;
  for (let i = 0; i <= bounces; i++) {
    const to: Point = { x: p.x + drift * ms, y: floorY };
    legs.push({
      from: p,
      to,
      starts: clock,
      ends: clock + ms,
      lift: (gravity * ms * ms) / 8,
    });
    clock += ms;
    hits.push({ at: to, ms: clock, normal: UP });
    speed *= restitution;
    ms = (2 * speed) / gravity;
    p = to;
  }
  return pathOf(legs, hits);
}

const SPLASH = fadeStops(COLOR.white, 0.25);
const SPLASH_GOLD = fadeStops(COLOR.heavenlyGold);
export const SPLASH_MS = 320;
const SPARKS = 7;
// sparks fan out within this many rad either side of the normal
const SPARK_FAN = 1.2;

// the splash where something bounces: a flash flattened along the surface
// and sparks kicked off it, `size` px across, msSince the bounce
export function drawBounceSplash(
  ctx: CanvasRenderingContext2D,
  bounce: Bounce,
  msSince: number,
  size: number,
  now: number,
): void {
  if (msSince < 0 || msSince >= SPLASH_MS) return;
  const t = msSince / SPLASH_MS;
  const fade = 1 - t;
  const { at, normal } = bounce;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = fade;
  ctx.translate(at.x, at.y);
  ctx.rotate(normal + Math.PI / 2);
  drawGlow(ctx, SPLASH_GOLD, 0, 0, size * (0.5 + 0.5 * t), 0.22);
  drawGlow(ctx, SPLASH, 0, 0, size * 0.3 * (1 - 0.5 * t), 0.4);
  ctx.restore();
  const reach = size * 0.9 * (1 - fade * fade);
  for (let i = 0; i < SPARKS; i++) {
    const a = normal + (hash01(i, 91) * 2 - 1) * SPARK_FAN;
    const r = reach * (0.5 + 0.5 * hash01(i, 92));
    drawGlitterLight(
      ctx,
      at.x + Math.cos(a) * r,
      at.y + Math.sin(a) * r + size * 0.3 * t * t,
      size * 0.12,
      i + 300,
      fade,
      now,
    );
  }
}
