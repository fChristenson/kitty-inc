// the bouncy wisp: every so often a wisp hovers somewhere on the screen,
// bobbing. Tapped, it shoots off away from the finger; flicked, it shoots
// off the way of the flick, faster the harder the flick. It bounces round
// the screen off its edges and off every income bar and upgrade button in
// view, each hit a flash and a little cash into the total, slowing over
// CONFIG flightMs; then it dives into the total for a last payout. Left
// alone it blinks out after durationMs. Draws in screen space over the crit
// flash
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import {
  playBloop,
  playBubblePop,
  playJackpot,
  playSpawnNotice,
  playSwoosh,
} from "../../sound";
import { drawDetonation } from "../../shared/animationStyles/explosion";
import { bezier } from "../../shared/curves";
import { between, clamp01 } from "../../shared/easing";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import {
  boxesInView,
  payTotal,
  spawnGameDeps,
  type ScreenBox,
  type SpawnGame,
} from "../../shared/spawnGames";
import { stampGlimmer } from "../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { tapHits } from "../../shared/tapTarget";

const TAU = Math.PI * 2;
// where it hovers, as fractions of the screen, bobbing BOB screen units
const SPOT_X: [number, number] = [0.25, 0.75];
const SPOT_Y: [number, number] = [0.35, 0.75];
const BOB = 14;
const BOB_RATE = 0.004;
const WISP_SCALE = 1.4;
// what bounces: RADIUS of the wisp's drawn size
const RADIUS = 0.6;
// screen units a second off a tap, or off a flick (its speed times
// FLICK_GAIN, within FLICK_SPEED); a drag shorter than FLICK_MIN is a tap
const TAP_SPEED = 2_600;
const FLICK_SPEED: [number, number] = [2_000, 4_200];
const FLICK_GAIN = 1.3;
const FLICK_MIN = 40;
// it slows to SLOW_TO of its launch speed over flightMs
const SLOW_TO = 0.45;
// a hit counts once per HIT_GAP_MS (a corner is one hit, not two)
const HIT_GAP_MS = 50;
const HIT_SHAKE = 0.18;
const LAUNCH_SHAKE = 0.3;
const HIT_COINS: [number, number] = [1, 2];
const FLASH_SIZE = 90;
const FLASH_MS = 220;
const FLASHES = 12;
// the dive into the total, carried on by its speed (MOMENTUM seconds of it)
const DIVE_MS = 320;
const MOMENTUM = 0.12;
const FINAL_COINS: [number, number] = [20, 26];
const FINAL_SHAKE = 1.2;
const FINAL_BLAST = 300;
const END_MS = 900;
const MAX_STEP = 0.05;
// the trail: where it was over its last TRAIL frames
const TRAIL = 96;

interface Flash {
  x: number;
  y: number;
  at: number;
}

interface Run {
  // as fractions of the screen
  spot: Point;
  endAt: number;
  // the press: when, where it started and where the finger is now
  held: boolean;
  pressAt: number;
  press: Point;
  finger: Point;
  // the flight, in screen units (a second)
  launchedAt: number;
  pos: Point;
  vx: number;
  vy: number;
  lastT: number;
  lastHitAt: number;
  // the dive into the total: when, from where and how fast
  diveAt: number;
  from: Point;
  bend: Point;
  landed: boolean;
  flashes: Flash[];
  nextFlash: number;
}

let run: Run | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.bounce, performance.now());
// the screen as last drawn, in gameCanvas's screen units
let width = 1;
let height = 1;
let totalY = 0;
const boxes: ScreenBox[] = [];
const total: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const hit: Point = { x: 0, y: 0 };
// the trail's ring of times and spots, and where the last lookup got to
const trailT = new Float64Array(TRAIL);
const trailX = new Float32Array(TRAIL);
const trailY = new Float32Array(TRAIL);
let trailHead = 0;
let trailCount = 0;
let cursor = 0;

function updateBounce(now: number): void {
  if (run) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) startRun(performance.now());
}

function startRun(t: number): void {
  run = {
    spot: { x: between(SPOT_X), y: between(SPOT_Y) },
    endAt: t + CONFIG.randomSpawns.bounce.durationMs,
    held: false,
    pressAt: 0,
    press: { x: 0, y: 0 },
    finger: { x: 0, y: 0 },
    launchedAt: Infinity,
    pos: { x: 0, y: 0 },
    vx: 0,
    vy: 0,
    lastT: t,
    lastHitAt: -Infinity,
    diveAt: Infinity,
    from: { x: 0, y: 0 },
    bend: { x: 0, y: 0 },
    landed: false,
    flashes: Array.from({ length: FLASHES }, () => ({
      x: 0,
      y: 0,
      at: -Infinity,
    })),
    nextFlash: 0,
  };
  trailCount = 0;
  playSpawnNotice();
}

const trailAt = (k: number) => (trailHead - trailCount + k + TRAIL) % TRAIL;

function record(t: number, x: number, y: number): void {
  trailT[trailHead] = t;
  trailX[trailHead] = x;
  trailY[trailHead] = y;
  trailHead = (trailHead + 1) % TRAIL;
  trailCount = Math.min(trailCount + 1, TRAIL);
}

