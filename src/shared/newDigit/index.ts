// New digit: the first time ever the total grows a digit (99,999 to 100,000),
// its new leading digit drops in from above in gold, lands with a pop of
// coins, then cools back to green. A digit that comes with a new unit leaves
// it to shared/unitUp. Drawn by shared/totalIncomeReadout over its amount
import { COLOR } from "../../palette";
import { createCoinBurstPool } from "../../coinBurst";
import { playCoinDrop } from "../../sound";
import { clamp01 } from "../easing";
import { drawSlamText, slamTextLetterCenter, SLAM_GOLD } from "../eventEndSlam";
import { drawGlow, fadeStops } from "../glowSprite";
import { shakeScreen } from "../screenShake";

// the most digits the total has ever shown, as its power of ten, for good
const STORAGE_KEY = "cash-clicker:new-digit-top";
// the leading digit, after the "$"
const INDEX = 1;
// it falls DROP of its height from above, START_SIZE times its size, speeding up
const FALL_MS = 260;
const DROP = 2.6;
const START_SIZE = 1.8;
const SQUASH_MS = 140;
const GOLD_HOLD_MS = 500;
const GOLD_FADE_MS = 300;
const END_MS = FALL_MS + GOLD_HOLD_MS + GOLD_FADE_MS;
const LAND_SHAKE = 0.3;
const GLOW = fadeStops(COLOR.heavenlyGold);
const GLOW_R = 2.2;
// the pop: the game's own coin burst, shrunk to the digit
const POP_SCALE = 0.6;
const pops = createCoinBurstPool(120);

let topExponent: number | null = null;
let startedAt: number | null = null;
let landed = false;

function readTop(): number | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  const top = stored === null ? NaN : Number(stored);
  return Number.isFinite(top) ? top : null;
}

function saveTop(exponent: number): void {
  topExponent = exponent;
  localStorage.setItem(STORAGE_KEY, String(exponent));
}

// a new unit (Million at 1e12, then every 1e3 from 1e18) swaps the amount's
// digits for the unit's: the unit's reel plays instead
const startsUnit = (exponent: number): boolean =>
  exponent === 12 || (exponent >= 18 && exponent % 3 === 0);

// the total's power of ten as it's shown: past the most ever, the new digit
// drops in. The first reading only remembers it
export function noteTotalExponent(exponent: number): void {
  if (topExponent === null) topExponent = readTop();
  if (topExponent === null) {
    saveTop(exponent);
    return;
  }
  if (exponent <= topExponent) return;
  saveTop(exponent);
  if (startsUnit(exponent)) return;
  startedAt = Date.now();
  landed = false;
}

// the test button: forgets every digit past `exponent`
export function setNewDigitRecord(exponent: number): void {
  saveTop(exponent);
}

// the amount's letter the falling digit stands in for, or -1
export function newDigitHideIndex(now: number): number {
  return startedAt !== null && now - startedAt < END_MS ? INDEX : -1;
}

// the falling digit over the amount (drawn at x, top, its letters height
// tall, with ctx's font and textAlign), and its pop of coins
export function drawNewDigit(
  ctx: CanvasRenderingContext2D,
  amount: string,
  x: number,
  top: number,
  height: number,
  strokeWidth: number,
  now: number,
): void {
  if (startedAt !== null && amount.length > INDEX)
    drawDigit(ctx, amount, x, top, height, strokeWidth, now);
  pops.draw(ctx, performance.now());
}

function drawDigit(
  ctx: CanvasRenderingContext2D,
  amount: string,
  x: number,
  top: number,
  height: number,
  strokeWidth: number,
  now: number,
): void {
  const ms = now - startedAt!;
  if (ms >= END_MS) {
    startedAt = null;
    return;
  }
  const cx = slamTextLetterCenter(ctx, amount, INDEX, x, true);
  const cy = top + height / 2;
  if (!landed && ms >= FALL_MS) {
    landed = true;
    shakeScreen(LAND_SHAKE);
    playCoinDrop();
    pops.spawn(cx, cy, POP_SCALE);
  }
  const fall = clamp01(ms / FALL_MS) ** 2;
  const since = ms - FALL_MS;
  const squash = since >= 0 ? Math.exp(-since / SQUASH_MS) : 0;
  const size = START_SIZE + (1 - START_SIZE) * fall;
  const y = cy - DROP * height * (1 - fall);
  const gold = 1 - clamp01((since - GOLD_HOLD_MS) / GOLD_FADE_MS);
  const char = amount[INDEX];

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.5 * gold;
  drawGlow(ctx, GLOW, cx, y, height * GLOW_R * size);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.translate(cx, y);
  ctx.scale(size * (1 + 0.35 * squash), size * (1 - 0.3 * squash));
  const letterTop = -height / 2;
  if (gold < 1)
    drawSlamText(
      ctx,
      null,
      char,
      0,
      letterTop,
      height,
      COLOR.moneyGreen,
      COLOR.white,
      strokeWidth,
      true,
      0,
      true,
    );
  if (gold > 0) {
    ctx.globalAlpha *= gold;
    drawSlamText(
      ctx,
      null,
      char,
      0,
      letterTop,
      height,
      SLAM_GOLD,
      COLOR.white,
      strokeWidth,
      true,
      0,
      true,
    );
  }
  ctx.restore();
}
