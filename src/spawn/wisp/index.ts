// the wisp: every so often, like the mouse and the bubbles, a wisp crosses
// the screen spraying glitter out to both sides behind it like a boat's wake
// (on a dash, loop-de-loops, rows, a spiral or a figure eight, now and then
// popping rings of glitter out round itself). The glitter lingers
// for CONFIG.randomSpawns.wisp.durationMs, blinking before it fades; a swipe
// through it sweeps it up, every speck flying into the total income and
// paying its share of the wisp's reward as it lands.
//
// gameCanvas ticks the spawn timer (updateWispSpawn), sweeps it along every
// drag (sweepWispGlitter) and draws it in screen space over the HUD
// (drawWispSpawn)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playCoinDrop, playSwoosh } from "../../sound";
import { getActiveCompanyIndex } from "../../company";
import {
  addTotalIncome,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import { multiply, type BigNumber } from "../../shared/bigNumber";
import { alongRoute, bezier } from "../../shared/curves";
import { between, clamp01, easeOutCubic, lerp } from "../../shared/easing";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { stampGlimmer } from "../../shared/twinkle";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import { urgentBlink } from "../../shared/urgentBlink";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { swipeHits, tapHits } from "../../shared/tapTarget";

// the dash: in from one side through a few spots across the screen, out the
// other side; the other paths are sized in fractions of the screen's
// shorter side
const STOPS = 5;
const DASH_Y: [number, number] = [0.3, 0.85];
const WISP_SCALE = 1.4;
// loop-de-loops thrown into a dash at a few of its stops
const LOOPS: [number, number] = [1, 3];
const LOOP_R: [number, number] = [0.09, 0.15];
const LOOP_POINTS = 8;
// back and forth down the screen like a mower
const ROWS = 3;
// round and round into a middle, then out
const SPIRAL_R: [number, number] = [0.42, 0.07];
const SPIRAL_TURNS = 2.2;
const SPIRAL_POINTS = 30;
// a sideways eight across the middle
const EIGHT_SIZE: [number, number] = [0.4, 0.3];
const EIGHT_POINTS = 20;
// the whole path at one speed: the plain dash (about this many screen widths
// long) takes CONFIG's dashMs, longer paths longer, up to maxDashMs
const DASH_WIDTHS = 1.3;
const EVEN_STEP = 10;
const FINE = 24;
// now and then the wisp pops a ring of glitter out round itself
const BURST_CHANCE = 0.5;
const BURSTS: [number, number] = [1, 3];
const BURST_SPECKS = 14;
const BURST_R: [number, number] = [0.05, 0.17];
const BURST_MS = 260;
const BURST_FLASH = 90;
const BURST_FLASH_MS = 220;
const BURST_SHAKE = 0.3;
// the glitter it sheds: sprayed out to both sides of its path, sliding out
// and settling, thick near the path and fraying out to a reach (of the
// screen's shorter side) that differs every time
const WAKE_REACH: [number, number] = [0.1, 0.35];
const WAKE_NEAR = 8;
const WAKE_THIN = 1.4;
const WAKE_BACK: [number, number] = [10, 40];
const WAKE_SETTLE_MS: [number, number] = [250, 450];
const SPECK_SIZE: [number, number] = [14, 24];
const SPECK_POP_MS = 160;
const SPECK_FADE_MS = 300;
const SPECK_SPIN = 0.0015;
const COLORS = [COLOR.heavenlyGold, COLOR.wispGlitter, COLOR.white];
// swept specks hop off the swipe, then fly into the total
const FLY_MS: [number, number] = [380, 620];
const FLY_STAGGER_MS = 3;
const FLY_ARC = 0.35;
const FLY_GROW = 1.5;
const SWOOSH_GAP_MS = 150;
const DROP_GAP_MS = 45;
const CLEAR_SHAKE = 0.8;

interface Speck {
  // spot on the wisp's path as fractions of the screen, scattered off it by
  // (ox, oy) screen units
  fx: number;
  fy: number;
  ox: number;
  oy: number;
  // performance.now() the wisp drops it, and how long it takes to slide out
  // to its spot
  bornAt: number;
  spreadMs: number;
  size: number;
  seed: number;
  color: string;
  // performance.now() it was swept up (Infinity while lying), and from where
  sweptAt: number;
  flyMs: number;
  from: Point;
  paid: boolean;
}

interface Burst {
  fx: number;
  fy: number;
  at: number;
  fired: boolean;
}

interface Run {
  // as fractions of the screen, evenly spaced so the wisp keeps one speed
  route: Point[];
  dashMs: number;
  bursts: Burst[];
  startAt: number;
  // performance.now() the glitter starts to go (once the dash is done)
  fadeAt: number;
  specks: Speck[];
  share: BigNumber;
  left: number;
}

let run: Run | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.wisp, performance.now());
// the screen as last drawn, in gameCanvas's screen units
let width = 1;
let height = 1;
let totalY = 0;
let lastSwooshAt = -Infinity;
let lastDropAt = -Infinity;
const spot: Point = { x: 0, y: 0 };
const fly: Point = { x: 0, y: 0 };
const bend: Point = { x: 0, y: 0 };
const target: Point = { x: 0, y: 0 };

