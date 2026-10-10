// the fireflies: every so often, like the mouse and the bubbles, a flock of
// little gold wisps drifts along a floor over its workers' heads, swirling
// round each other, in past one side and out past the other over
// CONFIG.randomSpawns.fireflies.durationMs. A swipe through the flock
// catches every one it touches: each pops in a glint and zips onto one of
// that floor's workers, and a worker's first firefly promotes it a perma
// tier for good. The ones missed drift off with the flock.
//
// gameCanvas wires the floor actions in (wireFireflies), ticks the spawn
// timer (updateFireflies), sweeps them along every drag (sweepFireflies) and
// draws them in screen space over the HUD (drawFireflies)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playCoinDrop } from "../../sound";
import {
  celebrateWorkerBoost,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
  getBoostEventCandidates,
  getWorkerCenter,
  promoteWorkerPermaTier,
  type FloorActionsDeps,
} from "../../floors";
import type { Floor } from "../../gameState";
import { isVisibleOnFloor } from "../../crits";
import { randomInt } from "../../utils";
import { bezier } from "../../shared/curves";
import { isFloorLocked } from "../../shared/detachedJob";
import { between, clamp01, lerp } from "../../shared/easing";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { swipeHits, tapHits } from "../../shared/tapTarget";
import { stampGlimmer } from "../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";

// the flock's middle flies FLOCK_ABOVE over its workers' middles, bobbing
const FLOCK_ABOVE = 190;
const ENTER_PAST = 300;
const FLOCK_BOB = 40;
const FLOCK_BOB_RATE = 0.003;
// each firefly circles the middle (squashed flat), either way round
const ORBIT_R: [number, number] = [50, 220];
const ORBIT_SPEED: [number, number] = [0.002, 0.005];
const SQUASH = 0.5;
const JITTER = 12;
const JITTER_RATE = 0.01;
const SIZE = WISP_SIZE * 0.5;
const HIT_RADIUS = 36;
const DRAW_MARGIN = 150;
// a caught one pops, swelling, then zips onto its worker
const POP_MS = 80;
const POP_GROW = 0.8;
const GLINT = 120;
const GLINT_MS = 200;
const ZIP_MS = 380;
const ZIP_LIFT = 260;
const CATCH_SHAKE = 0.15;
const LAND_SHAKE = 0.25;
// a worker glows as each lands on it
const LIT_MS = 700;
const LIT_RADIUS = 110;
const LIT_GROW = 0.3;
const LIT_GLOW = fadeStops(COLOR.heavenlyGold);

interface Firefly {
  angle: number;
  radius: number;
  speed: number;
  seed: number;
  // performance.now() it was caught (Infinity until then), where (floor
  // space), and the worker it flies to
  caughtAt: number;
  from: Point;
  workerIndex: number;
  landed: boolean;
  // where it is at a time, in screen units; null once gone
  path: (ms: number) => Point | null;
}

interface Flock {
  floor: Floor;
  startAt: number;
  // the middle's run across the floor, in floor space
  fromX: number;
  toX: number;
  y: number;
  flies: Firefly[];
  // the workers they fly to, in turn, and when one last landed on each
  workers: number[];
  caught: number;
  lit: Map<number, number>;
}

let getDeps: (() => FloorActionsDeps) | null = null;
let flock: Flock | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.fireflies, performance.now());
// the flock's floor on screen, as last drawn
let area: { left: number; top: number } | null = null;
let width = 1;
const at: Point = { x: 0, y: 0 };
const bend: Point = { x: 0, y: 0 };

// the floor actions of the building on screen
export function wireFireflies(deps: () => FloorActionsDeps): void {
  getDeps = deps;
}

// once the last flock is gone, rolls to send another, like the mouse
export function updateFireflies(now: number): void {
  if (flock) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) startFlock(now);
}

// sends a flock along now (test button)
export function forceFireflies(): void {
  startFlock(performance.now());
}

// a firefly circling the flock's middle at ms, into `at` (floor space)
function swirl(f: Flock, fly: Firefly, ms: number): void {
  const age = ms - f.startAt;
  const across = age / CONFIG.randomSpawns.fireflies.durationMs;
  const a = fly.angle + age * fly.speed;
  at.x = lerp([f.fromX, f.toX], across) + Math.cos(a) * fly.radius;
  at.y =
    f.y +
    Math.sin(age * FLOCK_BOB_RATE) * FLOCK_BOB +
    Math.sin(a) * fly.radius * SQUASH +
    Math.sin(age * JITTER_RATE + fly.seed) * JITTER;
}

function makePath(f: Flock, fly: Firefly): (ms: number) => Point | null {
  return (ms) => {
    if (!area) return null;
    if (ms < fly.caughtAt) swirl(f, fly, ms);
    else {
      const t = (ms - fly.caughtAt - POP_MS) / ZIP_MS;
      if (t >= 1) return null;
      const to = getWorkerCenter(f.floor, fly.workerIndex);
      if (t <= 0 || !to) {
        at.x = fly.from.x;
        at.y = fly.from.y;
      } else {
        bend.x = (fly.from.x + to.x) / 2;
        bend.y = Math.min(fly.from.y, to.y) - ZIP_LIFT;
        bezier(fly.from, bend, to, t * t, at);
      }
    }
    at.x -= area.left;
    at.y -= area.top;
    return at;
  };
}

