// the "Minesweeper" event (experiment: Minesweeper; cash): it covers its
// crit, whose click freezes the screen under a grid of faint squares of
// light; a click flash on the clicked floor's button, and the squares flip
// open round it in flood-fill waves rolling across the screen, each one
// sparkling and spitting coins, numbers popping up beside the hidden
// mines; then the mines are found, lit-bomb wisps going off one after
// another in a chain of big blasts, each its own bang and shake and a spray
// of coins, until "CLEARED!" and the coins slam into the total in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01 } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
} from "../../../critFlash/critText";
import { totalSpot } from "../../cashFlow";
import { COLOR } from "../../../../palette";

const KEY = "minesweeper";
const REWARD = 4;
const COLS = 12;
const MAX_ROWS = 24;
const MINES = 5;
const MINE_CLEAR = 3;
const CLICK_MS = 120;
const FLOOD_MS = 760;
const FLASH_MS = 260;
const FUSE_MS = 320;
const OPEN_TINT = 0.08;
const OPEN_FLASH = 0.45;
const GRID_RES = 0.5;
const GRID_INSET = 5;
const GRID_ALPHA = 0.35;
const CELL_COINS = 3;
const CELL_REACH: [number, number] = [20, 90];
const MINE_COINS = 40;
const MINE_REACH: [number, number] = [60, 260];
const NUMBER_STYLE = { fontSize: 46, strokeWidth: 8 };
const CLEARED_STYLE = { fontSize: 88, strokeWidth: 13 };
const CALL_MS = 400;
const MINE = 0.36;
const FUSE = 14;
const MINE_BLAST = 220;
const FINAL_BLAST = 340;
const CLUSTER = 3;
const CLUSTER_BLAST = 110;
const CLUSTER_REACH = 70;
const BANG_GAP_MS = 60;

