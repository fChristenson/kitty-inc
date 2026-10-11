// Unit up: the first time ever the total reaches a new unit (Million,
// Billion, ...), its unit word turns into a slot reel between two gold rims
// and spins through the units, braking hard, each word clicking past with a
// jolt, round three times till it stops on the new one in gold; coins swing
// up into the amount, which pays a share of itself (the game's own payout,
// set with setUnitUpPayout) and slams like an event's total. Drawn by
// shared/totalIncomeReadout in place of its unit word
import { COLOR } from "../../palette";
import { illionName } from "../../utils";
import {
  beginCoinBatch,
  createCoinBurstParticles,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstParticle,
} from "../../coinBurst";
import { playCoinDrop } from "../../sound";
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
import { kickShake } from "../screenShake";
import { pulseHudTotalFlash, triggerHudTotalFlash } from "../totalIncomeCoins";
import { hash01 } from "../twinkle";
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
// coins flung out of the word, swinging round up into the amount
const COINS = 36;
const COIN_EVERY_MS = 20;
const COIN_FLY_MS = 460;
const PAY_AT = SPIN_MS + 120;
const PAID_AT = PAY_AT + (COINS - 1) * COIN_EVERY_MS + COIN_FLY_MS;
// the slam that follows is the readout's own
const END_MS = PAID_AT;
// shakes: a click (growing), and the reel stopping
const TICK_KICK: [number, number] = [0.1, 0.35];
const LAND_KICK = 0.5;

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
  kind: "tick" | "land" | "coin" | "paid";
  index: number;
}
const BEATS: Beat[] = [
  ...TICKS.map((at, index) => ({ at, kind: "tick" as const, index })),
  { at: SPIN_MS, kind: "land", index: 0 },
  ...Array.from({ length: COINS }, (_, index) => ({
    at: PAY_AT + index * COIN_EVERY_MS + COIN_FLY_MS,
    kind: "coin" as const,
    index,
  })),
  { at: PAID_AT, kind: "paid", index: 0 },
];

// each coin's swing: out under the word, then back up under the amount
const COIN_OUT_X = Array.from(
  { length: COINS },
  (_, i) => (hash01(i, 1) - 0.5) * 1100,
);
const COIN_OUT_Y = Array.from(
  { length: COINS },
  (_, i) => 250 + hash01(i, 2) * 500,
);
const COIN_BACK_X = Array.from(
  { length: COINS },
  (_, i) => (hash01(i, 3) - 0.5) * 600,
);
const COIN_BACK_Y = 420;
// the game's own burst coins, shrunk to the readout
const COIN_SCALE = 0.6;
// a burst coin's spin is in ~16.67ms ticks
const TICK_MS = 1000 / 60;

interface Run {
  startedAt: number;
  words: string[];
  beats: Beats<Beat>;
  // each flying coin's look (kind, size, tilt, spin) and its first spin frame
  coins: CoinBurstParticle[];
  spinFrom: number[];
}
let run: Run | null = null;
let topTier: number | null = null;
let payout: (() => void) | null = null;
const spot: Point = { x: 0, y: 0 };
const rimEnd: Point = { x: 0, y: 0 };

// what the total pays once the coins are in
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
  const now = Date.now();
  switch (beat.kind) {
    case "tick": {
      const k = TICKS.length > 1 ? beat.index / (TICKS.length - 1) : 1;
      kickShake(TICK_KICK[0] + (TICK_KICK[1] - TICK_KICK[0]) * k, now);
      playCoinDrop();
      break;
    }
    case "land":
      kickShake(LAND_KICK, now);
      playCoinDrop();
      break;
    case "coin":
      pulseHudTotalFlash();
      break;
    case "paid":
      payout?.();
      triggerHudTotalFlash();
      triggerEventEndSlam(GLOBAL_SLAM, "total");
      break;
  }
}

function start(from: number, to: number): void {
  const words = [from > 0 ? illionName(from) : ""];
  for (let k = 0; k < RING - 1; k++) words.push(illionName(to + k));
  const coins = createCoinBurstParticles(0, 0).slice(0, COINS);
  run = {
    startedAt: Date.now(),
    words,
    beats: createBeats(BEATS, (beat) => beat.at, fireBeat),
    coins,
    spinFrom: coins.map((coin) => coin.spinFrame),
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

function drawCoins(
  ctx: CanvasRenderingContext2D,
  { coins, spinFrom }: Run,
  from: Point,
  to: Point,
  ms: number,
): void {
  if (ms < PAY_AT || ms >= PAID_AT) return;
  const base = ctx.getTransform();
  beginCoinBatch(ctx);
  for (let i = 0; i < coins.length; i++) {
    const u = (ms - PAY_AT - i * COIN_EVERY_MS) / COIN_FLY_MS;
    if (u < 0 || u >= 1) continue;
    // a cubic from the word, out under it, back up under the amount, into it
    const t = u ** 1.4;
    const v = 1 - t;
    const a = v * v * v;
    const b = 3 * v * v * t;
    const c = 3 * v * t * t;
    const d = t * t * t;
    const x =
      a * from.x +
      b * (from.x + COIN_OUT_X[i]) +
      c * (to.x + COIN_BACK_X[i]) +
      d * to.x;
    const y =
      a * from.y +
      b * (from.y + COIN_OUT_Y[i]) +
      c * (to.y + COIN_BACK_Y) +
      d * to.y;
    const coin = coins[i];
    coin.spinFrame =
      spinFrom[i] + (coin.spinDir * coin.spinRate * ms) / TICK_MS;
    drawCoinBurstFrame(
      ctx,
      coin,
      x,
      y,
      coin.size * COIN_SCALE * (1 - 0.5 * u),
      base,
    );
  }
  endCoinBatch(ctx);
}

// the reel in place of the readout's unit word (its top, height and stroke),
// rims rimWidth across, coins swinging into the amount at amountAt; false
// once there's nothing to draw, so the readout draws its word itself
export function drawUnitUp(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  height: number,
  strokeWidth: number,
  rimWidth: number,
  amountAt: Point,
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

  if (landed) {
    spot.x = x;
    spot.y = y;
    drawCoins(ctx, run, spot, amountAt, ms);
  }
  return true;
}
