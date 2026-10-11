// New digit: the first time ever the total grows a digit (99,999 to 100,000),
// its new leading digit puts on a text effect picked at random
// (shared/textAnimations) in gold, lands with a pop of coins, then cools back
// to green. A digit that comes with a new unit leaves it to shared/unitUp.
// Drawn by shared/totalIncomeReadout over its amount
import { COLOR } from "../../palette";
import { createCoinBurstPool } from "../../coinBurst";
import { playCoinDrop, playNotification } from "../../sound";
import { slamTextLetterCenter } from "../eventEndSlam";
import {
  drawLetterShow,
  startLetterShow,
  type LetterShow,
  type LetterStyle,
} from "../textAnimations";

// the most digits the total has ever shown, as its power of ten, for good
const STORAGE_KEY = "cash-clicker:new-digit-top";
// the leading digit, after the "$"
const INDEX = 1;
const LETTER: readonly number[] = [0];
// the pop: the game's own coin burst, shrunk to the digit
const POP_SCALE = 0.6;
const pops = createCoinBurstPool(120);
const style: LetterStyle = {
  fill: COLOR.moneyGreen,
  stroke: COLOR.white,
  strokeWidth: 0,
  tabular: true,
};
// where the digit sits, for its pop
const spot = { x: 0, y: 0 };

let topExponent: number | null = null;
let show: LetterShow | null = null;

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
  show = startLetterShow(LETTER, {
    staggerMs: 0,
    burst: "none",
    onLand: () => {
      playCoinDrop();
      pops.spawn(spot.x, spot.y, POP_SCALE);
    },
  });
}

// the test button: forgets every digit past `exponent`
export function setNewDigitRecord(exponent: number): void {
  saveTop(exponent);
}

// the amount's letter the new digit stands in for, or -1
export function newDigitHideIndex(now: number): number {
  return show && now - show.startedAt < show.ms ? INDEX : -1;
}

// the new digit's show over the amount (drawn at x, top, its letters height
// tall, with ctx's font and textAlign)
export function drawNewDigit(
  ctx: CanvasRenderingContext2D,
  amount: string,
  x: number,
  top: number,
  height: number,
  strokeWidth: number,
): void {
  if (!show || amount.length <= INDEX) return;
  spot.x = slamTextLetterCenter(ctx, amount, INDEX, x, true);
  spot.y = top + height / 2;
  style.strokeWidth = strokeWidth;
  if (!drawLetterShow(ctx, show, amount, INDEX, x, top, height, style))
    show = null;
}

// its pop of coins, drawn before the amount so they never hide it
export function drawNewDigitPop(ctx: CanvasRenderingContext2D): void {
  pops.draw(ctx, performance.now());
}
