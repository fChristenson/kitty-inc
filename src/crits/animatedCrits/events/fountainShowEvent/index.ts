// the "Fountain Show" event (money; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while a row of jets of cash
// spring up along the bottom of the screen and dance like a fountain show,
// rippling in waves; then they leap together in time, higher and higher,
// each leap cresting on the next income bar up with a splash and a jolt of
// free levels, until the finale shoots every jet sky high into the total in
// a huge blast and shake. Pays floor income × floor number × REWARD, plus
// the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";
import { totalSpot } from "../../cashFlow";
import { levelsFor } from "../../../../gameState";

const KEY = "fountainShow";
const REWARD = 2;
const MAX_BARS = 4;
const JETS = 7;
const PER_JET = 70;
const COIN = 0.45;
const LOW = 30;
const WAVE = 180;
// each coin's trip up and back down its jet
const LOOP_MS = 700;
const SPRAY = 18;
const LEAP_MS = 200;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceFountainShowEvent = registerWispEvent(
  KEY,
  "Fountain Show",
  () => CONFIG.fountainShowEvent.chance,
  (floor, context, area) => {
    const { waveMs, leapsMs, finaleMs, levelShare, holdMs, mergeMs } =
      CONFIG.fountainShowEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    const width = area.right - area.left;
    const base = area.bottom - LOW;
    const total = totalSpot(area);
    let clock = waveMs;
    const leaps = bars.map((bar, k) => {
      const at = clock;
      clock += lerp(leapsMs, k / Math.max(1, bars.length - 1));
      return { bar, at, height: base - bar.center.y };
    });
    const finaleAt = clock;
    const travel = finaleAt + finaleMs;
    const xs = Array.from(
      { length: JETS },
      (_, i) => area.left + (width * (i + 0.5)) / JETS,
    );
    // how high jet i reaches at ms: rippling waves, then leaping bar by bar
    const heightAt = (i: number, ms: number) => {
      const ripple = WAVE * (0.55 + 0.45 * Math.sin(i * 0.9 - ms * 0.012));
      if (ms < waveMs || leaps.length === 0) return ripple;
      let from = ripple;
      let h = ripple;
      for (const leap of leaps) {
        if (ms < leap.at) break;
        h = lerp(
          [from, leap.height],
          easeOutBack(clamp01((ms - leap.at) / LEAP_MS)),
        );
        from = leap.height;
      }
      return h + Math.sin(i * 1.3 + ms * 0.02) * 10;
    };
    const paths: CoinPath[] = [];
    for (let i = 0; i < JETS; i++)
      for (let j = 0; j < PER_JET; j++) {
        const phase = j / PER_JET;
        const drift = (Math.random() - 0.5) * SPRAY;
        const leaves = finaleAt + Math.random() * 120;
        const at = (ms: number): Point => {
          const u = (((ms / LOOP_MS + phase) % 1) + 1) % 1;
          return {
            x: xs[i] + drift * u,
            y: base - heightAt(i, ms) * 4 * u * (1 - u),
          };
        };
        paths.push((f) => {
          const ms = f * travel;
          const grow = clamp01(ms / 300);
          if (ms < leaves) {
            const p = at(ms);
            return { x: p.x, y: lerp([base, p.y], grow), scale: COIN * grow };
          }
          const p = at(leaves);
          const u = easeIn(clamp01((ms - leaves) / (travel - leaves)));
          return {
            x: lerp([p.x, total.x], u),
            y: lerp([p.y, total.y], u),
            scale: COIN,
          };
        });
      }
    const last = leaps[leaps.length - 1];

    const leaping = createBeats(
      leaps,
      (l) => l.at + LEAP_MS * 0.6,
      (l, k) => {
        cover!.levels(
          l.bar,
          levelsFor(l.bar.floor, levelShare, 2),
          l.bar.center,
        );
        if (l === last) for (const bar of bars) cover!.slam(bar);
        cover!.burst(l.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, leaps.length - 1)));
      },
    );
    const finale = createBeats(
      [finaleAt, travel],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        if (cover!.isLive()) playSwoosh();
      },
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
          leaping.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
