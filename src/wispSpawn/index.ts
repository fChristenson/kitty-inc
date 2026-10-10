// the wisp: every so often, like the mouse and the bubbles, a wisp dashes
// across the screen leaving a trail of glitter behind it. The glitter lingers
// for CONFIG.randomSpawns.wisp.durationMs, blinking before it fades; a swipe
// through it sweeps it up, every speck flying into the total income and
// paying its share of the wisp's reward as it lands.
//
// gameCanvas ticks the spawn timer (updateWispSpawn), sweeps it along every
// drag (sweepWispGlitter) and draws it in screen space over the HUD
// (drawWispSpawn)
import { CONFIG } from "../config";
import { COLOR } from "../palette";
import { playCoinDrop, playSwoosh } from "../sound";
import { getActiveCompanyIndex } from "../company";
import { addTotalIncome, getCompanyIncomeRatePerSecond } from "../totalIncome";
import { multiply, type BigNumber } from "../shared/bigNumber";
import { alongRoute, bezier } from "../shared/curves";
import { between, clamp01 } from "../shared/easing";
import { isScreenFrozen } from "../shared/screenFreeze";
import { shakeScreen } from "../shared/screenShake";
import { createSpawnRoll } from "../shared/spawnRoll";
import { stampGlimmer } from "../shared/twinkle";
import { pulseHudTotalFlash } from "../shared/totalIncomeCoins";
import { urgentBlink } from "../shared/urgentBlink";
import { drawWispBetween, WISP_SIZE, type Point } from "../shared/wisp";

// the dash: in from one side through a few spots across the screen, out the
// other side, as fractions of the screen
const STOPS = 5;
const DASH_Y: [number, number] = [0.3, 0.85];
const WISP_SCALE = 1.4;
// the glitter it sheds: scattered round its path, popping in as it passes
const SCATTER = 40;
const SPECK_SIZE: [number, number] = [16, 28];
const SPECK_POP_MS = 160;
const SPECK_FADE_MS = 300;
const SPECK_SPIN = 0.0015;
const COLORS = [COLOR.heavenlyGold, COLOR.wispGlitter, COLOR.white];
// a swipe gathers glitter this far either side of the finger
const SWEEP_REACH = 90;
// gathered specks hop off the swipe, then fly into the total
const FLY_MS: [number, number] = [380, 620];
const FLY_STAGGER_MS = 6;
const FLY_ARC = 0.35;
const FLY_GROW = 1.5;
const SWOOSH_GAP_MS = 150;
const CLEAR_SHAKE = 0.8;

interface Speck {
  // spot on the wisp's path as fractions of the screen, scattered off it by
  // (ox, oy) screen units
  fx: number;
  fy: number;
  ox: number;
  oy: number;
  // performance.now() the wisp drops it
  bornAt: number;
  size: number;
  seed: number;
  color: string;
  // performance.now() it was swept up (Infinity while lying), and from where
  sweptAt: number;
  flyMs: number;
  from: Point;
  paid: boolean;
}

interface Run {
  route: Point[];
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

function startRun(now: number): void {
  const {
    dashMs,
    durationMs,
    specks: count,
    rewardSeconds,
  } = CONFIG.randomSpawns.wisp;
  const fromLeft = Math.random() < 0.5;
  const route: Point[] = [{ x: fromLeft ? -0.1 : 1.1, y: between(DASH_Y) }];
  for (let i = 1; i <= STOPS; i++) {
    const t = i / (STOPS + 1);
    route.push({ x: fromLeft ? t : 1 - t, y: between(DASH_Y) });
  }
  route.push({ x: fromLeft ? 1.1 : -0.1, y: between(DASH_Y) });
  const specks: Speck[] = [];
  for (let i = 0; i < count; i++) {
    const u = (i + Math.random()) / count;
    const at = alongRoute(route, u, { x: 0, y: 0 });
    if (at.x < 0.03 || at.x > 0.97) continue;
    specks.push({
      fx: at.x,
      fy: at.y,
      ox: (Math.random() - 0.5) * 2 * SCATTER,
      oy: (Math.random() - 0.5) * 2 * SCATTER,
      bornAt: now + u * dashMs,
      size: between(SPECK_SIZE),
      seed: Math.random() * 1000,
      color: COLORS[i % COLORS.length],
      sweptAt: Infinity,
      flyMs: between(FLY_MS),
      from: { x: 0, y: 0 },
      paid: false,
    });
  }
  const rate = getCompanyIncomeRatePerSecond(getActiveCompanyIndex());
  run = {
    route,
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

// whether a press at (x, y) (gameCanvas screen units) lands on glitter
export function hitTestWispGlitter(x: number, y: number): boolean {
  const now = performance.now();
  if (!run) return false;
  for (const speck of run.specks) {
    if (!isLying(speck, now, run.fadeAt)) continue;
    if (Math.hypot(speckX(speck) - x, speckY(speck) - y) < SWEEP_REACH)
      return true;
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
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length2 = dx * dx + dy * dy || 1;
  let swept = 0;
  for (const speck of run.specks) {
    if (!isLying(speck, now, run.fadeAt)) continue;
    const x = speckX(speck);
    const y = speckY(speck);
    const t = clamp01(((x - x0) * dx + (y - y0) * dy) / length2);
    if (Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) >= SWEEP_REACH)
      continue;
    speck.sweptAt = now + swept++ * FLY_STAGGER_MS;
    speck.from.x = x;
    speck.from.y = y;
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

function pay(r: Run, speck: Speck): void {
  speck.paid = true;
  r.left--;
  addTotalIncome(r.share);
  pulseHudTotalFlash();
  playCoinDrop();
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
  const { dashMs, pulseMs } = CONFIG.randomSpawns.wisp;
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
  const blink = urgentBlink(r.fadeAt - t, pulseMs, now);
  for (const speck of r.specks) {
    if (speck.paid || t < speck.bornAt) {
      alive ||= !speck.paid;
      continue;
    }
    const spin = speck.seed + t * SPECK_SPIN;
    if (speck.sweptAt !== Infinity) {
      alive = true;
      if (t < speck.sweptAt) continue;
      const p = (t - speck.sweptAt) / speck.flyMs;
      if (p >= 1) {
        pay(r, speck);
        continue;
      }
      flightAt(speck, p, fly);
      ctx.globalAlpha = 1;
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
    const twinkle = 0.75 + 0.25 * Math.sin(t * 0.008 + speck.seed);
    ctx.globalAlpha = Math.min(1, fade) * blink;
    stampGlimmer(
      ctx,
      speckX(speck),
      speckY(speck),
      speck.size * pop * (2 - pop) * twinkle,
      spin,
      speck.color,
    );
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  if (!alive && ms > dashMs) run = null;
}