// where it was at ms, from the trail; null before the trail's start
function wispAt(ms: number): Point | null {
  if (trailCount === 0) return null;
  if (ms < trailT[trailAt(0)]) return null;
  if (cursor >= trailCount || ms < trailT[trailAt(cursor)]) cursor = 0;
  while (cursor + 1 < trailCount && trailT[trailAt(cursor + 1)] <= ms) cursor++;
  const a = trailAt(cursor);
  if (cursor + 1 >= trailCount) {
    spot.x = trailX[a];
    spot.y = trailY[a];
    return spot;
  }
  const b = trailAt(cursor + 1);
  const u = (ms - trailT[a]) / Math.max(1, trailT[b] - trailT[a]);
  spot.x = trailX[a] + (trailX[b] - trailX[a]) * u;
  spot.y = trailY[a] + (trailY[b] - trailY[a]) * u;
  return spot;
}

const idleX = (r: Run) => r.spot.x * width;
const idleY = (r: Run, t: number) =>
  r.spot.y * height + Math.sin(t * BOB_RATE) * BOB;
const radius = () => WISP_SIZE * WISP_SCALE * RADIUS;

function hitsWisp(x: number, y: number, t: number): boolean {
  const r = run;
  if (!r || r.launchedAt !== Infinity || isSpawnGone(r.endAt - t)) return false;
  hit.x = idleX(r);
  hit.y = idleY(r, t);
  return tapHits(x, y, hit, WISP_SIZE * WISP_SCALE);
}

function press(x: number, y: number): boolean {
  const t = performance.now();
  if (!hitsWisp(x, y, t)) return false;
  const r = run!;
  r.held = true;
  r.pressAt = t;
  r.press.x = r.finger.x = x;
  r.press.y = r.finger.y = y;
  r.endAt = Infinity;
  return true;
}

function move(x: number, y: number): void {
  if (!run?.held) return;
  run.finger.x = x;
  run.finger.y = y;
}

// off the way of a flick, or away from a tap
function release(): void {
  const r = run;
  if (!r?.held) return;
  const t = performance.now();
  r.held = false;
  r.pos.x = idleX(r);
  r.pos.y = idleY(r, t);
  let dx = r.finger.x - r.press.x;
  let dy = r.finger.y - r.press.y;
  let length = Math.hypot(dx, dy);
  let speed = TAP_SPEED;
  if (length >= FLICK_MIN) {
    const perSecond = (length / Math.max(16, t - r.pressAt)) * 1000;
    speed = Math.min(
      FLICK_SPEED[1],
      Math.max(FLICK_SPEED[0], perSecond * FLICK_GAIN),
    );
  } else {
    dx = r.pos.x - r.press.x;
    dy = r.pos.y - r.press.y;
    length = Math.hypot(dx, dy);
    if (length < 8) {
      const a = Math.random() * TAU;
      dx = Math.cos(a);
      dy = Math.sin(a);
      length = 1;
    }
  }
  r.vx = (dx / length) * speed;
  r.vy = (dy / length) * speed;
  r.launchedAt = t;
  r.lastT = t;
  flash(r, r.pos.x, r.pos.y, t);
  shakeScreen(LAUNCH_SHAKE);
  playSwoosh();
}

function flash(r: Run, x: number, y: number, t: number): void {
  const f = r.flashes[r.nextFlash];
  r.nextFlash = (r.nextFlash + 1) % FLASHES;
  f.x = x;
  f.y = y;
  f.at = t;
}

function pay(r: Run, x: number, y: number, t: number, wall: boolean): void {
  if (t - r.lastHitAt < HIT_GAP_MS) return;
  r.lastHitAt = t;
  hit.x = x;
  hit.y = y;
  const deps = spawnGameDeps();
  if (deps)
    payTotal(deps, CONFIG.randomSpawns.bounce.hitSeconds, hit, HIT_COINS);
  flash(r, x, y, t);
  shakeScreen(HIT_SHAKE);
  if (wall) playBubblePop();
  else playBloop();
}

// off every box it touches, along the box's nearest edge
function bounceOffBoxes(r: Run, count: number, t: number): void {
  const rad = radius();
  for (let i = 0; i < count; i++) {
    const b = boxes[i];
    const cx = Math.min(b.x + b.w, Math.max(b.x, r.pos.x));
    const cy = Math.min(b.y + b.h, Math.max(b.y, r.pos.y));
    let nx = r.pos.x - cx;
    let ny = r.pos.y - cy;
    const d2 = nx * nx + ny * ny;
    if (d2 >= rad * rad) continue;
    let d = Math.sqrt(d2);
    if (d < 0.001) {
      // its middle is inside: out through the nearest side
      const left = r.pos.x - b.x;
      const right = b.x + b.w - r.pos.x;
      const top = r.pos.y - b.y;
      const bottom = b.y + b.h - r.pos.y;
      const least = Math.min(left, right, top, bottom);
      nx = least === left ? -1 : least === right ? 1 : 0;
      ny = least === top ? -1 : least === bottom ? 1 : 0;
      d = 0;
    } else {
      nx /= d;
      ny /= d;
    }
    const along = r.vx * nx + r.vy * ny;
    if (along < 0) {
      r.vx -= 2 * along * nx;
      r.vy -= 2 * along * ny;
      pay(r, cx, cy, t, false);
    }
    r.pos.x = cx + nx * rad;
    r.pos.y = cy + ny * rad;
  }
}