// once the last wisp is gone, rolls to send another, like the mouse
export function updateWispSpawn(now: number): void {
  if (run) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) startRun(now);
}

// sends a wisp across now (test button)
export function forceWispSpawn(): void {
  startRun(performance.now());
}

// the paths a wisp can take, in screen units; the dash is the plain one
const enterX = (fromLeft: boolean) => (fromLeft ? -0.1 : 1.1) * width;
const leaveX = (fromLeft: boolean) => (fromLeft ? 1.1 : -0.1) * width;
const randomInt = ([low, high]: [number, number]) =>
  low + Math.floor(Math.random() * (high - low + 1));

function dashPath(fromLeft: boolean): Point[] {
  const path: Point[] = [{ x: enterX(fromLeft), y: between(DASH_Y) * height }];
  for (let i = 1; i <= STOPS; i++) {
    const t = i / (STOPS + 1);
    path.push({
      x: (fromLeft ? t : 1 - t) * width,
      y: between(DASH_Y) * height,
    });
  }
  path.push({ x: leaveX(fromLeft), y: between(DASH_Y) * height });
  return path;
}

// a dash looping the loop at a few of its stops, up or down
function loopsPath(fromLeft: boolean, unit: number): Point[] {
  const dash = dashPath(fromLeft);
  const looped = new Set<number>();
  for (let n = randomInt(LOOPS); looped.size < n; ) {
    looped.add(1 + Math.floor(Math.random() * STOPS));
  }
  const dir = fromLeft ? 1 : -1;
  const path: Point[] = [];
  dash.forEach((stop, i) => {
    path.push(stop);
    if (!looped.has(i)) return;
    const r = between(LOOP_R) * unit;
    const up = stop.y > height * 0.5 ? 1 : -1;
    for (let k = 1; k <= LOOP_POINTS; k++) {
      const a = (k / LOOP_POINTS) * Math.PI * 2;
      path.push({
        x: stop.x + dir * r * Math.sin(a),
        y: stop.y - up * r * (1 - Math.cos(a)),
      });
    }
  });
  return path;
}

// back and forth across the screen in rows, top to bottom
function serpentinePath(fromLeft: boolean): Point[] {
  const path: Point[] = [];
  for (let row = 0; row < ROWS; row++) {
    const y = lerp(DASH_Y, row / (ROWS - 1)) * height;
    const rightward = fromLeft === (row % 2 === 0);
    const from = row === 0 ? enterX(fromLeft) : (rightward ? 0.1 : 0.9) * width;
    const to =
      row === ROWS - 1 ? leaveX(rightward) : (rightward ? 0.9 : 0.1) * width;
    path.push({ x: from, y }, { x: (from + to) / 2, y }, { x: to, y });
  }
  return path;
}

