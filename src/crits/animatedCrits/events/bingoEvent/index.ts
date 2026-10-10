// the "Bingo" event (experiment: a giant bingo card; cash): it covers its
// crit, whose click freezes the screen while a five by five bingo card of
// faint golden dots spreads over it; numbers get called and dot after dot
// is daubed, each blazing up with a bloop, a jolt and a pop of coins, ever
// faster, until a whole row is full: a wisp streaks along the winning line
// lighting it up and BINGO! slams down over the screen in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawCachedCritText } from "../../../critFlash/critText";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "bingo";
const REWARD = 4;
const SIZE = 5;
const EXTRA = 8;
// the card fills CARD of the screen; a dot glows DOT px round, a daub DAUB
const CARD = 0.8;
const DOT = 12;
const DAUB = 34;
const POP = 5;
const POP_REACH: [number, number] = [20, 80];
const STREAK_MS = 260;
const LABEL = "BINGO!";
const FONT = 64;
const SLAM_MS = 220;
const DOT_GLOW = fadeStops(COLOR.heavenlyGold);
const DAUB_GLOW = fadeStops(COLOR.white, 0.3);
const DAUB_SHAKE: [number, number] = [0.3, 0.9];

export const forceBingoEvent = registerWispEvent(
  KEY,
  "Bingo",
  () => CONFIG.bingoEvent.chance,
  (floor, context, area) => {
    const { spreadMs, callsMs, holdMs, mergeMs } = CONFIG.bingoEvent;
    const width = (area.right - area.left) * CARD;
    const height = (area.bottom - area.top) * CARD;
    const left = (area.left + area.right) / 2 - width / 2;
    const top = (area.top + area.bottom) / 2 - height / 2;
    const cells: Point[] = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        cells.push({
          x: left + width * ((c + 0.5) / SIZE),
          y: top + height * ((r + 0.5) / SIZE),
        });
    // the winning row, daubed among a few other calls, its last cell last
    const row = Math.floor(Math.random() * SIZE);
    const line = Array.from({ length: SIZE }, (_, c) => row * SIZE + c);
    const others = cells
      .map((_, i) => i)
      .filter((i) => Math.floor(i / SIZE) !== row)
      .sort(() => Math.random() - 0.5)
      .slice(0, EXTRA);
    const shuffled = [...line.slice(0, -1), ...others].sort(
      () => Math.random() - 0.5,
    );
    const order = [...shuffled, line[SIZE - 1]];
    let clock: number = spreadMs;
    const daubs = order.map((cell, k) => {
      clock += lerp(callsMs, k / (order.length - 1));
      return { cell, at: clock };
    });
    const daubedAt = new Map(daubs.map((d) => [d.cell, d.at]));
    const lineAt = clock + 80;
    const slamAt = lineAt + STREAK_MS;
    const endAt = slamAt + SLAM_MS;
    const from = cells[line[0]];
    const to = cells[line[SIZE - 1]];
    const streakAt: Point = { x: 0, y: from.y };
    const streak = (ms: number): Point | null => {
      if (ms < lineAt || ms > slamAt) return null;
      streakAt.x = lerp(
        [from.x - 30, to.x + 30],
        easeOut((ms - lineAt) / STREAK_MS),
      );
      return streakAt;
    };
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };

    const daubing = createBeats(
      daubs,
      (d) => d.at,
      (d, k) => {
        const at = cells[d.cell];
        cover!.launchFrom(at, ringTargets(at, POP, POP_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DAUB_SHAKE, k / (daubs.length - 1)));
      },
    );
    const finale = createBeats(
      [lineAt, slamAt],
      (ms) => ms,
      (_, k) => {
        if (k === 1) cover!.blast(center);
        else if (cover!.isLive()) playSwoosh();
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
          daubing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 600) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 600 : 1;
          ctx.globalCompositeOperation = "lighter";
          cells.forEach((cell, i) => {
            const shown = clamp01((ms - (i / cells.length) * spreadMs) / 120);
            if (shown <= 0) return;
            const daubed = daubedAt.get(i);
            const won = ms > lineAt && Math.floor(i / SIZE) === row;
            ctx.globalAlpha = shown * fade * (won ? 1 : 0.6);
            drawGlow(ctx, DOT_GLOW, cell.x, cell.y, DOT);
            if (daubed !== undefined && ms >= daubed) {
              const pop = easeOutBack(clamp01((ms - daubed) / 160));
              ctx.globalAlpha = fade;
              drawGlow(
                ctx,
                DAUB_GLOW,
                cell.x,
                cell.y,
                DAUB * pop * (won ? 1.4 : 1),
              );
            }
          });
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
          drawWispBetween(
            ctx,
            streak,
            ms,
            now,
            WISP_SIZE * 0.7,
            1,
            lineAt,
            slamAt,
          );
          if (ms >= slamAt) {
            const u = easeOut(clamp01((ms - slamAt) / SLAM_MS));
            ctx.save();
            ctx.globalAlpha = fade;
            ctx.translate(center.x, center.y);
            ctx.scale(lerp([3, 1], u), lerp([3, 1], u));
            drawCachedCritText(ctx, LABEL, 0, 0, COLOR.heavenlyGold, {
              fontSize: FONT,
              strokeWidth: 8,
            });
            ctx.restore();
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
