// Lucky sevens: a floor's label reaching any level with a 7 in it sends each
// 7, one after another, flying up out of the number half as big again,
// spinning seven times round its upright axis, then slamming back in gold in a
// burst of glitter before cooling to its usual colour; the floor pays out once
// for every 7. Drawn by floors/star in place of its label
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { addTotalIncome } from "../../totalIncome";
import { playCoinDrop, playCritPayout, playSwoosh } from "../../sound";
import { multiply } from "../../shared/bigNumber";
import { clamp01, easeIn, easeOutCubic, smoothstep } from "../../shared/easing";
import { createBeats, type Beats } from "../../shared/eventBeats";
import {
  drawSlamText,
  SLAM_GOLD,
  slamTextLetterCenter,
} from "../../shared/eventEndSlam";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { kickShake } from "../../shared/screenShake";
import { triggerHudTotalFlash } from "../../shared/totalIncomeCoins";
import { hash01, stampGlimmer } from "../../shared/twinkle";
import { rewardPayoutAmount } from "../incomePanel";
import { isHoldingUpgrade } from "../holdTally";

// each 7 flies up LIFT of its height over RISE_MS growing to GROW, spins
// SPINS times round its upright axis over SPIN_MS, then slams back over
// SLAM_MS, squashing; the next one starts STAGGER_MS later
const RISE_MS = 180;
const SPIN_MS = 700;
const SLAM_MS = 110;
const FLIGHT_MS = RISE_MS + SPIN_MS + SLAM_MS;
const STAGGER_MS = 300;
// kept low enough that the floor above, drawn after, never covers it
const LIFT = 0.9;
const GROW = 1.5;
const SPINS = 7;
const SQUASH_MS = 120;
// edge-on it keeps a sliver, never vanishing
const MIN_FACE = 0.06;
// its burst: glitter flung out round it, a gold flash
const GLITTER = 16;
const GLITTER_MS = 500;
const GLITTER_REACH = 110;
const GLITTER_SIZE = 24;
const FLASH_MS = 220;
const FLASH_R = 1.6; // of the label's height
const FLASH = fadeStops(COLOR.heavenlyGold);
// gold once it's spun, held, then back to the label's own colour
const GOLD_HOLD_MS = 450;
const GOLD_FADE_MS = 400;
const BURST_KICK = 0.35;
const LAST_KICK = 0.8;
const STROKE = 5;

const GLITTER_ANGLE = Array.from(
  { length: GLITTER },
  (_, k) => ((k + hash01(k, 1) * 0.6) / GLITTER) * Math.PI * 2,
);
const GLITTER_REACHES = Array.from(
  { length: GLITTER },
  (_, k) => GLITTER_REACH * (0.5 + 0.5 * hash01(k, 2)),
);

interface Run {
  startedAt: number;
  text: string;
  // the label's letters that are 7s, left to right
  sevenAt: number[];
  beats: Beats<number>;
  paid: boolean;
}
const runs = new WeakMap<Floor, Run>();

const burstAt = (i: number): number => i * STAGGER_MS + FLIGHT_MS;

function pay(floor: Floor, run: Run): void {
  run.paid = true;
  addTotalIncome(
    multiply(rewardPayoutAmount(floor, Date.now()), run.sevenAt.length),
  );
  triggerHudTotalFlash();
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
        const now = Date.now();
        if (i < sevens - 1) {
          kickShake(BURST_KICK, now);
          playCoinDrop();
          return;
        }
        kickShake(LAST_KICK, now);
        playCritPayout();
        pay(floor, run);
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
  const end = burstAt(sevenAt.length - 1) + GOLD_HOLD_MS + GOLD_FADE_MS;
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
    const t = ms - i * STAGGER_MS;
    const since = ms - burstAt(i);
    const rise = easeOutCubic(clamp01(t / RISE_MS));
    const fall = easeIn(clamp01((t - RISE_MS - SPIN_MS) / SLAM_MS));
    const up = rise * (1 - fall);
    const gold =
      since < 0
        ? clamp01(t / RISE_MS)
        : 1 - clamp01((since - GOLD_HOLD_MS) / GOLD_FADE_MS);
    const size = 1 + (GROW - 1) * up;
    const face = Math.cos(
      SPINS * Math.PI * 2 * smoothstep(clamp01((t - RISE_MS) / SPIN_MS)),
    );
    const squash = since >= 0 ? Math.exp(-since / SQUASH_MS) : 0;
    ctx.save();
    ctx.translate(cx, cy - LIFT * height * up);
    ctx.scale(
      size *
        (1 + 0.35 * squash) *
        (face < 0 ? Math.min(face, -MIN_FACE) : Math.max(face, MIN_FACE)),
      size * (1 - 0.3 * squash),
    );
    ctx.textAlign = "center";
    if (gold < 1)
      drawSlamText(
        ctx,
        null,
        "7",
        0,
        -height / 2,
        height,
        restFill,
        COLOR.black,
        STROKE,
        false,
        0,
        true,
      );
    if (gold > 0) {
      ctx.globalAlpha *= gold;
      drawSlamText(
        ctx,
        null,
        "7",
        0,
        -height / 2,
        height,
        SLAM_GOLD,
        COLOR.black,
        STROKE,
        false,
        0,
        true,
      );
    }
    ctx.restore();
    if (since >= 0 && since < GLITTER_MS) drawBurst(ctx, cx, cy, height, since);
  }
  return true;
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
    drawGlow(ctx, FLASH, cx, cy, height * FLASH_R);
    ctx.globalAlpha = 1;
  }
  const u = since / GLITTER_MS;
  const out = easeOutCubic(u);
  for (let k = 0; k < GLITTER; k++) {
    const reach = GLITTER_REACHES[k] * out;
    stampGlimmer(
      ctx,
      cx + Math.cos(GLITTER_ANGLE[k]) * reach,
      cy + Math.sin(GLITTER_ANGLE[k]) * reach * 0.8,
      GLITTER_SIZE * (1 - u),
      k + u * 2,
      k % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  ctx.restore();
}
