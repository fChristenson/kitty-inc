// Matching digits: a group of three between the total's commas turning up all
// the same digit (444, 777) quietly puts its digits one after another through
// a text effect (shared/textAnimations) in gold, no sound or shake, and the
// total pays a small bonus as the last lands (set with
// setMatchingDigitsPayout). Drawn by shared/totalIncomeReadout over its amount
import { COLOR } from "../../palette";
import { createBeats, type Beats } from "../eventBeats";
import { slamTextLetterCenter } from "../eventEndSlam";
import { createLetterPose, drawLetter, jumpSlam } from "../textAnimations";

const DIGITS = 3;
const EFFECT = jumpSlam;
// each digit starts STAGGER_MS after the one before
const STAGGER_MS = 70;
const LAST_LAND = (DIGITS - 1) * STAGGER_MS + EFFECT.landMs;
const END_MS = (DIGITS - 1) * STAGGER_MS + EFFECT.ms;
// a quiet spell after each, so a fast-counting total doesn't fire them back to back
const COOLDOWN_MS = 4000;
const PAY: readonly number[] = [LAST_LAND];
const pose = createLetterPose();

interface Run {
  startedAt: number;
  // the group's first digit, counted from the amount's end, and its digits
  fromEnd: number;
  digits: string;
  beats: Beats<number>;
}
let run: Run | null = null;
let quietUntil = 0;
let payout: (() => void) | null = null;
// the matching groups the amount showed last time, as fromEnd * 10 + digit
let shown = new Set<number>();
let next = new Set<number>();
let seeded = false;
let forced = false;

export function setMatchingDigitsPayout(pay: () => void): void {
  payout = pay;
}

// the test button: the next amount's last group plays as 777
export function forceMatchingDigits(): void {
  forced = true;
  quietUntil = 0;
}

function start(fromEnd: number, digits: string): void {
  run = {
    startedAt: Date.now(),
    fromEnd,
    digits,
    beats: createBeats(
      PAY,
      (at) => at,
      () => payout?.(),
    ),
  };
}

// the amount as shown, each time it changes: a group newly matching starts
// the jump (the highest, if several). The first look only remembers them
export function noteMatchingDigits(amount: string): void {
  next.clear();
  let best = -1;
  let lastGroup = -1;
  for (let i = 0; i + DIGITS <= amount.length; i++) {
    const bounded =
      (i > 0 && amount[i - 1] === ",") || amount[i + DIGITS] === ",";
    if (!bounded || amount[i] < "0" || amount[i] > "9") continue;
    if (i > 0 && amount[i - 1] >= "0" && amount[i - 1] <= "9") continue;
    if (amount[i + DIGITS] >= "0" && amount[i + DIGITS] <= "9") continue;
    lastGroup = i;
    if (amount[i + 1] !== amount[i] || amount[i + 2] !== amount[i]) continue;
    const key = (amount.length - i) * 10 + Number(amount[i]);
    next.add(key);
    if (best < 0 && !shown.has(key)) best = i;
  }
  [shown, next] = [next, shown];
  if (!seeded) {
    seeded = true;
    return;
  }
  const now = Date.now();
  if (run || now < quietUntil) return;
  if (forced && lastGroup >= 0) {
    forced = false;
    start(amount.length - lastGroup, "777");
  } else if (best >= 0) {
    start(amount.length - best, amount.slice(best, best + DIGITS));
  }
}

// where the amount's matched group starts, for the readout to leave out, or -1
export function matchingDigitsHideIndex(amount: string, now: number): number {
  if (!run || now - run.startedAt >= END_MS) return -1;
  const at = amount.length - run.fromEnd;
  return at >= 0 ? at : -1;
}

// the group jumping and slamming over the amount (drawn at x, top, its digits
// height tall, with ctx's font and textAlign, tabular)
export function drawMatchingDigits(
  ctx: CanvasRenderingContext2D,
  amount: string,
  x: number,
  top: number,
  height: number,
  strokeWidth: number,
): void {
  if (!run) return;
  const ms = Date.now() - run.startedAt;
  run.beats.tick(ms, performance.now());
  if (ms >= END_MS) {
    run = null;
    quietUntil = Date.now() + COOLDOWN_MS;
    return;
  }
  const at = amount.length - run.fromEnd;
  if (at < 0) return;
  const cy = top + height / 2;
  for (let k = 0; k < DIGITS; k++) {
    const cx = slamTextLetterCenter(ctx, amount, at + k, x, true);
    EFFECT.pose(ms - k * STAGGER_MS, run.digits[k], pose);
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
}
