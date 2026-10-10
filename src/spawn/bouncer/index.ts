// the bouncer: every so often, like the mouse and the bubbles, a gold ball
// bounces round the screen's edges like an old screensaver, glinting off
// every wall, for CONFIG.randomSpawns.bouncer.durationMs, blinking before it
// vanishes. A tap turns it heavy: it squashes, then smashes down the building
// bar to bar (every bar in view, top first), a blast and free levels on
// each, the last one huge.
//
// gameCanvas wires the floor actions in (wireBouncer), ticks the spawn timer
// (updateBouncer), taps it (tapBouncer) and draws it in screen space over the
// HUD (drawBouncer)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { getIncomeBarBox, type FloorActionsDeps } from "../../floors";
import { levelsFor, type Floor } from "../../gameState";
import { bezier } from "../../shared/curves";
import { clamp01 } from "../../shared/easing";
import { DETONATION_MS, drawDetonation } from "../../shared/explosion";
import { playBarExplosion } from "../../shared/explosionBang";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import { barAt, barsInView, landBarLevels } from "../../shared/spawnPrize";
import { tapHitsMoving } from "../../shared/tapTarget";
import { stampGlimmer } from "../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";

// it bounces inside the screen, MARGIN in from the sides and bottom and TOP
// (of the screen's height) down from the top, SPEED screen units a ms
const MARGIN = 80;
const TOP = 0.15;
const SPEED = 0.75;
const SIZE = WISP_SIZE;
const HIT_RADIUS = 50;
const TAP_LAG_MS = 80;
const IN_MS = 200;
// a wall it hits glints
const GLINT = 90;
const GLINT_MS = 160;
// tapped: it squashes, then hops bar to bar, LEG_MS a hop, bowed up LIFT
// (FIRST_LIFT off the tap), swelling and heating up
const SQUASH_MS = 70;
const LEG_MS = 150;
const FIRST_LIFT = 60;
const LIFT = 160;
const HEAVY = 0.5;
// its slam on each bar, and the last bar's
const HIT_SIZE = 170;
const HIT_SHAKE = 0.3;
const LAST_SIZE = 380;
const LAST_SHAKE = 0.9;
// it zigzags down, landing this far either side of each bar's middle
const ZIGZAG = 0.3;

interface Stop {
  floor: Floor;
  // where along its bar it lands, from the bar's middle (floor space)
  dx: number;
  hit: boolean;
}

interface Ball {
  bornAt: number;
  // where it set off from and its heading, as fractions of the box
  fx: number;
  fy: number;
  dirX: number;
  dirY: number;
  // performance.now() it was tapped (Infinity until then) and where
  tappedAt: number;
  from: Point;
  stops: Stop[];
  // the walls it last bounced off, as fold counts, and the glints there
  foldX: number;
  foldY: number;
  glints: { x: number; y: number; at: number }[];
  path: (ms: number) => Point | null;
}

let getDeps: (() => FloorActionsDeps) | null = null;
let ball: Ball | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.bouncer, performance.now());
let width = 1;
let height = 1;
const at: Point = { x: 0, y: 0 };
const bend: Point = { x: 0, y: 0 };
const prev: Point = { x: 0, y: 0 };
const next: Point = { x: 0, y: 0 };

// the floor actions of the building on screen
export function wireBouncer(deps: () => FloorActionsDeps): void {
  getDeps = deps;
}

// once the last ball is gone, rolls to send another, like the mouse
export function updateBouncer(now: number): void {
  if (ball) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) startBall(now);
}

// sends a ball now (test button)
export function forceBouncer(): void {
  startBall(performance.now());
}

function startBall(now: number): void {
  const deps = getDeps?.();
  if (!deps || !barsInView(deps).length) return;
  const angle = (0.15 + Math.random() * 0.2) * Math.PI;
  const b: Ball = {
    bornAt: now,
    fx: Math.random(),
    fy: Math.random() * 0.5,
    dirX: Math.cos(angle) * (Math.random() < 0.5 ? -1 : 1),
    dirY: Math.sin(angle),
    tappedAt: Infinity,
    from: { x: 0, y: 0 },
    stops: [],
    foldX: 0,
    foldY: 0,
    glints: [],
    path: () => null,
  };
  b.path = (ms) => pathAt(b, ms);
  ball = b;
}

// v folded back and forth between 0 and span, and how many walls it's hit
function fold(v: number, span: number): { at: number; walls: number } {
  const walls = Math.floor(v / span);
  const u = v - walls * span;
  return { at: walls % 2 === 0 ? u : span - u, walls };
}

// where the bouncing ball is at ms, into `at`; the fold counts as well
function roamAt(b: Ball, ms: number): { walls: number; wallsY: number } {
  const left = MARGIN;
  const top = height * TOP;
  const spanX = Math.max(1, width - MARGIN * 2);
  const spanY = Math.max(1, height - MARGIN - top);
  const run = (ms - b.bornAt) * SPEED;
  const x = fold(b.fx * spanX + b.dirX * run + spanX * 1000, spanX);
  const y = fold(b.fy * spanY + b.dirY * run + spanY * 1000, spanY);
  at.x = left + x.at;
  at.y = top + y.at;
  return { walls: x.walls, wallsY: y.walls };
}

const isGround = (deps: FloorActionsDeps, floor: Floor) =>
  deps.floors.indexOf(floor) === 0;