// in from the side, spiralling into a middle, then straight out
function spiralPath(fromLeft: boolean, unit: number): Point[] {
  const centre = {
    x: between([0.35, 0.65]) * width,
    y: between([0.5, 0.65]) * height,
  };
  const path: Point[] = [{ x: enterX(fromLeft), y: centre.y }];
  const start = fromLeft ? Math.PI : 0;
  const turn = Math.random() < 0.5 ? 1 : -1;
  for (let k = 0; k <= SPIRAL_POINTS; k++) {
    const t = k / SPIRAL_POINTS;
    const a = start + turn * t * SPIRAL_TURNS * Math.PI * 2;
    const r = lerp(SPIRAL_R, t) * unit;
    path.push({ x: centre.x + r * Math.cos(a), y: centre.y + r * Math.sin(a) });
  }
  path.push({ x: leaveX(fromLeft), y: between(DASH_Y) * height });
  return path;
}

// in to the middle, round a sideways eight, then out the far side
function eightPath(fromLeft: boolean, unit: number): Point[] {
  const centre = { x: width / 2, y: between([0.5, 0.65]) * height };
  const across = EIGHT_SIZE[0] * width;
  const tall = EIGHT_SIZE[1] * unit;
  const dir = fromLeft ? 1 : -1;
  const flip = Math.random() < 0.5 ? 1 : -1;
  const path: Point[] = [{ x: enterX(fromLeft), y: centre.y }];
  for (let k = 0; k <= EIGHT_POINTS; k++) {
    const a = (k / EIGHT_POINTS) * Math.PI * 2;
    path.push({
      x: centre.x + dir * across * Math.sin(a),
      y: centre.y + flip * tall * Math.sin(a) * Math.cos(a),
    });
  }
  path.push({ x: leaveX(fromLeft), y: centre.y });
  return path;
}

const PATHS: ((fromLeft: boolean, unit: number) => Point[])[] = [
  dashPath,
  loopsPath,
  serpentinePath,
  spiralPath,
  eightPath,
];

// the path redrawn as points an even step apart (so alongRoute keeps one
// speed), as fractions of the screen, and its length in screen units
function evenRoute(path: Point[]): { route: Point[]; length: number } {
  const samples = (path.length - 1) * FINE;
  const at: Point = { x: 0, y: 0 };
  const route: Point[] = [{ x: path[0].x / width, y: path[0].y / height }];
  let length = 0;
  let next = EVEN_STEP;
  let px = path[0].x;
  let py = path[0].y;
  for (let i = 1; i <= samples; i++) {
    alongRoute(path, i / samples, at);
    length += Math.hypot(at.x - px, at.y - py);
    px = at.x;
    py = at.y;
    if (length >= next || i === samples) {
      route.push({ x: at.x / width, y: at.y / height });
      next += EVEN_STEP;
    }
  }
  return { route, length };
}

const onScreen = (fx: number, fy: number) =>
  fx > 0.03 && fx < 0.97 && fy > 0.05 && fy < 0.97;

function makeSpeck(
  fx: number,
  fy: number,
  ox: number,
  oy: number,
  bornAt: number,
  spreadMs: number,
  i: number,
): Speck {
  return {
    fx,
    fy,
    ox,
    oy,
    bornAt,
    spreadMs,
    size: between(SPECK_SIZE),
    seed: Math.random() * 1000,
    color: COLORS[i % COLORS.length],
    sweptAt: Infinity,
    flyMs: between(FLY_MS),
    from: { x: 0, y: 0 },
    paid: false,
  };
}

