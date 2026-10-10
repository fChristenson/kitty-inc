// the fireflies: every so often, like the mouse and the bubbles, a flock of
// little gold wisps drifts in along a floor over its workers' heads,
// swirling round each other, and meanders there for
// CONFIG.randomSpawns.fireflies.durationMs, blinking before it vanishes. A
// swipe through the flock catches every one it touches: each pops in a glint
// and zips onto one of that floor's workers, and a worker's first firefly
// promotes it a perma tier for good.
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
import { between, clamp01, easeOutCubic, lerp } from "../../shared/easing";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../shared/lightBatch";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import { swipeHits, tapHits } from "../../shared/tapTarget";
import { stampGlimmer } from "../../shared/twinkle";
import {
  drawWispHead,
  drawWispTrail,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";

// the flock's middle flies in from ENTER_PAST beyond the floor's side to a
// spot REST_EDGE or more in from its sides over ENTER_MS, then meanders
// MEANDER either way of it; FLOCK_ABOVE over its workers' middles, bobbing
const FLOCK_ABOVE = 190;
const ENTER_PAST = 300;
const ENTER_MS = 1_400;
const REST_EDGE = 300;
const MEANDER = 160;
const MEANDER_RATE = 0.0012;
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
  // where the middle flies in from and settles over, in floor space
  fromX: number;
  restX: number;
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
  const settle = clamp01(age / ENTER_MS);
  const a = fly.angle + age * fly.speed;
  at.x =
    lerp([f.fromX, f.restX], easeOutCubic(settle)) +
    Math.sin(age * MEANDER_RATE) * MEANDER * settle +
    Math.cos(a) * fly.radius;
  at.y =
    f.y +
    Math.sin(age * FLOCK_BOB_RATE) * FLOCK_BOB +
    Math.sin(a) * fly.radius * SQUASH +
    Math.sin(age * JITTER_RATE + fly.seed) * JITTER;
}

// a firefly's swirl (floor space) is the same at a given time every frame, and
// its trail asks for the same past times frame after frame: kept per fly in a
// ring by time, so 16 trails don't redo the trig for every sparkle
const SWIRL_SLOTS = 1024;

function makePath(f: Flock, fly: Firefly): (ms: number) => Point | null {
  const times = new Float64Array(SWIRL_SLOTS).fill(NaN);
  const xs = new Float64Array(SWIRL_SLOTS);
  const ys = new Float64Array(SWIRL_SLOTS);
  return (ms) => {
    if (!area) return null;
    if (ms < fly.caughtAt) {
      const slot = Math.floor(ms) & (SWIRL_SLOTS - 1);
      if (times[slot] === ms) {
        at.x = xs[slot];
        at.y = ys[slot];
      } else {
        swirl(f, fly, ms);
        times[slot] = ms;
        xs[slot] = at.x;
        ys[slot] = at.y;
      }
    } else {
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
  return {
    floor,
    startAt: 0,
    fromX: fromLeft ? FLOOR_X_MIN - ENTER_PAST : FLOOR_X_MAX + ENTER_PAST,
    restX: lerp(
      [FLOOR_X_MIN + REST_EDGE, FLOOR_X_MAX - REST_EDGE],
      Math.random(),
    ),
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
// off screen or the flock's time is up
function freeAt(fly: Firefly, now: number, margin = 0): Point | null {
  if (fly.caughtAt !== Infinity || !flock) return null;
  if (now - flock.startAt >= CONFIG.randomSpawns.fireflies.durationMs)
    return null;
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
  const { durationMs, pulseMs } = CONFIG.randomSpawns.fireflies;
  const msLeft = f.startAt + durationMs - t;
  let busy = !isSpawnGone(msLeft);
  const fade = spawnFade(msLeft, pulseMs, now);
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
  // every trail in one light batch, then the heads over them
  beginLightBatch(ctx);
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 1) {
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    for (const fly of f.flies) {
      if (fly.landed) continue;
      let size: number;
      let heat = 0;
      let alpha = 1;
      if (fly.caughtAt !== Infinity) {
        heat = clamp01((t - fly.caughtAt) / POP_MS);
        size = SIZE * (1 + POP_GROW * heat);
      } else {
        if (fade.scale <= 0) continue;
        const p = fly.path(t);
        if (!p || p.x < -DRAW_MARGIN || p.x > w + DRAW_MARGIN) continue;
        size = SIZE * fade.scale;
        alpha = fade.alpha;
      }
      if (pass === 0) drawWispTrail(ctx, fly.path, t, now, size, alpha);
      else drawWispHead(ctx, fly.path, t, now, size, heat, alpha);
    }
  }
  if (!busy) flock = null;
}
