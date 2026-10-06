import { WISP_SIZE, type Point } from "../../shared/wisp";
import type { Box } from "../../shared/bullets";
import { between, type Range } from "../../shared/easing";
import { Track } from "./track";
import type { BulletHellWisps } from "./types";

// the bullet hell game's targets: wisps simulated step by step, each moving
// its game's way (looping, darting, flocking, orbiting or drifting)

const TAU = Math.PI * 2;
// a wisp shot down splits into two this much smaller, flung apart this
// wide (rad) and this much faster
const SPLIT_SIZE = 0.65;
const SPLIT_TURN = 0.8;
const SPLIT_SPEED = 1.35;
const MIN_SPLIT_SPEED = 0.25;
const FLOCK_SQUASH = 0.8;
const BREATHE = 0.06;

export interface Wisp {
  track: Track;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  dead: number | null;
  size: number; // × WISP_SIZE
  gen: number;
  move: (ms: number, dt: number) => void;
}

export const wispRadius = (w: Wisp) => (WISP_SIZE * w.size) / 2;

function newWisp(ms: number, size: number, gen: number): Wisp {
  return {
    track: new Track(),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    born: ms,
    dead: null,
    size,
    gen,
    move: () => {},
  };
}

// eases w towards (tx, ty) like a stiff spring, settling in about snapMs
function spring(
  w: Wisp,
  tx: number,
  ty: number,
  dt: number,
  snapMs: number,
): void {
  const om = 4 / snapMs;
  w.vx += (om * om * (tx - w.x) - 1.5 * om * w.vx) * dt;
  w.vy += (om * om * (ty - w.y) - 1.5 * om * w.vy) * dt;
  w.x += w.vx * dt;
  w.y += w.vy * dt;
}

// puts w at p, keeping its velocity for shots leading it
function place(w: Wisp, p: Point, dt: number): void {
  if (dt > 0) {
    w.vx = (p.x - w.x) / dt;
    w.vy = (p.y - w.y) / dt;
  }
  w.x = p.x;
  w.y = p.y;
}

// flying straight, bouncing off the box's walls
function drifting(w: Wisp, box: Box): Wisp["move"] {
  const r = wispRadius(w);
  return (_ms, dt) => {
    w.x += w.vx * dt;
    w.y += w.vy * dt;
    if (w.x < box.left + r) {
      w.x = 2 * (box.left + r) - w.x;
      w.vx = Math.abs(w.vx);
    } else if (w.x > box.right - r) {
      w.x = 2 * (box.right - r) - w.x;
      w.vx = -Math.abs(w.vx);
    }
    if (w.y < box.top + r) {
      w.y = 2 * (box.top + r) - w.y;
      w.vy = Math.abs(w.vy);
    } else if (w.y > box.bottom - r) {
      w.y = 2 * (box.bottom - r) - w.y;
      w.vy = -Math.abs(w.vy);
    }
  };
}

const randomIn = (box: Box): Point => ({
  x: box.left + Math.random() * (box.right - box.left),
  y: box.top + Math.random() * (box.bottom - box.top),
});

// a Lissajous loop over the box, `laps` turns a second on each axis
function lissajous(box: Box, laps: Range, pace: number): (ms: number) => Point {
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  const ax = (box.right - box.left) / 2;
  const ay = (box.bottom - box.top) / 2;
  const wx = between(laps) * pace * TAU;
  const wy = between(laps) * pace * TAU;
  const px = Math.random() * TAU;
  const py = Math.random() * TAU;
  const spot: Point = { x: 0, y: 0 };
  return (ms) => {
    const s = ms / 1000;
    spot.x = cx + ax * Math.sin(wx * s + px);
    spot.y = cy + ay * Math.sin(wy * s + py);
    return spot;
  };
}