interface Cell {
  x: number;
  y: number;
  center: Point;
  d: number;
  mine: boolean;
  count: number;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceMinesweeperEvent = registerWispEvent(
  KEY,
  "Minesweeper",
  () => CONFIG.minesweeperEvent.chance,
  (floor, context, area) => {
    const { waveMs, chainMs, holdMs, mergeMs } = CONFIG.minesweeperEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const size = width / COLS;
    const rows = Math.min(MAX_ROWS, Math.ceil((area.bottom - area.top) / size));
    const oc = Math.min(
      COLS - 1,
      Math.max(0, Math.floor((button.x - area.left) / size)),
    );
    const or = Math.min(
      rows - 1,
      Math.max(0, Math.floor((button.y - area.top) / size)),
    );
    const cells: Cell[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < COLS; c++) {
        const x = area.left + c * size;
        const y = area.top + r * size;
        cells.push({
          x,
          y,
          center: { x: x + size / 2, y: y + size / 2 },
          d: Math.max(Math.abs(c - oc), Math.abs(r - or)),
          mine: false,
          count: 0,
        });
      }
    const candidates = cells.filter((cell) => cell.d >= MINE_CLEAR);
    const mines: Cell[] = [];
    while (mines.length < MINES && candidates.length > 0) {
      const cell = candidates.splice(
        Math.floor(Math.random() * candidates.length),
        1,
      )[0];
      cell.mine = true;
      mines.push(cell);
    }
    for (const mine of mines)
      for (const cell of cells)
        if (
          !cell.mine &&
          Math.abs(cell.x - mine.x) < size * 1.5 &&
          Math.abs(cell.y - mine.y) < size * 1.5
        )
          cell.count++;
    const maxD = Math.max(...cells.map((cell) => cell.d));
    const step = Math.min(waveMs, FLOOD_MS / Math.max(1, maxD));
    // each wave of the flood fill: the ring of squares d steps out
    const waves = Array.from({ length: maxD + 1 }, (_, d) => ({
      opens: CLICK_MS + d * step,
      cells: cells.filter((cell) => !cell.mine && cell.d === d),
    })).filter((w) => w.cells.length > 0);
    const floodEnd = CLICK_MS + maxD * step + FLASH_MS * 0.5;
    mines.sort((a, b) => a.d - b.d);
    const blasts: Blast[] = [];
    const booms = mines.map((mine, k) => {
      const last = k === mines.length - 1;
      const ms = floodEnd + k * chainMs;
      blasts.push({
        at: mine.center,
        ms,
        size: last ? FINAL_BLAST : MINE_BLAST,
        shake: last ? 1.6 : 0.8 + 0.12 * k,
      });
      for (let c = 0; c < CLUSTER; c++) {
        const a = (c / CLUSTER) * Math.PI * 2 + k;
        blasts.push({
          at: {
            x: mine.center.x + Math.cos(a) * CLUSTER_REACH,
            y: mine.center.y + Math.sin(a) * CLUSTER_REACH,
          },
          ms: ms + 45 + c * 25,
          size: CLUSTER_BLAST,
          shake: 0.5,
        });
      }
      const place = (): Point => mine.center;
      return { mine, ms, lit: ms - FUSE_MS - k * 40, place };
    });
    const cleared = booms[booms.length - 1].ms + 220;
    const endAt = cleared;
    const total = totalSpot(area);

    const grid = document.createElement("canvas");
    grid.width = Math.ceil(width * GRID_RES);
    grid.height = Math.ceil(rows * size * GRID_RES);
    const g = grid.getContext("2d")!;
    g.strokeStyle = COLOR.heavenlyGold;
    g.lineWidth = 3 * GRID_RES;
    for (const cell of cells)
      g.strokeRect(
        (cell.x - area.left + GRID_INSET) * GRID_RES,
        (cell.y - area.top + GRID_INSET) * GRID_RES,
        (size - GRID_INSET * 2) * GRID_RES,
        (size - GRID_INSET * 2) * GRID_RES,
      );
    const numbers = new Map<number, CritTextSprite>();
    for (const cell of cells)
      if (cell.count > 0 && !numbers.has(cell.count))
        numbers.set(
          cell.count,
          createCritTextSprite(
            String(cell.count),
            COLOR.heavenlyGold,
            NUMBER_STYLE,
          ),
        );
    const numbered = waves.flatMap((w) =>
      w.cells
        .filter((cell) => cell.count > 0)
        .map((cell) => ({
          cell,
          opens: w.opens,
          sprite: numbers.get(cell.count)!,
        })),
    );
    const clearedText = createCritTextSprite(
      "CLEARED!",
      COLOR.heavenlyGold,
      CLEARED_STYLE,
    );
    let lastBang = -Infinity;

    const clicking = createBeats(
      [CLICK_MS],
      (ms) => ms,
      () => {
        cover!.burst(button, 0.9);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(0.6);
      },
    );
    const opening = createBeats(
      waves,
      (w) => w.opens,
      (w, k) => {
        for (const cell of w.cells)
          cover!.launchFrom(
            cell.center,
            sprayTargets(
              cell.center,
              CELL_COINS,
              CELL_REACH,
              -Math.PI / 2,
              Math.PI,
            ),
          );
        if (!cover!.isLive() || k % 3 !== 0) return;
        playBloop();
        shakeScreen(0.25);
      },
    );
    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const spraying = createBeats(
      booms,
      (b) => b.ms,
      (b) =>
        cover!.launchFrom(
          b.mine.center,
          ringTargets(b.mine.center, MINE_COINS, MINE_REACH),
        ),
    );
    const finale = createBeats(
      [cleared],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          clicking.tick(ms, now);
          opening.tick(ms, now);
          booming.tick(ms, now);
          spraying.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms > endAt + CALL_MS) return;
          const show =
            clamp01(ms / CLICK_MS) * (1 - clamp01((ms - endAt) / CALL_MS));
          ctx.globalAlpha = GRID_ALPHA * show;
          ctx.drawImage(grid, area.left, area.top, width, rows * size);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = COLOR.heavenlyGold;
          for (const w of waves) {
            const t = (ms - w.opens) / FLASH_MS;
            if (t < 0) continue;
            ctx.globalAlpha =
              show * (OPEN_TINT + (t < 1 ? OPEN_FLASH * (1 - t) : 0));
            ctx.beginPath();
            for (const cell of w.cells)
              ctx.rect(
                cell.x + GRID_INSET,
                cell.y + GRID_INSET,
                size - GRID_INSET * 2,
                size - GRID_INSET * 2,
              );
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          for (const w of waves) {
            const t = (ms - w.opens) / FLASH_MS;
            if (t < 0 || t >= 1) continue;
            for (const cell of w.cells)
              stampGlimmer(
                ctx,
                cell.center.x,
                cell.center.y,
                size * 0.35 * (1 - t),
                t * 2,
                COLOR.heavenlyGold,
              );
          }
          ctx.restore();
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS * 2) return;
          const fade = 1 - clamp01((ms - endAt) / CALL_MS);
          ctx.globalAlpha = fade;
          for (const n of numbered) {
            if (ms < n.opens) continue;
            const pop = 1 - clamp01((ms - n.opens) / 140);
            drawCritTextSprite(
              ctx,
              n.sprite,
              n.cell.center.x,
              n.cell.center.y,
              1 + 0.5 * pop,
            );
          }
          ctx.globalAlpha = 1;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const b of booms) {
            if (ms < b.lit || ms >= b.ms) continue;
            drawLitFuse(
              ctx,
              b.mine.center,
              (ms - b.lit) / (b.ms - b.lit),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              b.place,
              ms,
              now,
              WISP_SIZE * MINE,
              0.5,
              b.lit,
              b.ms,
            );
          }
          const c = (ms - cleared) / CALL_MS;
          if (c >= 0 && c < 2) {
            ctx.globalAlpha = 1 - clamp01(c - 1);
            drawCritTextSprite(
              ctx,
              clearedText,
              (area.left + area.right) / 2,
              (area.top + area.bottom) / 2,
              1 + 0.6 * (1 - clamp01(c * 3)),
            );
            ctx.globalAlpha = 1;
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
