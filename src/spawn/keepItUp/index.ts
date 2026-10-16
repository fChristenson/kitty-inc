// keep it up: every so often a wisp twirls back and forth low on the screen
// and a gold coin glints at the top, then drops towards it. Press and hold
// and the wisp darts to the finger and sweeps back and forth so fast it
// draws a solid line of light under it; the coin bounces off the line,
// paying a little more each bounce, and arcs off to land somewhere else,
// quicker each time, the line following the finger. After CONFIG bounces the
// last one sends it flying into the total; miss it and it falls off the
// screen. Draws in screen space over the crit flash
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import {
  playBloop,
  playJackpot,
  playSpawnNotice,
  playSwoosh,
} from "../../sound";
import { drawBeam } from "../../shared/animationStyles/beam";
import { COIN_SPIN, drawSpinCoin, loadSpinCoin } from "../../shared/coinFlip";
import { bezier } from "../../shared/curves";
import { between, clamp01, easeOutCubic, lerp } from "../../shared/easing";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { shakeScreen } from "../../shared/screenShake";
import { createSpawnRoll } from "../../shared/spawnRoll";
import {
  payTotal,
  spawnGameDeps,
  type SpawnGame,
} from "../../shared/spawnGames";
import { stampGlimmer } from "../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { tapHits } from "../../shared/tapTarget";

// the wisp's twirl round its home, as fractions of the screen, and how fast
const HOME: Point = { x: 0.5, y: 0.75 };
const TWIRL_X = 0.12;
const TWIRL_Y = 0.03;
const TWIRL_RATE = 0.0045;
const WISP_SCALE = 1.2;
// held: it darts to the finger in DART_MS and sweeps LINE_HALF of the width
// either side of it, a sweep every 2π / SWEEP_RATE ms
const DART_MS = 140;
const LINE_HALF = 0.12;
const LINE_WIDTH = 16;
const SWEEP_RATE = 0.05;
const LINE_Y: [number, number] = [0.3, 0.92];
// the coin, COIN_R of the width, glinting at COIN_TOP of the height for
// HOVER_MS before it drops
const COIN_R = 0.045;
const COIN_TOP = 0.08;
const HOVER_MS = 1_000;
const GLOW = 2.2;
// heights a second squared, rising GROW times each bounce; each bounce
// peaks PEAK of the height over the line, PEAK_SHRINK times less each time,
// never above CEILING of the height
const GRAVITY = 2.2;
const GROW = 1.12;
const PEAK = 0.5;
const PEAK_SHRINK = 0.92;
const CEILING = 0.06;
const LAND_X: [number, number] = [0.18, 0.82];
// a press counts within CATCH of the width of the coin's column, below it,
// or on the wisp
const CATCH = 0.3;
const BOUNCE_SHAKE: [number, number] = [0.25, 0.6];
const FINAL_SHAKE = 1.2;
const FLY_MS = 350;
const FLASH_MS = 240;
const FADE_MS = 300;
const END_MS = 900;
const MAX_STEP = 0.05;

interface Flash {
  x: number;
  y: number;
  at: number;
  size: number;
}

interface Run {
  startAt: number;
  dropAt: number;
  // in screen units: where it twirls, and the line's middle while held
  home: Point;
  anchor: Point;
  held: boolean;
  heldAt: number;
  releasedAt: number;
  // the coin, its speed (screen units a second) and fall
  coin: Point;
  vx: number;
  vy: number;
  gravity: number;
  peak: number;
  bounces: number;
  lastT: number;
  // the last bounce's flight into the total, and when it fell or landed
  flyAt: number;
  from: Point;
  fellAt: number;
  landedAt: number;
  flashes: Flash[];
}

let run: Run | null = null;
let pending = false;
const roll = createSpawnRoll(CONFIG.randomSpawns.keepItUp, performance.now());
// the screen as last drawn, in gameCanvas's screen units
let width = 1;
let height = 1;
const spot: Point = { x: 0, y: 0 };
const lineA: Point = { x: 0, y: 0 };
const lineB: Point = { x: 0, y: 0 };
const bend: Point = { x: 0, y: 0 };
const total: Point = { x: 0, y: 0 };

function updateKeepItUp(now: number): void {
  if (run || pending) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  // starts on the next draw, once the screen's size is known
  if (roll.procs(now)) pending = true;
}

