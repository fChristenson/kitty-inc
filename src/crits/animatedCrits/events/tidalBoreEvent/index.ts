// the "Tidal Bore" event (money; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while a wall of cash surges in
// off the bottom of the screen and races up it like a tidal bore, its crest
// curling over as it climbs faster and faster; every income bar it rolls
// over jolts with free levels, and at the top the whole wave breaks into
// the total in a huge blast and shake. Pays floor income × floor number ×
// REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { findRewardBars, levelsFor } from "../../eventRewards";
import { totalSpot } from "../../cashFlow";

const KEY = "tidalBore";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 700;
const COIN = 0.5;
const DEPTH = 150;
const CURL = 40;
const SPILL = 30;
const HIT_SHAKE: [number, number] = [0.6, 1.3];
const SURGE_SHAKE = 0.6;

export const forceTidalBoreEvent = registerWispEvent(
  KEY,
  "Tidal Bore",
  () => CONFIG.tidalBoreEvent.chance,
  (floor, context, area) => {
    const { riseMs, breakMs, levelShare, holdMs, mergeMs } =
      CONFIG.tidalBoreEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    const width = area.right - area.left;
    const total = totalSpot(area);
    const fromY = area.bottom + DEPTH;
    const toY = area.top + 150;
    // the crest's height, climbing faster and faster
    const crestAt = (ms: number) =>
      lerp(
        [fromY, toY],
        easeIn(clamp01(ms / riseMs)) * 0.75 + clamp01(ms / riseMs) * 0.25,
      );
    const msAtY = (y: number) => {
      let ms = 0;
      while (ms < riseMs && crestAt(ms) > y) ms += 5;
      return ms;
    };
    const travel = riseMs + breakMs;
    const into: Point = { x: 0, y: 0 };
    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const x = area.left - SPILL + Math.random() * (width + SPILL * 2);
      const depth = Math.random() ** 1.5 * DEPTH;
      const phase = Math.random() * Math.PI * 2;
      const leaves = riseMs + Math.random() * breakMs * 0.3;
      const bend: Point = { x: (x + total.x) / 2, y: toY - 60 };
      return (f) => {
        const ms = f * travel;
        const t = Math.min(ms, leaves);
        // the top of the wave curls forward and churns
        const curl = depth < 30 ? (1 - depth / 30) * CURL : 0;
        const y =
          crestAt(t) +
          depth -
          curl +
          Math.sin(x * 0.03 + t * 0.012 + phase) * 8;
        const sx = x + Math.sin(t * 0.008 + phase) * 6;
        if (ms < leaves) return { x: sx, y, scale: COIN };
        const p = bezier(
          { x: sx, y },
          bend,
          total,
          easeIn(clamp01((ms - leaves) / (travel - leaves))),
          into,
        );
        return { x: p.x, y: p.y, scale: COIN };
      };
    });
    const hits = bars
      .map((bar) => ({ bar, ms: msAtY(bar.center.y) }))
      .sort((a, b) => a.ms - b.ms);
    const last = hits[hits.length - 1];

    const surging = createBeats(
      [0, riseMs],
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        if (k === 0) shakeScreen(SURGE_SHAKE);
      },
    );
    const rolling = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.levels(
          h.bar,
          levelsFor(h.bar.floor, levelShare, 2),
          h.bar.center,
        );
        if (h === last) for (const bar of bars) cover!.slam(bar);
        cover!.burst(h.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const breaking = createBeats(
      [travel],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          surging.tick(ms, now);
          rolling.tick(ms, now);
          breaking.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
