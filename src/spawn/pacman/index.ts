// pacman: every so often a wisp darts in along straight runs with sharp
// turns, like Pac-Man, leaving a trail of lights behind it, and dives into a
// badge where it stops.
// Tracing its path with a finger eats the lights one by one; eat the last
// without straying and the badge is won. Lifting the finger or wandering off the path
// lights the path up again to try from the start. Untraced, it blinks and
// vanishes like every spawn
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { pickBadge } from "../../crits";
import {
  playBloop,
  playCoinAppear,
  playJackpot,
  playSwoosh,
} from "../../sound";
import { clamp01, lerp } from "../../shared/easing";
import { drawDetonation } from "../../shared/explosion";
import { drawBadgeLights } from "../../shared/badgeLights";
import { beginLightBatch, endLightBatch } from "../../shared/lightBatch";
import { shakeScreen } from "../../shared/screenShake";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import {
  collectPrize,
  drawMini,
  pickSpawnFloor,
  prepareMini,
  type Prize,
} from "../../shared/spawnPrize";
import { registerSpawnGame, spawnGameDeps } from "../../shared/spawnGames";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { swipeHits, tapHits } from "../../shared/tapTarget";
import { stampGlimmer } from "../../shared/twinkle";
import {
  drawWispBetween,
  WISP_SIZE,
  WISP_TRAIL_MS,
  type Point,
} from "../../shared/wisp";

// the route: like Pac-Man's, straight runs with right-angle turns: in from a
// side, then across and up or down in turn, TURNS runs (shares of the
// screen's width, and of its height below the HUD), onto the badge
const TURNS = 6;
const SIDE_X: [number, number] = [0.14, 0.86];
const TOP_Y = 0.22;
const BOTTOM_Y = 0.85;
const OFF_SIDE = 0.12;
const MIN_RUN_X = 0.3;
const MIN_RUN_Y = 0.12;
const ROUTE_SAMPLES = 360;
// a light every DOT_GAP along it, DOT big; the finger's swipe eats every
// light up to the furthest of the next LOOKAHEAD it passes within DOT_REACH
// of, and strays off the path past STRAY from it
const DOT_GAP = 70;
const DOT = 36;
const DOT_CORE = 7;
const DOT_REACH = 60;
const LOOKAHEAD = 3;
const STRAY = 200;
const LIGHT_UP_MS = 160;
const EATEN_MS = 220;
const EATEN_SIZE = 70;
// the badge at the end, and the wisp diving into it
const BADGE = 120;
const BADGE_PULSE = 0.06;
const BADGE_PULSE_RATE = 0.008;
// the badge lights' radius, of the badge's size
const BADGE_LIGHTS = 1.65;
const WISP = WISP_SIZE * 1.3;
const POP = 160;
const WIN_BLAST = 320;
const WIN_SHAKE = 2.4;
const STRAY_SHAKE = 0.6;

interface Run {
  bornAt: number;
  // the route, evenly spaced, and its lights' spots, when the wisp passes
  // each, and when each was eaten (-1 uneaten)
  xs: Float32Array;
  ys: Float32Array;
  dots: Point[];
  litAt: Float32Array;
  eatenAt: Float32Array;
  eaten: number;
  tracing: boolean;
  chimed: boolean;
  wonAt: number;
  prize: Prize;
}

let run: Run | null = null;
const roll = createSpawnRoll(CONFIG.randomSpawns.pacman, performance.now());
const wisp: Point = { x: 0, y: 0 };
const badge: Point = { x: 0, y: 0 };
let lastX = 0;
let lastY = 0;
// the screen's size as last drawn, for a spawn started between frames
let drawnW = 0;
let drawnH = 0;
// started before the screen's size was known: starts on the next frame
let startPending = false;

// a spot in range at least `min` away from `from`, the last try if none is
function runTo(from: number, range: [number, number], min: number): number {
  let to = from;
  for (let k = 0; k < 12; k++) {
    to = lerp(range, Math.random());
    if (Math.abs(to - from) >= min) break;
  }
  return to;
}

function planRoute(w: number, h: number): Point[] {
  const fromRight = Math.random() < 0.5;
  const ys: [number, number] = [h * TOP_Y, h * BOTTOM_Y];
  const xs: [number, number] = [w * SIDE_X[0], w * SIDE_X[1]];
  let x = fromRight ? w * (1 + OFF_SIDE) : -w * OFF_SIDE;
  let y = lerp(ys, Math.random());
  const route: Point[] = [{ x, y }];
  for (let k = 0; k < TURNS; k++) {
    if (k % 2 === 0) x = runTo(x, xs, w * MIN_RUN_X);
    else y = runTo(y, ys, h * MIN_RUN_Y);
    route.push({ x, y });
  }
  return route;
}

