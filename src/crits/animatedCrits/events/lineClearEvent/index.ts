// the "Line Clear" event: it covers its crit, whose click freezes the screen
// while blocks hard-drop from above the screen one after another, ever
// faster, like the old falling-blocks game, each slamming down onto the
// screen's bottom with a squash, a burst, a thump, a jolt and a couple of
// coins, stacking up into four full rows; the last block locks them all in,
// the rows blink white as the screen rumbles, then all four clear at once in
// a huge blast, flash, bang and shake that bursts every block into coins,
// which merge into the total. Pays floor income × floor number × REWARD (see
// ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp, clamp01 } from "../../../../shared/easing";

const KEY = "lineClear";
const REWARD = 4;
// a 10 × 4 well, filled exactly by these pieces dropped in this order: each
// lands straight down onto ones already in ([column, row], row 0 at the bottom)
const COLS = 10;
const ROWS = 4;
const PIECES: { cells: [number, number][]; color: string }[] = [
  {
    cells: [
      [3, 0],
      [4, 0],
      [5, 0],
      [6, 0],
    ],
    color: COLOR.cyan,
  },
  {
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    color: COLOR.cyan,
  },
  {
    cells: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    color: COLOR.starYellow,
  },
  {
    cells: [
      [7, 0],
      [7, 1],
      [7, 2],
      [8, 0],
    ],
    color: COLOR.orange,
  },
  {
    cells: [
      [3, 1],
      [4, 1],
      [5, 1],
      [3, 2],
    ],
    color: COLOR.orange,
  },
  {
    cells: [
      [9, 0],
      [9, 1],
      [9, 2],
      [8, 1],
    ],
    color: COLOR.purple,
  },
  {
    cells: [
      [6, 1],
      [4, 2],
      [5, 2],
      [6, 2],
    ],
    color: COLOR.blue,
  },
  {
    cells: [
      [1, 2],
      [2, 2],
      [1, 3],
      [2, 3],
    ],
    color: COLOR.starYellow,
  },
  {
    cells: [
      [7, 3],
      [8, 3],
      [9, 3],
      [8, 2],
    ],
    color: COLOR.purple,
  },
  {
    cells: [
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
    ],
    color: COLOR.cyan,
  },
];
// the well: SIDE px in from the screen's sides, BOTTOM px up off its bottom,
// at most TALL of the screen's height
const SIDE = 50;
const BOTTOM = 30;
const TALL = 0.45;
const INSET = 3;
const RADIUS = 10;
// each piece starts its drop this far above the screen
const ABOVE = 40;
// each landing: a squash, a burst at its foot, a jolt growing as they stack
const SQUASH = 0.2;
const LAND_BURST = 0.22;
const LAND_BURST_MS = 280;
const LAND_SHAKE: [number, number] = [0.35, 0.8];
const LAND_COINS = 2;
const LAND_COIN_RISE = 140;
// the rows blinking white before they clear
const BLINK_HZ = 14;
const BLINK_SHAKE = 0.6;
// the clear
const CLEAR_MS = 220;
const BLAST_SHAKE = 2.8;
const BLAST_SCALE = 2;
const SPARK_REACH = 420;
const SPARK_SIZE = 24;
const ROW_BURST = 0.45;
const ROW_BURST_MS = 420;
const BLOCK_COINS = 2;
const BLOCK_COIN_REACH: [number, number] = [40, 240];
const FLASH_MS = 220;
const FLASH_ALPHA = 0.7;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.lineClearEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { landAt, blinkMs, holdMs, mergeMs } = CONFIG.lineClearEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const cell = Math.min((width - SIDE * 2) / COLS, (height * TALL) / ROWS);
      const left = area.left + (width - cell * COLS) / 2;
      const floorY = area.bottom - BOTTOM;
      // mirrored half the time, which keeps every drop landing true
      const flip = Math.random() < 0.5;
      const pieces = PIECES.map(({ cells, color }) => {
        const blocks = cells.map(([c, r]) => ({
          x: left + (flip ? COLS - 1 - c : c) * cell,
          y: floorY - (r + 1) * cell,
        }));
        const bottom = Math.max(...blocks.map((b) => b.y)) + cell;
        const minX = Math.min(...blocks.map((b) => b.x));
        const maxX = Math.max(...blocks.map((b) => b.x)) + cell;
        return {
          blocks,
          color,
          bottom,
          cx: (minX + maxX) / 2,
          drop: bottom - area.top + ABOVE,
        };
      });
      const lockAt = landAt[landAt.length - 1];
      const clearAt = lockAt + blinkMs;

      const startedAt = performance.now();
      let landed = 0;
      const landedAt: number[] = [];
      let clearedAt: number | null = null;

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: clearAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            while (landed < pieces.length && ms >= landAt[landed])
              land(landed++, now);
            if (clearedAt === null && ms >= clearAt) clear(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            const since = clearedAt === null ? null : now - clearedAt;
            const blink =
              ms >= lockAt && since === null
                ? 0.5 +
                  0.5 *
                    Math.sin(((ms - lockAt) / 1000) * BLINK_HZ * Math.PI * 2)
                : 0;
            pieces.forEach((piece, k) => {
              const startMs = k === 0 ? 0 : landAt[k - 1];
              if (ms < startMs) return;
              ctx.save();
              if (k >= landed) {
                // still dropping, gathering speed
                const u = clamp01((ms - startMs) / (landAt[k] - startMs));
                ctx.translate(0, -piece.drop * (1 - u * u));
              } else if (since === null) {
                const t = now - landedAt[k];
                const squash =
                  1 - SQUASH * Math.exp(-t / 50) * Math.cos(t / 25);
                ctx.translate(piece.cx, piece.bottom);
                ctx.scale(1 / Math.sqrt(squash), squash);
                ctx.translate(-piece.cx, -piece.bottom);
              }
              let alpha = 1;
              let grow = 1;
              if (since !== null) {
                const t = since / CLEAR_MS;
                if (t >= 1) {
                  ctx.restore();
                  return;
                }
                alpha = 1 - t;
                grow = 1 + 0.5 * t;
              }
              for (const block of piece.blocks) {
                const s = (cell - INSET * 2) * grow;
                const x = block.x + cell / 2 - s / 2;
                const y = block.y + cell / 2 - s / 2;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = since !== null ? COLOR.white : piece.color;
                ctx.beginPath();
                ctx.roundRect(x, y, s, s, RADIUS);
                ctx.fill();
                ctx.globalAlpha = alpha * 0.45;
                ctx.fillStyle = COLOR.white;
                ctx.beginPath();
                ctx.roundRect(x + 6, y + 6, s - 12, s * 0.28, RADIUS / 2);
                ctx.fill();
                if (blink > 0) {
                  ctx.globalAlpha = blink * 0.85;
                  ctx.beginPath();
                  ctx.roundRect(x, y, s, s, RADIUS);
                  ctx.fill();
                }
              }
              ctx.restore();
            });
            ctx.globalAlpha = 1;
            landedAt.forEach((at, k) =>
              drawWhiteBurst(
                ctx,
                pieces[k].cx,
                pieces[k].bottom,
                (now - at) / LAND_BURST_MS,
                LAND_BURST,
              ),
            );
            if (since !== null) {
              const cx = left + (cell * COLS) / 2;
              for (let r = 0; r < ROWS; r++)
                for (const side of [-1, 1])
                  drawWhiteBurst(
                    ctx,
                    cx + side * cell * COLS * 0.25,
                    floorY - (r + 0.5) * cell,
                    since / ROW_BURST_MS,
                    ROW_BURST,
                  );
              drawExplosion(
                ctx,
                cx,
                floorY - (cell * ROWS) / 2,
                since,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
              const flash = 1 - since / FLASH_MS;
              if (flash > 0) {
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = FLASH_ALPHA * flash;
                ctx.fillStyle = COLOR.white;
                ctx.fillRect(area.left, area.top, width, height);
              }
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame piece k slams down
      function land(k: number, now: number): void {
        landedAt[k] = now;
        if (!cover?.isLive()) return;
        playBloop();
        const last = k === pieces.length - 1;
        shakeScreen(
          last
            ? BLINK_SHAKE + LAND_SHAKE[1]
            : lerp(LAND_SHAKE, k / (pieces.length - 1)),
        );
        const { cx, bottom } = pieces[k];
        cover.launchFrom(
          { x: cx, y: bottom },
          Array.from({ length: LAND_COINS }, () => ({
            x: cx + (Math.random() * 2 - 1) * LAND_COIN_RISE,
            y: bottom - LAND_COIN_RISE * (0.5 + Math.random()),
          })),
        );
      }
      // on the frame all four rows clear: every block bursts into coins
      function clear(now: number): void {
        clearedAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BLAST_SHAKE);
        for (const piece of pieces)
          for (const block of piece.blocks) {
            const c = { x: block.x + cell / 2, y: block.y + cell / 2 };
            cover.launchFrom(
              c,
              Array.from({ length: BLOCK_COINS }, () => {
                const angle = Math.random() * Math.PI * 2;
                const r = lerp(BLOCK_COIN_REACH, Math.sqrt(Math.random()));
                return {
                  x: c.x + Math.cos(angle) * r,
                  y: c.y + Math.sin(angle) * r,
                };
              }),
            );
          }
      }
    },
  },
  { label: "Line Clear", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Line Clear
export function forceLineClearEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