function startRun(t: number): void {
  loadSpinCoin();
  const home = { x: HOME.x * width, y: HOME.y * height };
  run = {
    startAt: t,
    dropAt: t + HOVER_MS,
    home,
    anchor: { x: home.x, y: home.y },
    held: false,
    heldAt: -Infinity,
    releasedAt: -Infinity,
    coin: { x: home.x, y: COIN_TOP * height },
    vx: 0,
    vy: 0,
    gravity: GRAVITY,
    peak: PEAK,
    bounces: 0,
    lastT: t,
    flyAt: Infinity,
    from: { x: 0, y: 0 },
    fellAt: Infinity,
    landedAt: Infinity,
    flashes: [],
  };
  playSpawnNotice();
}

// the wisp at ms: twirling round its home, or sweeping the line while held
function wispAt(ms: number): Point | null {
  const r = run;
  if (!r || ms < r.startAt) return null;
  spot.x = r.home.x + Math.sin(ms * TWIRL_RATE) * TWIRL_X * width;
  spot.y = r.home.y + Math.sin(ms * TWIRL_RATE * 2) * TWIRL_Y * height;
  const line = r.held
    ? easeOutCubic(clamp01((ms - r.heldAt) / DART_MS))
    : 1 - clamp01((ms - r.releasedAt) / DART_MS);
  if (line > 0) {
    const x = r.anchor.x + Math.sin(ms * SWEEP_RATE) * LINE_HALF * width;
    spot.x += (x - spot.x) * line;
    spot.y += (r.anchor.y - spot.y) * line;
  }
  return spot;
}

const isLive = (r: Run) => r.flyAt === Infinity && r.fellAt === Infinity;
const lineIsUp = (r: Run, t: number) => r.held && t - r.heldAt >= DART_MS * 0.6;

function aim(r: Run, x: number, y: number): void {
  const half = LINE_HALF * width;
  r.anchor.x = Math.min(width - half, Math.max(half, x));
  r.anchor.y = Math.min(LINE_Y[1] * height, Math.max(LINE_Y[0] * height, y));
}

function canCatch(x: number, y: number, t: number): boolean {
  const r = run;
  if (!r || !isLive(r)) return false;
  const R = COIN_R * width;
  if (Math.abs(x - r.coin.x) < CATCH * width && y > r.coin.y - R) return true;
  const wisp = wispAt(t);
  return !!wisp && tapHits(x, y, wisp, WISP_SIZE * WISP_SCALE * 2);
}

function press(x: number, y: number): boolean {
  const t = performance.now();
  if (!canCatch(x, y, t)) return false;
  const r = run!;
  r.held = true;
  r.heldAt = t;
  aim(r, x, y);
  playSwoosh();
  return true;
}

function move(x: number, y: number): void {
  if (run?.held) aim(run, x, y);
}

function release(): void {
  const r = run;
  if (!r?.held) return;
  r.held = false;
  r.releasedAt = performance.now();
  r.home.x = r.anchor.x;
  r.home.y = r.anchor.y;
}

function bounce(r: Run, t: number): void {
  const { bounces, bounceSeconds, finalSeconds } = CONFIG.randomSpawns.keepItUp;
  const R = COIN_R * width;
  r.bounces++;
  r.coin.y = r.anchor.y - R;
  const deps = spawnGameDeps();
  const last = r.bounces >= bounces;
  const size = R * (last ? 6 : 3);
  r.flashes.push({ x: r.coin.x, y: r.anchor.y, at: t, size });
  if (last) {
    r.flyAt = t;
    r.from.x = r.coin.x;
    r.from.y = r.coin.y;
    if (deps) payTotal(deps, finalSeconds, r.coin, [24, 30]);
    shakeScreen(FINAL_SHAKE);
    playJackpot();
    return;
  }
  if (deps) payTotal(deps, bounceSeconds * r.bounces, r.coin, [3, 5]);
  shakeScreen(lerp(BOUNCE_SHAKE, r.bounces / bounces));
  playBloop();
  r.gravity *= GROW;
  r.peak *= PEAK_SHRINK;
  const g = r.gravity * height;
  const rise = Math.min(r.peak * height, r.coin.y - CEILING * height);
  r.vy = -Math.sqrt(2 * g * Math.max(0, rise));
  const air = (2 * -r.vy) / g;
  r.vx = (between(LAND_X) * width - r.coin.x) / Math.max(0.2, air);
}