function start(now: number): void {
  const deps = spawnGameDeps();
  const w = drawnW;
  const h = drawnH;
  if (w <= 0 || h <= 0) {
    startPending = true;
    return;
  }
  if (!deps) return;
  const route = planRoute(w, h);
  // the route spaced evenly along its length
  const lengths: number[] = [0];
  for (let k = 1; k < route.length; k++)
    lengths.push(
      lengths[k - 1] +
        Math.hypot(route[k].x - route[k - 1].x, route[k].y - route[k - 1].y),
    );
  const length = lengths[route.length - 1];
  const xs = new Float32Array(ROUTE_SAMPLES + 1);
  const ys = new Float32Array(ROUTE_SAMPLES + 1);
  let j = 0;
  for (let i = 0; i <= ROUTE_SAMPLES; i++) {
    const d = (length * i) / ROUTE_SAMPLES;
    while (j < route.length - 2 && lengths[j + 1] < d) j++;
    const span = lengths[j + 1] - lengths[j] || 1;
    const t = clamp01((d - lengths[j]) / span);
    xs[i] = route[j].x + (route[j + 1].x - route[j].x) * t;
    ys[i] = route[j].y + (route[j + 1].y - route[j].y) * t;
  }
  // lights only on screen, from where the route comes in to the badge
  const { dashMs } = CONFIG.randomSpawns.pacman;
  const dots: Point[] = [];
  const lit: number[] = [];
  for (let d = DOT_GAP; d < length - BADGE * 0.6; d += DOT_GAP) {
    const i = Math.round((d / length) * ROUTE_SAMPLES);
    if (xs[i] < 0 || xs[i] > w) continue;
    dots.push({ x: xs[i], y: ys[i] });
    lit.push((d / length) * dashMs);
  }
  if (!dots.length) return;
  const prize: Prize = { kind: "badge", badge: pickBadge() };
  prepareMini(prize);
  run = {
    bornAt: now,
    xs,
    ys,
    dots,
    litAt: Float32Array.from(lit),
    eatenAt: new Float32Array(dots.length).fill(-1),
    eaten: 0,
    tracing: false,
    chimed: false,
    wonAt: -1,
    prize,
  };
  playSwoosh();
}

// lays a path (test button)
export function forcePacmanSpawn(): void {
  start(performance.now());
}

// the wisp's spot at ms into its dash, null outside it
function wispAt(ms: number): Point | null {
  const r = run;
  const { dashMs } = CONFIG.randomSpawns.pacman;
  if (!r || ms < 0 || ms > dashMs) return null;
  const i = Math.round((ms / dashMs) * ROUTE_SAMPLES);
  wisp.x = r.xs[i];
  wisp.y = r.ys[i];
  return wisp;
}

function placeBadge(r: Run): Point {
  badge.x = r.xs[ROUTE_SAMPLES];
  badge.y = r.ys[ROUTE_SAMPLES];
  return badge;
}
const laid = (r: Run, now: number) =>
  now - r.bornAt >= CONFIG.randomSpawns.pacman.dashMs;
const live = (r: Run, now: number) =>
  r.wonAt < 0 &&
  laid(r, now) &&
  now - r.bornAt < CONFIG.randomSpawns.pacman.durationMs;

function relight(r: Run, now: number): void {
  if (r.eaten === 0) return;
  r.eaten = 0;
  r.eatenAt.fill(-1);
  const age = now - r.bornAt;
  for (let i = 0; i < r.litAt.length; i++) r.litAt[i] = age + i * 20;
  shakeScreen(STRAY_SHAKE);
}

// how far (x, y) is from the path, from the last light eaten to a few ahead
function strayFrom(r: Run, x: number, y: number): number {
  const first = Math.max(0, r.eaten - 1);
  const last = Math.min(r.dots.length - 1, r.eaten + LOOKAHEAD);
  let best = Math.hypot(x - r.dots[first].x, y - r.dots[first].y);
  for (let i = first; i < last; i++) {
    const from = r.dots[i];
    const to = r.dots[i + 1];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = clamp01(((x - from.x) * dx + (y - from.y) * dy) / len2);
    best = Math.min(best, Math.hypot(x - from.x - dx * t, y - from.y - dy * t));
  }
  return best;
}

// the furthest of the next LOOKAHEAD lights the swipe passes, -1 if none
function reached(
  r: Run,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const last = Math.min(r.dots.length, r.eaten + LOOKAHEAD) - 1;
  for (let i = last; i >= r.eaten; i--)
    if (swipeHits(x0, y0, x1, y1, r.dots[i], DOT_REACH)) return i;
  return -1;
}

function hitTest(x: number, y: number, now: number): boolean {
  const r = run;
  if (!r || !live(r, now)) return false;
  return tapHits(x, y, r.dots[0], DOT_REACH);
}