function bounceOffWalls(r: Run, t: number): void {
  const rad = radius();
  if (r.pos.x < rad && r.vx < 0) {
    r.pos.x = rad;
    r.vx = -r.vx;
    pay(r, 0, r.pos.y, t, true);
  } else if (r.pos.x > width - rad && r.vx > 0) {
    r.pos.x = width - rad;
    r.vx = -r.vx;
    pay(r, width, r.pos.y, t, true);
  }
  if (r.pos.y < rad && r.vy < 0) {
    r.pos.y = rad;
    r.vy = -r.vy;
    pay(r, r.pos.x, 0, t, true);
  } else if (r.pos.y > height - rad && r.vy > 0) {
    r.pos.y = height - rad;
    r.vy = -r.vy;
    pay(r, r.pos.x, height, t, true);
  }
}

function fly(r: Run, t: number): void {
  const { flightMs, finalSeconds } = CONFIG.randomSpawns.bounce;
  const dt = Math.min(MAX_STEP, (t - r.lastT) / 1000);
  r.lastT = t;
  if (t - r.launchedAt >= flightMs) {
    r.diveAt = t;
    r.from.x = r.pos.x;
    r.from.y = r.pos.y;
    r.bend.x = r.pos.x + r.vx * MOMENTUM;
    r.bend.y = r.pos.y + r.vy * MOMENTUM;
    const deps = spawnGameDeps();
    if (deps) payTotal(deps, finalSeconds, r.pos, FINAL_COINS);
    playSwoosh();
    return;
  }
  const slow = Math.exp((Math.log(SLOW_TO) * dt * 1000) / flightMs);
  r.vx *= slow;
  r.vy *= slow;
  const deps = spawnGameDeps();
  const count = deps ? boxesInView(deps, boxes) : 0;
  const steps = Math.max(
    1,
    Math.ceil((Math.hypot(r.vx, r.vy) * dt) / (radius() * 0.5)),
  );
  const sub = dt / steps;
  for (let s = 0; s < steps; s++) {
    r.pos.x += r.vx * sub;
    r.pos.y += r.vy * sub;
    bounceOffBoxes(r, count, t);
    bounceOffWalls(r, t);
  }
}

function glimmer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  turn: number,
): void {
  if (size <= 0 || alpha <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  stampGlimmer(ctx, x, y, size, turn, COLOR.white);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

function drawBounce(
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
  const msLeft = r.endAt - t;
  if (isSpawnGone(msLeft) || (r.landed && t > r.diveAt + DIVE_MS + END_MS)) {
    run = null;
    return;
  }
  total.x = w / 2;
  total.y = totalY;
  let x = idleX(r);
  let y = idleY(r, t);
  if (r.diveAt !== Infinity) {
    const u = clamp01((t - r.diveAt) / DIVE_MS);
    const at = bezier(r.from, r.bend, total, u * u, hit);
    x = at.x;
    y = at.y;
    if (u >= 1 && !r.landed) {
      r.landed = true;
      shakeScreen(FINAL_SHAKE);
      playJackpot();
    }
  } else if (r.launchedAt !== Infinity) {
    fly(r, t);
    x = r.pos.x;
    y = r.pos.y;
  }
  if (!r.landed) record(t, x, y);
  const fade = spawnFade(msLeft, CONFIG.randomSpawns.bounce.pulseMs, now);
  const idle = r.launchedAt === Infinity;
  if (idle) {
    const pulse = FLASH_SIZE * (1 + 0.15 * Math.sin(now * 0.008));
    glimmer(ctx, x, y, pulse, 0.25 * fade.alpha, now * 0.002);
  }
  drawWisp(
    ctx,
    wispAt,
    t,
    now,
    WISP_SIZE * WISP_SCALE * fade.scale * (r.landed ? 0 : 1),
    idle ? 0.3 : 1,
    fade.alpha,
  );
  for (let i = 0; i < FLASHES; i++) {
    const f = r.flashes[i];
    const p = (t - f.at) / FLASH_MS;
    if (p < 0 || p >= 1) continue;
    glimmer(ctx, f.x, f.y, FLASH_SIZE * (0.5 + p), 1 - p, f.at);
  }
  if (r.landed)
    drawDetonation(ctx, total, t - r.diveAt - DIVE_MS, FINAL_BLAST, now);
}

export default {
  force: () => startRun(performance.now()),
  update: updateBounce,
  drawOver: drawBounce,
  press,
  move,
  release,
  hitTest: (x, y) => hitsWisp(x, y, performance.now()),
} satisfies SpawnGame;
