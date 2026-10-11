// Lucky sevens: a floor's label reaching any level with a 7 in it puts each 7,
// one after another, through a text effect picked at random
// (shared/textAnimations), landing back in gold in a burst of glitter before
// cooling to its usual colour; the floor pays out once for every 7. Drawn by
// floors/star in place of its label
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { addTotalIncome } from "../../totalIncome";
import { playCoinDrop, playSwoosh } from "../../sound";
import { multiply } from "../../shared/bigNumber";
import {
  drawLettersExcept,
  drawLetterShow,
  startLetterShow,
  type LetterShow,
  type LetterStyle,
} from "../../shared/textAnimations";
import { rewardPayoutAmount } from "../incomePanel";
import { isHoldingUpgrade } from "../holdTally";

// each 7 starts STAGGER_MS after the one before
const STAGGER_MS = 300;
const STROKE = 5;
const style: LetterStyle = {
  fill: COLOR.white,
  stroke: COLOR.black,
  strokeWidth: STROKE,
  tabular: false,
};

interface Run {
  text: string;
  show: LetterShow;
  paid: boolean;
}
const runs = new WeakMap<Floor, Run>();

function pay(floor: Floor, run: Run): void {
  run.paid = true;
  addTotalIncome(
    multiply(rewardPayoutAmount(floor, Date.now()), run.show.letters.length),
  );
}

function start(floor: Floor, level: number): void {
  const text = `Lvl ${level}`;
  const sevenAt: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === "7") sevenAt.push(i);
  playSwoosh();
  const run: Run = {
    text,
    paid: false,
    show: startLetterShow(sevenAt, {
      staggerMs: STAGGER_MS,
      onLand: (_, last) => {
        playCoinDrop();
        if (last) pay(floor, run);
      },
    }),
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
  style.fill = restFill;
  if (Date.now() - run.show.startedAt >= run.show.ms) {
    runs.delete(floor);
    if (!run.paid) pay(floor, run);
    return false;
  }
  drawLettersExcept(ctx, run.text, run.show.letters, x, top, height, style);
  drawLetterShow(ctx, run.show, run.text, 0, x, top, height, style);
  return true;
}
