// Lucky sevens: a floor's label reaching any level with a 7 in it puts each 7,
// one after another, through a text effect (shared/textAnimations), slamming
// back in gold in a burst of glitter before cooling to its usual colour; the
// floor pays out once for every 7. Drawn by floors/star in place of its label
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { addTotalIncome } from "../../totalIncome";
import { playCoinDrop, playSwoosh } from "../../sound";
import { multiply } from "../../shared/bigNumber";
import { createBeats, type Beats } from "../../shared/eventBeats";
import { drawSlamText, slamTextLetterCenter } from "../../shared/eventEndSlam";
import {
  createLetterPose,
  drawGlitterBurst,
  drawLetter,
  flipSlam,
} from "../../shared/textAnimations";
import { rewardPayoutAmount } from "../incomePanel";
import { isHoldingUpgrade } from "../holdTally";

const EFFECT = flipSlam;
// each 7 starts STAGGER_MS after the one before
const STAGGER_MS = 300;
const STROKE = 5;
const pose = createLetterPose();

interface Run {
  startedAt: number;
  text: string;
  // the label's letters that are 7s, left to right
  sevenAt: number[];
  beats: Beats<number>;
  paid: boolean;
}
const runs = new WeakMap<Floor, Run>();

const burstAt = (i: number): number => i * STAGGER_MS + EFFECT.landMs;

function pay(floor: Floor, run: Run): void {
  run.paid = true;
  addTotalIncome(
    multiply(rewardPayoutAmount(floor, Date.now()), run.sevenAt.length),
  );
}

function start(floor: Floor, level: number): void {
  const text = `Lvl ${level}`;
  const sevenAt: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === "7") sevenAt.push(i);
  const sevens = sevenAt.length;
  playSwoosh();
  const run: Run = {
    startedAt: Date.now(),
    text,
    sevenAt,
    paid: false,
    beats: createBeats(
      sevenAt.map((_, i) => i),
      burstAt,
      (i) => {
        playCoinDrop();
        if (i === sevens - 1) pay(floor, run);
      },
    ),
  };
  runs.set(floor, run);
}

const hasSeven = (level: number): boolean => String(level).includes("7");

// a level must hold this long, the button let go, before it counts, so a long
// press or a crit racing through levels only procs on the one it stops at
const SETTLE_MS = 200;
interface Watch {
  level: number;
  changedAt: number;
  // the last level that counted
  settled: number;
}
const watches = new WeakMap<Floor, Watch>();

// every frame the label's drawn: a new level with a 7 in it, by any means (a
// buy, a crit, free levels), starts the spin once it settles; the label
// moving on mid-spin ends it (paying what it owed). The first look only
// remembers the level
export function noteLuckyLevel(floor: Floor): void {
  const level = floor.upgradeCount;
  const now = Date.now();
  const watch = watches.get(floor);
  if (!watch) {
    watches.set(floor, { level, changedAt: now, settled: level });
    return;
  }
  if (level !== watch.level || isHoldingUpgrade(floor)) {
    if (level !== watch.level) {
      watch.level = level;
      const run = runs.get(floor);
      if (run) {
        runs.delete(floor);
        if (!run.paid) pay(floor, run);
      }
    }
    watch.changedAt = now;
    return;
  }
  if (level === watch.settled || now - watch.changedAt < SETTLE_MS) return;
  const previous = watch.settled;
  watch.settled = level;
  if (level > previous && hasSeven(level)) start(floor, level);
}

export function hasLuckySevens(floor: Floor): boolean {
  return runs.has(floor);
}

// the test button: the spin on this floor, at its level if that has a 7
export function forceLuckySevens(floor: Floor): void {
  start(floor, hasSeven(floor.upgradeCount) ? floor.upgradeCount : 777);
}

// the label spinning its 7s at x, top, height tall (ctx's font, textAlign
// left, textBaseline top), restFill its usual colour; false once it's done,
// so the label draws itself
export function drawLuckySevens(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  x: number,
  top: number,
  height: number,
  restFill: string,
): boolean {
  const run = runs.get(floor);
  if (!run) return false;
  const { text, sevenAt } = run;
  const ms = Date.now() - run.startedAt;
  const end = (sevenAt.length - 1) * STAGGER_MS + EFFECT.ms;
  if (ms >= end) {
    runs.delete(floor);
    return false;
  }
  const now = performance.now();
  run.beats.tick(ms, now);
  const cy = top + height / 2;
  // the other letters still, one by one where the whole label puts them
  let next = 0;
  for (let k = 0; k < text.length; k++) {
    if (k === sevenAt[next]) {
      next++;
      continue;
    }
    if (text[k] === " ") continue;
    const cx = slamTextLetterCenter(ctx, text, k, x, false);
    ctx.save();
    ctx.textAlign = "center";
    drawSlamText(
      ctx,
      null,
      text[k],
      cx,
      top,
      height,
      restFill,
      COLOR.black,
      STROKE,
    );
    ctx.restore();
  }
  for (let i = 0; i < sevenAt.length; i++) {
    const cx = slamTextLetterCenter(ctx, text, sevenAt[i], x, false);
    EFFECT.pose(ms - i * STAGGER_MS, "7", pose);
    drawLetter(ctx, pose, cx, cy, height, restFill, COLOR.black, STROKE, false);
    drawGlitterBurst(ctx, cx, cy, height, ms - burstAt(i));
  }
  return true;
}