function press(x: number, y: number, now: number): boolean {
  const r = run;
  if (!r || !hitTest(x, y, now)) return false;
  r.tracing = true;
  lastX = x;
  lastY = y;
  move(x, y, now);
  return true;
}

function win(r: Run, now: number): void {
  r.wonAt = now;
  r.tracing = false;
  const deps = spawnGameDeps();
  const floor = deps && pickSpawnFloor(deps);
  if (deps && floor)
    collectPrize(
      deps,
      floor,
      r.prize,
      { x: r.xs[ROUTE_SAMPLES], y: r.ys[ROUTE_SAMPLES] },
      drawnH,
      BADGE,
      now,
      0,
    );
  shakeScreen(WIN_SHAKE);
  playJackpot();
}

function move(x: number, y: number, now: number): void {
  const r = run;
  if (!r || !r.tracing || !live(r, now)) return;
  for (let to = reached(r, lastX, lastY, x, y); to >= 0; ) {
    while (r.eaten <= to) r.eatenAt[r.eaten++] = now - r.bornAt;
    playBloop();
    to = reached(r, lastX, lastY, x, y);
  }
  lastX = x;
  lastY = y;
  if (r.eaten >= r.dots.length) {
    win(r, now);
    return;
  }
  if (strayFrom(r, x, y) > STRAY) {
    r.tracing = false;
    relight(r, now);
  }
}

function release(now: number): void {
  const r = run;
  if (!r || r.wonAt >= 0) return;
  r.tracing = false;
  relight(r, now);
}

function update(now: number): void {
  if (run) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) start(now);
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _totalAtY: number,
  now: number,
): void {
  drawnW = w;
  drawnH = h;
  if (startPending) {
    startPending = false;
    start(now);
  }
  const r = run;
  if (!r) return;
  const age = now - r.bornAt;
  const { durationMs, pulseMs, dashMs } = CONFIG.randomSpawns.pacman;
  const msLeft = r.wonAt >= 0 ? 1 : durationMs - age;
  if (isSpawnGone(msLeft) || (r.wonAt >= 0 && now - r.wonAt > 1000)) {
    run = null;
    return;
  }
  const fade = spawnFade(msLeft, pulseMs, now);
  const won = r.wonAt >= 0 ? now - r.wonAt : -1;

  // the lights, lit as the wisp passes, popping as they're eaten
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < r.dots.length; i++) {
    const lit = age - r.litAt[i];
    if (lit < 0) continue;
    const d = r.dots[i];
    const eaten = r.eatenAt[i];
    if (eaten >= 0) {
      const t = (age - eaten) / EATEN_MS;
      if (t < 1)
        stampGlimmer(ctx, d.x, d.y, EATEN_SIZE * (1 - t), i, COLOR.white);
      continue;
    }
    if (won >= 0) continue;
    const grow = clamp01(lit / LIGHT_UP_MS);
    stampGlimmer(
      ctx,
      d.x,
      d.y,
      DOT * grow * fade.scale * (0.85 + 0.15 * Math.sin(now * 0.01 + i)),
      i + now * 0.002,
      COLOR.heavenlyGold,
    );
  }
  endLightBatch(ctx);
  ctx.restore();
  if (won < 0) {
    ctx.save();
    ctx.globalAlpha = fade.alpha;
    ctx.fillStyle = COLOR.white;
    for (let i = r.eaten; i < r.dots.length; i++) {
      if (age < r.litAt[i]) break;
      ctx.beginPath();
      ctx.arc(r.dots[i].x, r.dots[i].y, DOT_CORE * fade.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // the wisp laying the path, then the badge it dives into
  if (age < dashMs + WISP_TRAIL_MS)
    drawWispBetween(ctx, wispAt, age, now, WISP, 1, 0, dashMs);
  const at = placeBadge(r);
  if (age >= dashMs && won < 0) {
    const pop = age - dashMs;
    if (!r.chimed) {
      r.chimed = true;
      playCoinAppear();
    }
    const size =
      BADGE *
      fade.scale *
      Math.min(1, pop / 120) *
      (1 + BADGE_PULSE * Math.sin(now * BADGE_PULSE_RATE));
    ctx.save();
    ctx.globalAlpha = fade.alpha;
    drawBadgeLights(ctx, at.x, at.y, size * BADGE_LIGHTS, pop, now);
    drawMini(ctx, r.prize, at.x, at.y, size);
    ctx.restore();
    drawDetonation(ctx, at, pop, POP, now);
  }
  if (won >= 0) drawDetonation(ctx, at, won, WIN_BLAST, now);
}

registerSpawnGame({ update, draw, press, move, release, hitTest });
