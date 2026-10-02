// the "Stockpile" event (money; cash, free upgrade levels and a crit tier):
// it covers its crit, whose click freezes the screen while cash pours down
// out of the sky and heaps up on top of every income bar in view, the piles
// swelling into mounds; then bar after bar, top to bottom, each swallows its
// pile in a flash, a bloop and a jolt that lands free upgrade levels tallied
// over it (the clicked floor's bar jumping a crit tier too), and the cash
// erupts back out of it in a fountain; the last slams every bar in a huge
// blast and shake, and the cash sweeps on into the total. Pays floor income
// × floor number × REWARD, plus the levels and the tier
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutCubic, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "stockpile";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 1_100;
const COIN = 0.7;
// each coin falls FALL_MS from up to SKY px above the screen onto a mound
// MOUND px high over its bar, then erupts up to SPOUT px over it
const FALL_MS = 320;
const SKY = 220;
const MOUND = 90;
const SPOUT: [number, number] = [60, 220];
const SOAK_SHAKE: [number, number] = [0.9, 1.7];

export const forceStockpileEvent = registerWispEvent(
  KEY,
  "Stockpile",
  () => CONFIG.stockpileEvent.chance,
  (floor, context, area) => {
    const { rainMs, soakMs, gapMs, eruptMs, levelShare, holdMs, mergeMs } =
      CONFIG.stockpileEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const crowned = bars.find((b) => b.floor === floor) ?? bars[0];
    const soaks = bars.map((_, k) => rainMs + 60 + k * gapMs);
    const lastSoaked = soaks[soaks.length - 1] + soakMs;
    const endAt = lastSoaked + eruptMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const b = i % bars.length;
      const bar = bars[b];
      const u = Math.random();
      const lands = FALL_MS + Math.random() * (rainMs - FALL_MS);
      // later coins heap higher, the mound tallest in the middle
      const rise = MOUND * (lands / rainMs) * Math.sqrt(1 - (2 * u - 1) ** 2);
      const heap = {
        x: bar.box.x + bar.box.width * (0.05 + 0.9 * u),
        y: bar.box.y - 4 - rise * (0.85 + 0.15 * Math.random()),
      };
      const sky = area.top - 40 - Math.random() * SKY;
      const sunk = {
        x: bar.center.x + (heap.x - bar.center.x) * 0.3,
        y: bar.center.y,
      };
      const spout = {
        x: bar.center.x + (Math.random() - 0.5) * bar.box.width * 1.4,
        y: bar.box.y - lerp(SPOUT, Math.random()),
      };
      const soakAt = soaks[b];
      const out = soakAt + soakMs;
      return (f) => {
        const ms = f * endAt;
        if (ms < lands - FALL_MS) return { x: heap.x, y: sky, scale: 0 };
        if (ms < lands) {
          const t = easeIn((ms - lands + FALL_MS) / FALL_MS);
          return { x: heap.x, y: sky + (heap.y - sky) * t, scale: COIN };
        }
        if (ms < soakAt) return { x: heap.x, y: heap.y, scale: COIN };
        if (ms < out) {
          const t = easeIn((ms - soakAt) / soakMs);
          return {
            x: heap.x + (sunk.x - heap.x) * t,
            y: heap.y + (sunk.y - heap.y) * t,
            scale: COIN * (1 - 0.6 * t),
          };
        }
        const t = easeOutCubic(clamp01((ms - out) / eruptMs));
        return {
          x: sunk.x + (spout.x - sunk.x) * t,
          y: sunk.y + (spout.y - sunk.y) * t,
          scale: COIN * (0.4 + 0.6 * t),
        };
      };
    });

    const soaking = createBeats(
      soaks,
      (ms) => ms + soakMs,
      (_, k) => {
        const bar = bars[k];
        cover!.levels(bar, levelsFor(bar.floor, levelShare));
        if (bar === crowned) cover!.tierUp(bar);
        if (k === bars.length - 1) {
          for (const b of bars) cover!.slam(b);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(bar.center, 0.8);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SOAK_SHAKE, k / Math.max(1, bars.length - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => soaking.tick(ms, now),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