// the group of wisps popping in at ms; pace speeds loopers up (1 at the
// start) and slot counts the wisps spawned so far, spreading orbiters over
// the rings
export function spawnWisps(
  cfg: BulletHellWisps,
  box: Box,
  ms: number,
  pace: number,
  slot: number,
): Wisp[] {
  const leader =
    cfg.move === "flock" ? lissajous(box, cfg.leaderLaps, 1) : null;
  const swirl = Math.random() < 0.5 ? -1 : 1;
  const out: Wisp[] = [];
  for (let i = 0; i < cfg.group; i++) {
    const w = newWisp(ms, cfg.size, 0);
    switch (cfg.move) {
      case "loop": {
        const path = lissajous(box, cfg.laps, pace);
        place(w, path(0), 0);
        w.move = (t, dt) => place(w, path(t - w.born), dt);
        break;
      }
      case "dart": {
        place(w, randomIn(box), 0);
        const goal = { x: w.x, y: w.y };
        let hopAt = ms;
        w.move = (t, dt) => {
          if (t >= hopAt) {
            const a = Math.random() * TAU;
            const r = between(cfg.reach);
            goal.x = Math.min(
              box.right,
              Math.max(box.left, w.x + Math.cos(a) * r),
            );
            goal.y = Math.min(
              box.bottom,
              Math.max(box.top, w.y + Math.sin(a) * r),
            );
            hopAt = t + between(cfg.hopMs);
          }
          spring(w, goal.x, goal.y, dt, cfg.snapMs);
        };
        break;
      }
      case "flock": {
        const r = between(cfg.swarmRadius);
        const th = Math.random() * TAU;
        const spin = (swirl * cfg.swirlHz * TAU) / 1000;
        const target = (t: number): Point => {
          const p = leader!(t);
          const a = th + spin * t;
          return {
            x: p.x + Math.cos(a) * r,
            y: p.y + Math.sin(a) * r * FLOCK_SQUASH,
          };
        };
        place(w, target(ms), 0);
        w.move = (t, dt) => {
          const q = target(t);
          spring(w, q.x, q.y, dt, cfg.snapMs);
        };
        break;
      }
      case "orbit": {
        const ring = (slot + i) % cfg.rings.length;
        const fit = Math.min(
          (box.right - box.left) / 2,
          (box.bottom - box.top) / 2 / cfg.squash,
        );
        const radius = cfg.rings[ring] * fit;
        const om = (between(cfg.lapsHz) * TAU * (ring % 2 ? -1 : 1)) / 1000;
        const th = Math.random() * TAU;
        const breathe = Math.random() * TAU;
        const cx = (box.left + box.right) / 2;
        const cy = (box.top + box.bottom) / 2;
        const spot: Point = { x: 0, y: 0 };
        const at = (t: number): Point => {
          const s = t - w.born;
          const rr = radius * (1 + BREATHE * Math.sin(s / 333 + breathe));
          spot.x = cx + Math.cos(th + om * s) * rr;
          spot.y = cy + Math.sin(th + om * s) * rr * cfg.squash;
          return spot;
        };
        place(w, at(ms), 0);
        w.move = (t, dt) => place(w, at(t), dt);
        break;
      }
      case "drift": {
        const a = Math.random() * TAU;
        const sp = between(cfg.speed);
        place(w, randomIn(box), 0);
        w.vx = Math.cos(a) * sp;
        w.vy = Math.sin(a) * sp;
        w.move = drifting(w, box);
        break;
      }
    }
    w.track.push(ms, w.x, w.y);
    out.push(w);
  }
  return out;
}

// the two smaller wisps a shot-down one splits into, flung apart
export function splitWisp(w: Wisp, ms: number, box: Box): Wisp[] {
  const speed = Math.max(Math.hypot(w.vx, w.vy), MIN_SPLIT_SPEED) * SPLIT_SPEED;
  const heading = Math.atan2(w.vy, w.vx);
  return [-1, 1].map((k) => {
    const child = newWisp(ms, w.size * SPLIT_SIZE, w.gen + 1);
    child.x = w.x;
    child.y = w.y;
    child.vx = Math.cos(heading + k * SPLIT_TURN) * speed;
    child.vy = Math.sin(heading + k * SPLIT_TURN) * speed;
    child.move = drifting(child, box);
    child.track.push(ms, child.x, child.y);
    return child;
  });
}