function startRun(now: number): void {
  const {
    dashMs: plainMs,
    maxDashMs,
    durationMs,
    specks: count,
    rewardSeconds,
  } = CONFIG.randomSpawns.wisp;
  const fromLeft = Math.random() < 0.5;
  const unit = Math.min(width, height);
  const path = PATHS[Math.floor(Math.random() * PATHS.length)](fromLeft, unit);
  const { route, length } = evenRoute(path);
  const dashMs = Math.min(
    maxDashMs,
    (plainMs * length) / (DASH_WIDTHS * width),
  );
  const specks: Speck[] = [];
  const bursts: Burst[] = [];
  const at: Point = { x: 0, y: 0 };
  const burstCount = Math.random() < BURST_CHANCE ? randomInt(BURSTS) : 0;
  for (let b = 0; b < burstCount; b++) {
    const u = lerp([0.2, 0.85], (b + Math.random()) / burstCount);
    alongRoute(route, u, at);
    if (!onScreen(at.x, at.y)) continue;
    const burst = { fx: at.x, fy: at.y, at: now + u * dashMs, fired: false };
    bursts.push(burst);
    for (let i = 0; i < BURST_SPECKS; i++) {
      const a = ((i + Math.random() * 0.6) / BURST_SPECKS) * Math.PI * 2;
      const r = between(BURST_R) * unit;
      const ox = Math.cos(a) * r;
      const oy = Math.sin(a) * r;
      if (!onScreen(at.x + ox / width, at.y + oy / height)) continue;
      specks.push(makeSpeck(at.x, at.y, ox, oy, burst.at, BURST_MS, i));
    }
  }
  const reach = between(WAKE_REACH) * unit;
  const behind: Point = { x: 0, y: 0 };
  const ahead: Point = { x: 0, y: 0 };
  const dropped = count - specks.length;
  for (let i = 0; i < dropped; i++) {
    const u = (i + Math.random()) / dropped;
    alongRoute(route, u, at);
    alongRoute(route, Math.max(0, u - 0.004), behind);
    alongRoute(route, Math.min(1, u + 0.004), ahead);
    const tx = (ahead.x - behind.x) * width;
    const ty = (ahead.y - behind.y) * height;
    const along = Math.hypot(tx, ty) || 1;
    const side = i % 2 ? 1 : -1;
    const out = (WAKE_NEAR + reach * Math.random() ** WAKE_THIN) * side;
    const back = between(WAKE_BACK);
    const ox = (-ty * out - tx * back) / along;
    const oy = (tx * out - ty * back) / along;
    if (!onScreen(at.x + ox / width, at.y + oy / height)) continue;
    const settle = between(WAKE_SETTLE_MS);
    specks.push(makeSpeck(at.x, at.y, ox, oy, now + u * dashMs, settle, i));
  }
  const rate = getCompanyIncomeRatePerSecond(getActiveCompanyIndex());
  run = {
    route,
    dashMs,
    bursts,
    startAt: now,
    fadeAt: now + dashMs + durationMs,
    specks,
    share: multiply(rate, rewardSeconds / Math.max(1, specks.length)),
    left: specks.length,
  };
}

// a speck lying on the screen at now, ready to be swept
const isLying = (speck: Speck, now: number, fadeAt: number) =>
  speck.sweptAt === Infinity && now >= speck.bornAt && now < fadeAt;
const speckX = (speck: Speck) => speck.fx * width + speck.ox;
const speckY = (speck: Speck) => speck.fy * height + speck.oy;
const speckAt = (speck: Speck): Point => {
  spot.x = speckX(speck);
  spot.y = speckY(speck);
  return spot;
};

// whether a press at (x, y) (gameCanvas screen units) lands on glitter
export function hitTestWispGlitter(x: number, y: number): boolean {
  const now = performance.now();
  if (!run) return false;
  for (const speck of run.specks) {
    if (!isLying(speck, now, run.fadeAt)) continue;
    if (tapHits(x, y, speckAt(speck), speck.size / 2)) return true;
  }
  return false;
}

// a swipe from (x0, y0) to (x1, y1) sweeping up the glitter it passes over
export function sweepWispGlitter(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  if (!run) return;
  const now = performance.now();
  let swept = 0;
  for (const speck of run.specks) {
    if (!isLying(speck, now, run.fadeAt)) continue;
    const at = speckAt(speck);
    if (!swipeHits(x0, y0, x1, y1, at, speck.size / 2)) continue;
    speck.sweptAt = now + swept++ * FLY_STAGGER_MS;
    speck.from.x = at.x;
    speck.from.y = at.y;
  }
  if (swept > 0 && now - lastSwooshAt > SWOOSH_GAP_MS) {
    lastSwooshAt = now;
    playSwoosh();
  }
}

