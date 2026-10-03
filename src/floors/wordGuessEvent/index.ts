// the "Word Guess" event (experiment: a daily word game; cash): it covers
// its crit, whose click freezes the screen while a grid of tiles appears
// over it like a word puzzle; guess after guess is typed in and each row
// flips over tile by tile, the right letters blazing gold with a pop of
// coins, PENNY, then HONEY, ever faster; the last row flips MONEY all gold
// and the whole board blows in a huge blast and shake. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { drawCachedCritText } from "../../shared/critText";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "wordGuess";
const REWARD = 4;
const ANSWER = "MONEY";
const GUESSES = ["PENNY", "HONEY", "MONEY"];
// tiles TILE px apart; a flip takes FLIP_MS
const TILE = 58;
const FLIP_MS = 200;
const FONT = 34;
const GLOW = 26;
const COINS = 6;
const REACH: [number, number] = [20, 90];
const TILE_GLOW = fadeStops(COLOR.white, 0.5);
const GOLD_GLOW = fadeStops(COLOR.heavenlyGold, 0.5);
const ROW_SHAKE: [number, number] = [0.6, 1.2];

export const forceWordGuessEvent = registerWispEvent(
  KEY,
  "Word Guess",
  () => CONFIG.wordGuessEvent.chance,
  (floor, context, area) => {
    const { showMs, flipsMs, rowGapMs, holdMs, mergeMs } =
      CONFIG.wordGuessEvent;
    const size = Math.min(TILE, (area.right - area.left - 40) / ANSWER.length);
    const scale = size / TILE;
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    let clock: number = showMs;
    const rows = GUESSES.map((word, r) => {
      const gap = lerp(flipsMs, r / (GUESSES.length - 1));
      const tiles = Array.from(word, (letter, i) => {
        const at: Point = {
          x: cx + (i - (word.length - 1) / 2) * size,
          y: cy + (r - (GUESSES.length - 1) / 2) * size,
        };
        return {
          letter,
          at,
          gold: ANSWER[i] === letter,
          flips: clock + i * gap,
        };
      });
      const done = clock + (word.length - 1) * gap + FLIP_MS;
      clock = done + rowGapMs;
      return { tiles, done };
    });
    const endAt = rows[rows.length - 1].done;
    const center: Point = { x: cx, y: cy };
    const golds = rows.flatMap((r) => r.tiles.filter((t) => t.gold));

    const popping = createBeats(
      golds,
      (t) => t.flips + FLIP_MS / 2,
      (t) => cover!.launchFrom(t.at, ringTargets(t.at, COINS, REACH)),
    );
    const finishing = createBeats(
      rows,
      (r) => r.done,
      (_, k) => {
        if (k === rows.length - 1) {
          cover!.blast(center);
          return;
        }
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(ROW_SHAKE, k / (rows.length - 1)));
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
          popping.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms > endAt + 500) return;
          const fade =
            clamp01(ms / showMs) * (ms > endAt ? 1 - (ms - endAt) / 500 : 1);
          for (const row of rows) {
            for (const t of row.tiles) {
              const u = clamp01((ms - t.flips) / FLIP_MS);
              // squashing flat and back as it flips over
              const squash = Math.max(0.05, Math.abs(Math.cos(Math.PI * u)));
              const flipped = u >= 0.5;
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = fade * (flipped && t.gold ? 0.9 : 0.35);
              drawGlow(
                ctx,
                flipped && t.gold ? GOLD_GLOW : TILE_GLOW,
                t.at.x,
                t.at.y,
                GLOW * scale,
                squash,
              );
              ctx.globalCompositeOperation = "source-over";
              if (!flipped) continue;
              ctx.save();
              ctx.globalAlpha = fade * (t.gold ? 1 : 0.55);
              ctx.translate(t.at.x, t.at.y);
              ctx.scale(scale, scale * squash);
              drawCachedCritText(
                ctx,
                t.letter,
                0,
                0,
                t.gold ? COLOR.heavenlyGold : COLOR.white,
                {
                  fontSize: FONT,
                  strokeWidth: 5,
                },
              );
              ctx.restore();
            }
          }
          ctx.globalAlpha = 1;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
