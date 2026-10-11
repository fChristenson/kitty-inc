// Unit up: the first time ever the total reaches a new unit (Million,
// Billion, ...), its unit word turns into a slot reel between two gold rims
// and spins through the units, braking hard, each word clicking past, round
// three times till it stops on the new one in gold; a beat later the total
// pays a share of itself (the game's own payout, set with setUnitUpPayout) and
// slams like an event's total. Drawn by shared/totalIncomeReadout in place of
// its unit word
import { COLOR } from "../../palette";
import { illionName } from "../../utils";
import { playCoinDrop, playNotification } from "../../sound";
import { drawBeam } from "../beam";
import { clamp01 } from "../easing";
import { createBeats, type Beats } from "../eventBeats";
import {
  drawSlamText,
  GLOBAL_SLAM,
  SLAM_GOLD,
  triggerEventEndSlam,
} from "../eventEndSlam";
import { drawGlow, fadeStops } from "../glowSprite";
import { triggerHudTotalFlash } from "../totalIncomeCoins";
import type { Point } from "../wisp";

// the highest unit tier the total has ever shown (0 = none), for good
const STORAGE_KEY = "cash-clicker:unit-up-tier";

// the reel: RING words (the old unit, the new one and the four after it),
// spun round LOOPS times onto the new one over SPIN_MS, braking hard
const RING = 6;
const LOOPS = 3;
const STOP = 1 + RING * LOOPS;
const SPIN_MS = 1150;
// words clicking past jolt once the reel's slowed past this share of its spin
const TICK_FROM = 0.4;
// a row of the reel, in unit-word heights; the window (and its rims) reaches
// ROW_WINDOW of one out from the word's middle, clear of the amount above it
const ROW = 1.5;
const ROW_WINDOW = 0.62;
const RIM_WIDTH = 14;
const RIM_OPEN_MS = 150;
const RIM_CLOSE_MS = 250;
// how far a blurred word stretches at most, and per word/ms of speed
const BLUR_MAX = 1.4;
const BLUR_PER_SPEED = 30;
// the landing's squash, and the bounce it settles with
const SQUASH_MS = 120;
const SETTLE = 0.22;
const SETTLE_MS = 90;
const SETTLE_RATE = 22;
// gold while spinning, full gold on landing held GOLD_HOLD_MS, then back to green
const SPIN_GOLD = 0.5;
const GOLD_HOLD_MS = 700;
const GOLD_FADE_MS = 500;
const GLOW = fadeStops(COLOR.heavenlyGold);
const GLOW_R = 7;
const GLOW_SQUASH = 0.45;
// the total pays and slams this long after the reel stops; the slam is the
// readout's own
const PAID_AT = SPIN_MS + 100;
const END_MS = PAID_AT;

const reelAt = (ms: number): number =>
  STOP * (1 - (1 - clamp01(ms / SPIN_MS)) ** 3);

// every word clicking past once the reel's slow enough to read
const TICKS: number[] = [];
{
  let last = 0;
  for (let t = 0; t < SPIN_MS; t += 4) {
    const word = Math.floor(reelAt(t));
    if (word === last) continue;
    last = word;
    if (t > SPIN_MS * TICK_FROM) TICKS.push(t);
  }
}

interface Beat {
  at: number;
  kind: "tick" | "paid";
}
const BEATS: Beat[] = [
  ...TICKS.map((at) => ({ at, kind: "tick" as const })),
  { at: SPIN_MS, kind: "tick" },
  { at: PAID_AT, kind: "paid" },
];

interface Run {
  startedAt: number;
  words: string[];
  beats: Beats<Beat>;
}
let run: Run | null = null;
let topTier: number | null = null;
let payout: (() => void) | null = null;
const spot: Point = { x: 0, y: 0 };
const rimEnd: Point = { x: 0, y: 0 };

// what the total pays as it slams
export function setUnitUpPayout(pay: () => void): void {
  payout = pay;
}

function readTopTier(): number | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  const tier = stored === null ? NaN : Number(stored);
  return Number.isFinite(tier) ? tier : null;
}

function saveTopTier(tier: number): void {
  topTier = tier;
  localStorage.setItem(STORAGE_KEY, String(tier));
}

function fireBeat(beat: Beat): void {
  if (beat.kind === "tick") {
    playCoinDrop();
    return;
  }
  payout?.();
  triggerHudTotalFlash();
  triggerEventEndSlam(GLOBAL_SLAM, "total");
}

