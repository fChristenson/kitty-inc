// Matching digits: a group of three between the total's commas turning up all
// the same digit (444, 777) jumps out one digit after another in gold, slams
// back in a burst of glitter, and the total pays a small bonus (set with
// setMatchingDigitsPayout). Drawn by shared/totalIncomeReadout over its amount
import { COLOR } from "../../palette";
import { playCoinDrop } from "../../sound";
import { clamp01, easeIn, easeOutCubic } from "../easing";
import { createBeats, type Beats } from "../eventBeats";
import { drawSlamText, slamTextLetterCenter, SLAM_GOLD } from "../eventEndSlam";
import { playSlamExplosion } from "../explosionBang";
import { drawGlow, fadeStops } from "../glowSprite";
import { kickShake } from "../screenShake";
import { triggerHudTotalFlash } from "../totalIncomeCoins";
import { hash01, stampGlimmer } from "../twinkle";

const DIGITS = 3;
// each digit jumps up LIFT of its height growing to GROW over JUMP_MS, hangs
// HANG_MS, slams back over DROP_MS; the next one goes STAGGER_MS later
const JUMP_MS = 200;
const HANG_MS = 60;
const DROP_MS = 90;
const STAGGER_MS = 70;
const LIFT = 0.6;
const GROW = 1.4;
const SQUASH_MS = 120;
const landAt = (k: number): number =>
  k * STAGGER_MS + JUMP_MS + HANG_MS + DROP_MS;
const LAST_LAND = landAt(DIGITS - 1);
// gold from the jump, held after the last slam, then back to the amount's green
const GOLD_HOLD_MS = 450;
const GOLD_FADE_MS = 350;
const END_MS = LAST_LAND + GOLD_HOLD_MS + GOLD_FADE_MS;
// a quiet spell after each, so a fast-counting total doesn't fire them back to back
const COOLDOWN_MS = 4000;
const LAND_KICK = 0.3;
const LAST_KICK = 0.9;
// the burst on the last slam: glitter round the group, a gold flash
const GLITTER = 22;
const GLITTER_MS = 550;
const GLITTER_REACH = 2.2; // of the digits' height
const GLITTER_SIZE = 0.5;
const FLASH_MS = 260;
const FLASH = fadeStops(COLOR.heavenlyGold);
const GLITTER_ANGLE = Array.from(
  { length: GLITTER },
  (_, k) => ((k + hash01(k, 1) * 0.6) / GLITTER) * Math.PI * 2,
);
const GLITTER_REACHES = Array.from(
  { length: GLITTER },
  (_, k) => 0.45 + 0.55 * hash01(k, 2),
);

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

function fire(k: number): void {
  const now = Date.now();
  if (k < DIGITS - 1) {
    kickShake(LAND_KICK, now);
    playCoinDrop();
    return;
  }
  kickShake(LAST_KICK, now);
  playSlamExplosion();
  payout?.();
  triggerHudTotalFlash();
}

function start(fromEnd: number, digits: string): void {
  run = {
    startedAt: Date.now(),
    fromEnd,
    digits,
    beats: createBeats(
      Array.from({ length: DIGITS }, (_, k) => k),
      landAt,
      fire,
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
  const sinceLast = ms - LAST_LAND;
  const fade = 1 - clamp01((sinceLast - GOLD_HOLD_MS) / GOLD_FADE_MS);
  for (let k = 0; k < DIGITS; k++) {
    const cx = slamTextLetterCenter(ctx, amount, at + k, x, true);
    const t = ms - k * STAGGER_MS;
    const rise = easeOutCubic(clamp01(t / JUMP_MS));
    const drop = easeIn(clamp01((t - JUMP_MS - HANG_MS) / DROP_MS));
    const up = rise * (1 - drop);
    const since = ms - landAt(k);
    const squash = since >= 0 ? Math.exp(-since / SQUASH_MS) : 0;
    const size = 1 + (GROW - 1) * up;
    const gold = Math.min(clamp01(t / JUMP_MS), fade);
    ctx.save();
    ctx.translate(cx, cy - LIFT * height * up);
    ctx.scale(size * (1 + 0.35 * squash), size * (1 - 0.3 * squash));
    ctx.textAlign = "center";
    const char = run.digits[k];
    if (gold < 1)
      drawSlamText(
        ctx,
        null,
        char,
        0,
        -height / 2,
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
        -height / 2,
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
  if (sinceLast >= 0 && sinceLast < GLITTER_MS) {
    const mid = slamTextLetterCenter(ctx, amount, at + 1, x, true);
    drawBurst(ctx, mid, cy, height, sinceLast);
  }
}

function drawBurst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  height: number,
  since: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (since < FLASH_MS) {
    ctx.globalAlpha = 1 - since / FLASH_MS;
    drawGlow(ctx, FLASH, cx, cy, height * 2.2, 0.6);
    ctx.globalAlpha = 1;
  }
  const u = since / GLITTER_MS;
  const out = easeOutCubic(u);
  const reach = height * GLITTER_REACH * out;
  for (let k = 0; k < GLITTER; k++) {
    const r = reach * GLITTER_REACHES[k];
    stampGlimmer(
      ctx,
      cx + Math.cos(GLITTER_ANGLE[k]) * r * 1.3,
      cy + Math.sin(GLITTER_ANGLE[k]) * r * 0.7,
      height * GLITTER_SIZE * (1 - u),
      k + u * 2,
      k % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  ctx.restore();
}
