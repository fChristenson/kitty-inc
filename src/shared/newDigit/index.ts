// New digit: the first time ever the total grows a digit (99,999 to 100,000),
// its new leading digit drops in from above in gold (shared/textAnimations'
// dropIn), lands with a pop of coins, then cools back to green. A digit that
// comes with a new unit leaves it to shared/unitUp. Drawn by
// shared/totalIncomeReadout over its amount
import { COLOR } from "../../palette";
import { createCoinBurstPool } from "../../coinBurst";
import { playCoinDrop, playNotification } from "../../sound";
import { slamTextLetterCenter } from "../eventEndSlam";
import { drawGlow, fadeStops } from "../glowSprite";
import { createLetterPose, drawLetter, dropIn } from "../textAnimations";

// the most digits the total has ever shown, as its power of ten, for good
const STORAGE_KEY = "cash-clicker:new-digit-top";
// the leading digit, after the "$"
const INDEX = 1;
const EFFECT = dropIn;
const END_MS = EFFECT.ms;
const GLOW = fadeStops(COLOR.heavenlyGold);
const GLOW_R = 2.2;
// the pop: the game's own coin burst, shrunk to the digit
const POP_SCALE = 0.6;
const pops = createCoinBurstPool(120);
const pose = createLetterPose();

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
  playNotification();
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
// tall, with ctx's font and textAlign)
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
}

// its pop of coins, drawn before the amount so they never hide it
export function drawNewDigitPop(ctx: CanvasRenderingContext2D): void {
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
  if (!landed && ms >= EFFECT.landMs) {
    landed = true;
    playCoinDrop();
    pops.spawn(cx, cy, POP_SCALE);
  }
  EFFECT.pose(ms, amount[INDEX], pose);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.5 * pose.gold;
  drawGlow(ctx, GLOW, cx, cy + pose.dy * height, height * GLOW_R * pose.sy);
  ctx.restore();

  drawLetter(
    ctx,
    pose,
    cx,
    cy,
    height,
    COLOR.moneyGreen,
    COLOR.white,
    strokeWidth,
    true,
  );
}