function start(from: number, to: number): void {
  playNotification();
  const words = [from > 0 ? illionName(from) : ""];
  for (let k = 0; k < RING - 1; k++) words.push(illionName(to + k));
  run = {
    startedAt: Date.now(),
    words,
    beats: createBeats(BEATS, (beat) => beat.at, fireBeat),
  };
}

// the readout's unit tier as it's shown: the first time ever past the best
// so far, the reel plays. The first reading only remembers it
export function noteUnitTier(tier: number): void {
  if (topTier === null) topTier = readTopTier();
  if (topTier === null) {
    saveTopTier(tier);
    return;
  }
  if (tier <= topTier) return;
  const from = topTier;
  saveTopTier(tier);
  start(from, tier);
}

// the test button: forgets every unit past `tier`, so the next one procs again
export function setUnitUpRecord(tier: number): void {
  saveTopTier(tier);
}

export function isUnitUpActive(now: number): boolean {
  return run !== null && now - run.startedAt < END_MS;
}

function drawWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  x: number,
  y: number,
  height: number,
  strokeWidth: number,
  sx: number,
  sy: number,
  gold: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  const top = -height / 2;
  if (gold < 1)
    drawSlamText(
      ctx,
      null,
      word,
      0,
      top,
      height,
      COLOR.moneyGreen,
      COLOR.white,
      strokeWidth,
      false,
      0,
      true,
    );
  if (gold > 0) {
    ctx.globalAlpha *= gold;
    drawSlamText(
      ctx,
      null,
      word,
      0,
      top,
      height,
      SLAM_GOLD,
      COLOR.white,
      strokeWidth,
      false,
      0,
      true,
    );
  }
  ctx.restore();
}

// the reel in place of the readout's unit word (its top, height and stroke),
// rims rimWidth across; false once there's nothing to draw, so the readout
// draws its word itself
export function drawUnitUp(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  height: number,
  strokeWidth: number,
  rimWidth: number,
): boolean {
  if (!run) return false;
  const ms = Date.now() - run.startedAt;
  const now = performance.now();
  run.beats.tick(ms, now);
  if (ms >= END_MS) {
    run = null;
    return false;
  }
  const y = top + height / 2;
  const row = height * ROW;
  const landed = ms >= SPIN_MS;
  const since = ms - SPIN_MS;
  const settle = landed
    ? SETTLE * Math.exp(-since / SETTLE_MS) * Math.sin(since / SETTLE_RATE)
    : 0;
  const pos = reelAt(ms) + settle;
  const speed = landed ? 0 : (reelAt(ms + 8) - reelAt(ms)) / 8;
  const squash = landed ? Math.exp(-since / SQUASH_MS) : 0;
  const gold = landed
    ? 1 - clamp01((since - GOLD_HOLD_MS) / GOLD_FADE_MS)
    : SPIN_GOLD;
  const open =
    clamp01(ms / RIM_OPEN_MS) *
    (1 - clamp01((since - GOLD_HOLD_MS) / RIM_CLOSE_MS));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.6 * gold;
  drawGlow(ctx, GLOW, x, y, height * GLOW_R, GLOW_SQUASH);
  ctx.restore();

  // the rims flash on every click and the landing
  let click = 0;
  for (const t of TICKS)
    if (ms >= t && ms < t + 120) click = Math.max(click, 1 - (ms - t) / 120);
  if (landed && since < 300) click = Math.max(click, 1.1 * (1 - since / 300));
  const half = height * ROW_WINDOW;
  if (open > 0) {
    const alpha = Math.min(1, open * (0.45 + click));
    spot.x = x - rimWidth / 2;
    rimEnd.x = x + rimWidth / 2;
    spot.y = rimEnd.y = y - half;
    drawBeam(ctx, spot, rimEnd, RIM_WIDTH, alpha);
    spot.y = rimEnd.y = y + half;
    drawBeam(ctx, spot, rimEnd, RIM_WIDTH, alpha);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x - rimWidth * 2, y - half, rimWidth * 4, half * 2);
  ctx.clip();
  const sy =
    (1 - 0.25 * squash) * (1 + Math.min(BLUR_MAX, speed * BLUR_PER_SPEED));
  const first = Math.floor(pos);
  for (let r = first - 1; r <= first + 1; r++) {
    const word = run.words[((r % RING) + RING) % RING];
    drawWord(
      ctx,
      word,
      x,
      y + (r - pos) * row,
      height,
      strokeWidth,
      1 + 0.3 * squash,
      sy,
      gold,
    );
  }
  ctx.restore();
  return true;
}
