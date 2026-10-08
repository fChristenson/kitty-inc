// the "Sweeper" event (experiment: a minesweeper board; cash): it covers
// its crit, whose click freezes the screen while a grid of dim golden cells
// spreads over it like a minesweeper board; the clicked floor's button
// opens the first cell and the reveal floods outward across the board in
// rings, ever faster, numbers popping up and cells spitting coins as they
// open, the hidden mines lighting up as wisps; when the board is cleared
// every mine goes off at once in a huge blast and shake. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawCachedCritText } from "../../../critFlash/critText";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "sweeper";
const REWARD = 4;
// cells CELL px apart; MINES of them are mines; the flood steps a ring at
// a time, PACE under 1 speeding it up
const CELL = 46;
const MINES = 0.12;
const PACE = 0.8;
const DIGITS = ["1", "2", "3"];
const DIGIT_FONT = 22;
const HIDDEN = 10;
const OPEN = 18;
const MINE = 0.35;
const COINS = 2;
const REACH: [number, number] = [10, 50];
const HIDDEN_GLOW = fadeStops(COLOR.heavenlyGold, 0.4);
const OPEN_GLOW = fadeStops(COLOR.white, 0.2);
const RING_SHAKE: [number, number] = [0.2, 0.8];

interface Cell {
  at: Point;
  shown: number;
  opens: number;
  mine: boolean;
  digit: string | null;
  spot: () => Point;
}

export const forceSweeperEvent = registerWispEvent(
  KEY,
  "Sweeper",
  () => CONFIG.sweeperEvent.chance,
  (floor, context, area) => {
    const { spreadMs, floodMs, holdMs, mergeMs } = CONFIG.sweeperEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const cols = Math.max(4, Math.floor((area.right - area.left) / CELL));
    const rows = Math.max(4, Math.floor((area.bottom - area.top) / CELL));
    const left = (area.left + area.right) / 2 - ((cols - 1) * CELL) / 2;
    const top = (area.top + area.bottom) / 2 - ((rows - 1) * CELL) / 2;
    // the flood starts at the cell nearest the button
    const startC = Math.min(
      cols - 1,
      Math.max(0, Math.round((button.x - left) / CELL)),
    );
    const startR = Math.min(
      rows - 1,
      Math.max(0, Math.round((button.y - top) / CELL)),
    );
    const rings = Math.max(
      startC,
      cols - 1 - startC,
      startR,
      rows - 1 - startR,
    );
    const ringAt = (d: number) => spreadMs + floodMs * (d / rings) ** PACE;
    const cells: Cell[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const d = Math.max(Math.abs(c - startC), Math.abs(r - startR));
        const mine = d > 0 && Math.random() < MINES;
        const at: Point = { x: left + c * CELL, y: top + r * CELL };
        cells.push({
          at,
          shown: (spreadMs * (r * cols + c)) / (rows * cols),
          opens: ringAt(d),
          mine,
          digit:
            !mine && Math.random() < 0.4
              ? DIGITS[Math.floor(Math.random() * 3)]
              : null,
          spot: () => at,
        });
      }
    const mines = cells.filter((c) => c.mine);
    const endAt = ringAt(rings) + 200;
    const ringBeats = Array.from({ length: rings + 1 }, (_, d) => ringAt(d));
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };

    const flooding = createBeats(
      ringBeats,
      (ms) => ms,
      (_, d) => {
        if (!cover?.isLive() || d % 2 !== 0) return;
        playBloop();
        shakeScreen(lerp(RING_SHAKE, d / rings));
      },
    );
    const opening = createBeats(
      cells.filter((c) => c.digit),
      (c) => c.opens,
      (c) => cover!.launchFrom(c.at, ringTargets(c.at, COINS, REACH)),
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const m of mines) cover!.burst(m.at, 0.4);
        cover!.blast(center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flooding.tick(ms, now);
          opening.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 400) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 400 : 1;
          ctx.globalCompositeOperation = "lighter";
          for (const c of cells) {
            if (ms < c.shown) continue;
            const open = clamp01((ms - c.opens) / 120);
            ctx.globalAlpha = 0.5 * fade * (1 - open);
            if (open < 1) drawGlow(ctx, HIDDEN_GLOW, c.at.x, c.at.y, HIDDEN);
            if (open > 0 && !c.mine) {
              ctx.globalAlpha = 0.35 * fade;
              drawGlow(
                ctx,
                OPEN_GLOW,
                c.at.x,
                c.at.y,
                OPEN * easeOutBack(open),
              );
            }
          }
          ctx.globalAlpha = fade;
          ctx.globalCompositeOperation = "source-over";
          for (const c of cells)
            if (c.digit && ms >= c.opens)
              drawCachedCritText(
                ctx,
                c.digit,
                c.at.x,
                c.at.y,
                COLOR.heavenlyGold,
                {
                  fontSize: DIGIT_FONT,
                  strokeWidth: 4,
                },
              );
          ctx.globalAlpha = 1;
          for (const m of mines)
            drawWispBetween(
              ctx,
              m.spot,
              ms,
              now,
              WISP_SIZE * MINE,
              0.8,
              m.opens,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