// the coin's fall since the last frame, bouncing off the line and the sides
function step(r: Run, t: number): void {
  const dt = Math.min(MAX_STEP, (t - r.lastT) / 1000);
  r.lastT = t;
  if (t < r.dropAt || !isLive(r)) return;
  const R = COIN_R * width;
  const bottom = r.coin.y + R;
  r.vy += r.gravity * height * dt;
  r.coin.x += r.vx * dt;
  r.coin.y += r.vy * dt;
  if (r.coin.x < R || r.coin.x > width - R) {
    r.coin.x = Math.min(width - R, Math.max(R, r.coin.x));
    r.vx = -r.vx;
  }
  const lineY = r.anchor.y;
  if (
    r.vy > 0 &&
    lineIsUp(r, t) &&
    bottom <= lineY + R * 0.5 &&
    r.coin.y + R >= lineY &&
    Math.abs(r.coin.x - r.anchor.x) <= LINE_HALF * width + R
  ) {
    bounce(r, t);
    return;
  }
  if (r.coin.y - R > height) r.fellAt = t;
}

function glimmer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  turn: number,
  color: string,
): void {
  if (size <= 0 || alpha <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  stampGlimmer(ctx, x, y, size, turn, color);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

function drawKeepItUp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  totalAtY: number,
  now: number,
): void {
  width = w;
  height = h;
  const t = performance.now();
  if (pending) {
    pending = false;
    startRun(t);
  }
  const r = run;
  if (!r) return;
  step(r, t);
  const end = Math.min(r.fellAt, r.landedAt);
  if (t > end + END_MS) {
    run = null;
    return;
  }
  const R = COIN_R * w;
  const appear = clamp01((t - r.startAt) / 250);
  const fade =
    r.fellAt !== Infinity ? 1 - clamp01((t - r.fellAt) / FADE_MS) : 1;
  if (r.held && fade > 0) {
    const line = clamp01((t - r.heldAt) / DART_MS);
    lineA.x = r.anchor.x - LINE_HALF * w;
    lineB.x = r.anchor.x + LINE_HALF * w;
    lineA.y = lineB.y = r.anchor.y;
    drawBeam(ctx, lineA, lineB, LINE_WIDTH, 0.85 * line * fade);
  }
  drawWisp(
    ctx,
    wispAt,
    t,
    now,
    WISP_SIZE * WISP_SCALE * appear * (r.landedAt === Infinity ? 1 : 0),
    r.held ? 0.8 : 0.3,
    fade,
  );
  // the coin: hovering, falling and bouncing, or flying into the total
  let cx = r.coin.x;
  let cy = r.coin.y;
  let size = R * appear;
  if (r.flyAt !== Infinity) {
    const u = (t - r.flyAt) / FLY_MS;
    if (u >= 1) {
      if (r.landedAt === Infinity) r.landedAt = r.flyAt + FLY_MS;
      size = 0;
    } else {
      total.x = w / 2;
      total.y = totalAtY;
      bend.x = r.from.x;
      bend.y = Math.min(r.from.y, totalAtY) - 0.15 * h;
      const at = bezier(r.from, bend, total, u * u, spot);
      cx = at.x;
      cy = at.y;
      size = R * lerp([1, 0.6], u);
    }
  } else if (t < r.dropAt) {
    cy += Math.sin(t * 0.01) * R * 0.15;
  }
  if (size > 0 && fade > 0) {
    const turn = now * 0.003;
    glimmer(ctx, cx, cy, size * GLOW, 0.45 * fade, turn, COLOR.heavenlyGold);
    drawSpinCoin(ctx, cx, cy, size, fade, t * COIN_SPIN * 2);
  }
  for (let i = 0; i < r.flashes.length; i++) {
    const f = r.flashes[i];
    const p = (t - f.at) / FLASH_MS;
    if (p < 0 || p >= 1) continue;
    glimmer(ctx, f.x, f.y, f.size * (0.5 + p), 1 - p, f.at, COLOR.white);
  }
  if (r.landedAt !== Infinity) {
    const p = (t - r.landedAt) / (FLASH_MS * 1.5);
    const size = R * 8 * (0.5 + p);
    if (p < 1)
      glimmer(ctx, w / 2, totalAtY, size, 1 - p, r.landedAt, COLOR.white);
  }
}

export default {
  force: () => {
    pending = true;
  },
  update: updateKeepItUp,
  drawOver: drawKeepItUp,
  press,
  move,
  release,
  hitTest: (x, y) => canCatch(x, y, performance.now()),
} satisfies SpawnGame;