// where stop k lands on screen, into p
function stopAt(deps: FloorActionsDeps, stop: Stop, p: Point): Point {
  barAt(deps, stop.floor, p);
  p.x += stop.dx;
  return p;
}

const hitAt = (b: Ball, k: number) => b.tappedAt + SQUASH_MS + (k + 1) * LEG_MS;

function pathAt(b: Ball, ms: number): Point | null {
  if (ms < b.tappedAt) {
    roamAt(b, ms);
    return at;
  }
  if (ms < b.tappedAt + SQUASH_MS) {
    at.x = b.from.x;
    at.y = b.from.y;
    return at;
  }
  const deps = getDeps?.();
  const k = Math.floor((ms - b.tappedAt - SQUASH_MS) / LEG_MS);
  if (!deps || k >= b.stops.length) return null;
  if (k === 0) {
    prev.x = b.from.x;
    prev.y = b.from.y;
  } else stopAt(deps, b.stops[k - 1], prev);
  stopAt(deps, b.stops[k], next);
  const t = (ms - b.tappedAt - SQUASH_MS - k * LEG_MS) / LEG_MS;
  bend.x = (prev.x + next.x) / 2;
  bend.y = Math.min(prev.y, next.y) - (k === 0 ? FIRST_LIFT : LIFT);
  return bezier(prev, bend, next, t * t, at);
}

function canTap(b: Ball, now: number): boolean {
  const age = now - b.bornAt;
  return (
    b.tappedAt === Infinity &&
    age >= IN_MS &&
    age < CONFIG.randomSpawns.bouncer.durationMs
  );
}

// whether the ball is under (x, y) now (gameCanvas screen units)
function ballUnder(x: number, y: number, now: number): boolean {
  const b = ball;
  if (!b || !canTap(b, now)) return false;
  roamAt(b, now - TAP_LAG_MS);
  prev.x = at.x;
  prev.y = at.y;
  roamAt(b, now);
  return tapHitsMoving(x, y, prev, at, HIT_RADIUS);
}

export function hitTestBouncer(x: number, y: number): boolean {
  return ballUnder(x, y, performance.now());
}

// turns the ball heavy and sends it down the bars; true if it was hit, so
// the press goes no further
export function tapBouncer(x: number, y: number): boolean {
  const now = performance.now();
  const deps = getDeps?.();
  const b = ball;
  if (!b || !deps || !ballUnder(x, y, now)) return false;
  b.tappedAt = now;
  b.from.x = at.x;
  b.from.y = at.y;
  b.stops = barsInView(deps).map((floor, k) => {
    const reach = getIncomeBarBox(isGround(deps, floor)).width * ZIGZAG;
    const side = k % 2 === 0 ? 1 : -1;
    return {
      floor,
      dx: side * reach * (0.6 + 0.4 * Math.random()),
      hit: false,
    };
  });
  shakeScreen(HIT_SHAKE / 2);
  return true;
}

// the ball slamming onto stop k's bar: its levels land
function slam(deps: FloorActionsDeps, stop: Stop, last: boolean): void {
  stop.hit = true;
  landBarLevels(deps, stop.floor, levelsFor(stop.floor));
  shakeScreen(last ? LAST_SHAKE : HIT_SHAKE);
  playBarExplosion(last ? 0.8 : 1 + 0.15 * Math.random());
}

// the ball, its glints and its slams, in gameCanvas's screen units (w x h),
// each frame
export function drawBouncer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
): void {
  width = w;
  height = h;
  const b = ball;
  const deps = getDeps?.();
  if (!b || !deps) return;
  const t = performance.now();
  const { durationMs, pulseMs } = CONFIG.randomSpawns.bouncer;
  const tapped = b.tappedAt !== Infinity;
  if (!tapped) {
    const walls = roamAt(b, t);
    if (walls.walls !== b.foldX || walls.wallsY !== b.foldY) {
      if (t - b.bornAt > IN_MS) b.glints.push({ x: at.x, y: at.y, at: t });
      b.foldX = walls.walls;
      b.foldY = walls.wallsY;
    }
  }
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  for (let i = b.glints.length - 1; i >= 0; i--) {
    const g = b.glints[i];
    const u = (t - g.at) / GLINT_MS;
    if (u >= 1) {
      b.glints.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = 1 - u;
    stampGlimmer(ctx, g.x, g.y, GLINT * (0.5 + u), g.at, COLOR.white);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  const last = b.stops.length - 1;
  let busy = false;
  b.stops.forEach((stop, k) => {
    const since = t - hitAt(b, k);
    if (since < 0) {
      busy = true;
      return;
    }
    if (!stop.hit) slam(deps, stop, k === last);
    if (since >= DETONATION_MS) return;
    busy = true;
    const size = k === last ? LAST_SIZE : HIT_SIZE;
    drawDetonation(ctx, stopAt(deps, stop, next), since, size, now);
  });
  if (tapped) {
    const heavy = clamp01((t - b.tappedAt) / SQUASH_MS);
    drawWisp(ctx, b.path, t, now, SIZE * (1 + HEAVY * heavy), heavy);
    if (!busy) ball = null;
    return;
  }
  const age = t - b.bornAt;
  const msLeft = durationMs - age;
  if (isSpawnGone(msLeft)) {
    ball = null;
    return;
  }
  const fade = spawnFade(msLeft, pulseMs, now);
  const grow = clamp01(age / IN_MS) * fade.scale;
  drawWisp(ctx, b.path, t, now, SIZE * grow, 0.3, fade.alpha);
}