// a floor in view with workers that can still climb a perma tier, and those
// workers
function pickFloor(deps: FloorActionsDeps): Flock | null {
  const options: { floor: Floor; y: number; workers: number[] }[] = [];
  for (const entry of deps.getOnScreenFloors?.() ?? []) {
    const { floor } = entry;
    if (!floor.unlocked || isFloorLocked(floor)) continue;
    const workers = getBoostEventCandidates(floor).filter((i) => {
      const c = getWorkerCenter(floor, i);
      return c && isVisibleOnFloor(entry, c.y);
    });
    const c = workers.length ? getWorkerCenter(floor, workers[0]) : null;
    if (!c || !isVisibleOnFloor(entry, c.y - FLOCK_ABOVE)) continue;
    options.push({ floor, y: c.y - FLOCK_ABOVE, workers });
  }
  if (!options.length) return null;
  const { floor, y, workers } =
    options[Math.floor(Math.random() * options.length)];
  const fromLeft = Math.random() < 0.5;
  const left = FLOOR_X_MIN - ENTER_PAST;
  const right = FLOOR_X_MAX + ENTER_PAST;
  return {
    floor,
    startAt: 0,
    fromX: fromLeft ? left : right,
    toX: fromLeft ? right : left,
    y,
    flies: [],
    workers,
    caught: 0,
    lit: new Map(),
  };
}

function startFlock(now: number): void {
  const deps = getDeps?.();
  const f = deps && pickFloor(deps);
  if (!f) return;
  f.startAt = now;
  const n = randomInt(...CONFIG.randomSpawns.fireflies.count);
  for (let i = 0; i < n; i++) {
    const fly: Firefly = {
      angle: Math.random() * Math.PI * 2,
      radius: between(ORBIT_R),
      speed: (Math.random() < 0.5 ? -1 : 1) * between(ORBIT_SPEED),
      seed: Math.random() * 1000,
      caughtAt: Infinity,
      from: { x: 0, y: 0 },
      workerIndex: -1,
      landed: false,
      path: () => null,
    };
    fly.path = makePath(f, fly);
    f.flies.push(fly);
  }
  flock = f;
}

// a free firefly's spot on screen now, null while it's more than `margin`
// off screen
function freeAt(fly: Firefly, now: number, margin = 0): Point | null {
  if (fly.caughtAt !== Infinity) return null;
  const p = fly.path(now);
  return p && p.x > -margin && p.x < width + margin ? p : null;
}

// whether a press at (x, y) (gameCanvas screen units) lands on a firefly
export function hitTestFireflies(x: number, y: number): boolean {
  if (!flock) return false;
  const now = performance.now();
  for (const fly of flock.flies) {
    const p = freeAt(fly, now);
    if (p && tapHits(x, y, p, HIT_RADIUS)) return true;
  }
  return false;
}

// a swipe from (x0, y0) to (x1, y1) catching every firefly it passes over
export function sweepFireflies(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const f = flock;
  if (!f || !area) return;
  const now = performance.now();
  let caught = 0;
  for (const fly of f.flies) {
    const p = freeAt(fly, now);
    if (!p || !swipeHits(x0, y0, x1, y1, p, HIT_RADIUS)) continue;
    fly.caughtAt = now;
    fly.from.x = p.x + area.left;
    fly.from.y = p.y + area.top;
    fly.workerIndex = f.workers[f.caught++ % f.workers.length];
    caught++;
  }
  if (!caught) return;
  playBloop();
  shakeScreen(CATCH_SHAKE);
}

// a firefly reaching its worker: the worker's first promotes it
function land(f: Flock, fly: Firefly, now: number): void {
  fly.landed = true;
  if (!f.lit.has(fly.workerIndex)) {
    promoteWorkerPermaTier(f.floor, fly.workerIndex);
    celebrateWorkerBoost(f.floor, fly.workerIndex, Date.now());
  } else playCoinDrop();
  f.lit.set(fly.workerIndex, now);
  shakeScreen(LAND_SHAKE);
}

// the flock, in gameCanvas's screen units (w wide), each frame
export function drawFireflies(
  ctx: CanvasRenderingContext2D,
  w: number,
  now: number,
): void {
  width = w;
  const f = flock;
  if (!f) return;
  const deps = getDeps?.();
  area = deps?.floors.includes(f.floor)
    ? (deps.getScreenAreaLocal?.(f.floor) ?? null)
    : null;
  if (!area) {
    flock = null;
    return;
  }
  const t = performance.now();
  let busy = t < f.startAt + CONFIG.randomSpawns.fireflies.durationMs;
  for (const fly of f.flies) {
    if (fly.caughtAt === Infinity || fly.landed) continue;
    if (t >= fly.caughtAt + POP_MS + ZIP_MS) land(f, fly, t);
    else busy = true;
  }
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  for (const [workerIndex, litAt] of f.lit) {
    const k = 1 - (t - litAt) / LIT_MS;
    const c = k > 0 ? getWorkerCenter(f.floor, workerIndex) : null;
    if (!c) continue;
    busy = true;
    ctx.globalAlpha = k;
    const r = LIT_RADIUS * (1 + LIT_GROW * (1 - k));
    drawGlow(ctx, LIT_GLOW, c.x - area.left, c.y - area.top, r);
  }
  for (const fly of f.flies) {
    const since = t - fly.caughtAt;
    if (since < 0 || since >= GLINT_MS) continue;
    ctx.globalAlpha = 1 - since / GLINT_MS;
    const x = fly.from.x - area.left;
    const y = fly.from.y - area.top;
    stampGlimmer(ctx, x, y, GLINT, fly.seed, COLOR.white);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  for (const fly of f.flies) {
    if (fly.landed) continue;
    const caught = fly.caughtAt !== Infinity;
    if (!caught && !freeAt(fly, t, DRAW_MARGIN)) continue;
    const pop = caught ? clamp01((t - fly.caughtAt) / POP_MS) : 0;
    drawWisp(ctx, fly.path, t, now, SIZE * (1 + POP_GROW * pop), pop);
  }
  if (!busy) flock = null;
}