// a swept speck flying into the total: hopping up off the swipe, then pulled
// in faster and faster
function flightAt(speck: Speck, t: number, into: Point): Point {
  target.x = width / 2;
  target.y = totalY;
  bend.x = speck.from.x + (target.x - speck.from.x) * 0.2;
  bend.y = Math.min(speck.from.y, target.y) - height * FLY_ARC * 0.5;
  return bezier(speck.from, bend, target, t * t, into);
}

function pay(r: Run, speck: Speck, now: number): void {
  speck.paid = true;
  r.left--;
  addTotalIncome(r.share);
  pulseHudTotalFlash();
  if (now - lastDropAt > DROP_GAP_MS) {
    lastDropAt = now;
    playCoinDrop();
  }
  if (r.left === 0) shakeScreen(CLEAR_SHAKE);
}

// the wisp and its glitter, in gameCanvas's screen units (w x h, the total's
// middle at totalAtY), each frame
export function drawWispSpawn(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  totalAtY: number,
  now: number,
): void {
  width = w;
  height = h;
  totalY = totalAtY;
  const r = run;
  if (!r) return;
  const t = performance.now();
  const { pulseMs } = CONFIG.randomSpawns.wisp;
  const { dashMs } = r;
  const ms = t - r.startAt;
  drawWispBetween(
    ctx,
    (at) => {
      alongRoute(r.route, clamp01(at / dashMs), spot);
      spot.x *= w;
      spot.y *= h;
      return spot;
    },
    ms,
    now,
    WISP_SIZE * WISP_SCALE,
    0.4,
    0,
    dashMs,
  );
  let alive = false;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  for (const burst of r.bursts) {
    const since = t - burst.at;
    if (since < 0 || since > BURST_FLASH_MS) continue;
    if (!burst.fired) {
      burst.fired = true;
      shakeScreen(BURST_SHAKE);
    }
    const p = since / BURST_FLASH_MS;
    ctx.globalAlpha = 1 - p;
    stampGlimmer(
      ctx,
      burst.fx * w,
      burst.fy * h,
      BURST_FLASH * (0.5 + p),
      burst.at,
      COLOR.white,
    );
  }
  const blink = urgentBlink(r.fadeAt - t, pulseMs, now);
  for (const speck of r.specks) {
    if (speck.paid || t < speck.bornAt) {
      alive ||= !speck.paid;
      continue;
    }
    const spin = speck.seed + t * SPECK_SPIN;
    const twinkle = 0.75 + 0.25 * Math.sin(t * 0.008 + speck.seed);
    if (speck.sweptAt !== Infinity) {
      alive = true;
      ctx.globalAlpha = 1;
      if (t < speck.sweptAt) {
        const { x, y } = speck.from;
        stampGlimmer(ctx, x, y, speck.size * twinkle, spin, speck.color);
        continue;
      }
      const p = (t - speck.sweptAt) / speck.flyMs;
      if (p >= 1) {
        pay(r, speck, t);
        continue;
      }
      flightAt(speck, p, fly);
      stampGlimmer(
        ctx,
        fly.x,
        fly.y,
        speck.size * (1 + (FLY_GROW - 1) * Math.sin(Math.PI * p)),
        spin,
        speck.color,
      );
      continue;
    }
    const fade = 1 - (t - r.fadeAt) / SPECK_FADE_MS;
    if (fade <= 0) continue;
    alive = true;
    const pop = clamp01((t - speck.bornAt) / SPECK_POP_MS);
    const spread = easeOutCubic(clamp01((t - speck.bornAt) / speck.spreadMs));
    ctx.globalAlpha = Math.min(1, fade) * blink;
    stampGlimmer(
      ctx,
      speck.fx * w + speck.ox * spread,
      speck.fy * h + speck.oy * spread,
      speck.size * pop * (2 - pop) * twinkle,
      spin,
      speck.color,
    );
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  if (!alive && ms > dashMs) run = null;
}
