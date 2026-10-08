// the "Memory Match" event (experiment: a memory card game; worker perma
// tiers): it covers its crit, whose click freezes the screen while a grid
// of face-down cards deals itself over it; pairs flip up, the first a miss
// that flips back down with a thunk, then match after match, ever faster,
// each matched pair blazing gold and firing a wisp off to a worker in view
// that lights it up a perma tier with a pop and a jolt; the board cleared,
// every card flips gold in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawCachedCritText } from "../../../critFlash/critText";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "memoryMatch";
const MAX_WORKERS = 5;
const SYMBOLS = ["$", "7", "A", "K", "Q", "J"];
const COLS = 4;
const ROWS = 3;
// cards CARD px apart; a flip takes FLIP_MS; a match's wisp flies FLY_MS
const CARD = 74;
const FLIP_MS = 160;
const FLY_MS = 280;
const FONT = 34;
const GLOW = 30;
const SPARK = 0.4;
const CARD_GLOW = fadeStops(COLOR.white, 0.5);
const GOLD_GLOW = fadeStops(COLOR.heavenlyGold, 0.5);
const MATCH_SHAKE: [number, number] = [0.6, 1.3];

export const forceMemoryMatchEvent = registerWispEvent(
  KEY,
  "Memory Match",
  () => CONFIG.memoryMatchEvent.chance,
  (floor, context, area) => {
    const { dealMs, turnsMs, holdMs, mergeMs } = CONFIG.memoryMatchEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const size = Math.min(CARD, (area.right - area.left - 30) / COLS);
    const scale = size / CARD;
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    // shuffled pairs of symbols over the grid
    const symbols = SYMBOLS.flatMap((s) => [s, s]).sort(
      () => Math.random() - 0.5,
    );
    const cards = symbols.map((symbol, i) => ({
      symbol,
      at: {
        x: cx + ((i % COLS) - (COLS - 1) / 2) * size,
        y: cy + (Math.floor(i / COLS) - (ROWS - 1) / 2) * size,
      },
      // [up, down] spans it's face up for, and when it's matched for good
      shown: [] as [number, number][],
      matched: Infinity,
    }));
    const pairOf = (symbol: string) =>
      cards.map((c, i) => (c.symbol === symbol ? i : -1)).filter((i) => i >= 0);
    let clock: number = dealMs;
    // one miss first: two cards that don't match flip up and back down
    const missA = 0;
    const missB = cards.findIndex((c) => c.symbol !== cards[0].symbol);
    const missGap = lerp(turnsMs, 0);
    cards[missA].shown.push([clock, clock + missGap * 0.8]);
    cards[missB].shown.push([clock + FLIP_MS, clock + missGap * 0.8]);
    clock += missGap;
    const matches = workers.map((worker, k) => {
      const [a, b] = pairOf(SYMBOLS[k]);
      const gap = lerp(turnsMs, (k + 1) / workers.length);
      cards[a].matched = clock;
      cards[b].matched = clock + FLIP_MS;
      const made = clock + FLIP_MS * 2;
      clock += gap;
      const from: Point = {
        x: (cards[a].at.x + cards[b].at.x) / 2,
        y: (cards[a].at.y + cards[b].at.y) / 2,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        made,
        lands: made + FLY_MS,
        at: (ms: number): Point | null => {
          if (ms < made || ms >= made + FLY_MS) return null;
          const u = easeIn((ms - made) / FLY_MS);
          at.x = lerp([from.x, worker.at.x], u);
          at.y = lerp([from.y, worker.at.y], u);
          return at;
        },
      };
    });
    const last = matches[matches.length - 1];
    const clearAt = Math.max(clock, last.lands);
    for (const c of cards) c.matched = Math.min(c.matched, clearAt);
    const endAt = clearAt + FLIP_MS;
    const faceUp = (c: (typeof cards)[number], ms: number) => {
      if (ms >= c.matched) return clamp01((ms - c.matched) / FLIP_MS);
      for (const [up, down] of c.shown) {
        if (ms >= up && ms < down) return clamp01((ms - up) / FLIP_MS);
        if (ms >= down && ms < down + FLIP_MS) return 1 - (ms - down) / FLIP_MS;
      }
      return 0;
    };
    const center: Point = { x: cx, y: cy };

    const turning = createBeats(
      matches,
      (m) => m.made,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      matches,
      (m) => m.lands,
      (m, k) => {
        cover!.promote(m.worker);
        cover!.burst(m.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(MATCH_SHAKE, k / Math.max(1, matches.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          turning.tick(ms, now);
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          const fade = ms > endAt ? Math.max(0, 1 - (ms - endAt) / 400) : 1;
          cards.forEach((c, i) => {
            const dealt = clamp01((ms - (dealMs * i) / cards.length) / 120);
            if (dealt <= 0 || fade <= 0) return;
            const up = faceUp(c, ms);
            const squash = Math.max(0.05, Math.abs(Math.cos(Math.PI * up)));
            const gold = ms >= c.matched && up >= 0.5;
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = dealt * fade * (gold ? 0.9 : 0.35);
            drawGlow(
              ctx,
              gold ? GOLD_GLOW : CARD_GLOW,
              c.at.x,
              c.at.y,
              GLOW * scale,
              squash,
            );
            ctx.globalCompositeOperation = "source-over";
            if (up < 0.5) return;
            ctx.save();
            ctx.globalAlpha = fade;
            ctx.translate(c.at.x, c.at.y);
            ctx.scale(scale, scale * squash);
            drawCachedCritText(
              ctx,
              c.symbol,
              0,
              0,
              gold ? COLOR.heavenlyGold : COLOR.white,
              {
                fontSize: FONT,
                strokeWidth: 5,
              },
            );
            ctx.restore();
          });
          ctx.globalAlpha = 1;
          for (const m of matches)
            drawWispBetween(
              ctx,
              m.at,
              ms,
              now,
              WISP_SIZE * SPARK,
              1,
              m.made,
              m.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
