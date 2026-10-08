// the "Flood" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a flood of cash wells up from
// below and rises up the whole screen, ever faster, its surface sloshing in
// waves; every income bar it swallows jolts with a bloop, a splash and free
// levels; reaching the top, the whole flood surges up into the total in a
// huge blast and shake. Pays floor income × floor number × REWARD, plus the
// levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "flood";
const REWARD = 2;
const MAX_BARS = 5;
const COINS = 1_500;
const COIN = 0.6;
// coins fill DEPTH px under the surface, its waves WAVE px high
const DEPTH = 260;
const WAVE = 14;
const SWALLOW_SHAKE: [number, number] = [0.6, 1.4];

export const forceFloodEvent = registerWispEvent(
  KEY,
  "Flood",
  () => CONFIG.floodEvent.chance,
  (floor, context, area) => {
    const { riseMs, drainMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.floodEvent;
    const fallback = totalSpot(area);
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context).slice(0, MAX_BARS)
      : [];
    const bottom = area.bottom + 20;
    const top = area.top + 60;
    const width = area.right - area.left;
    const endAt = riseMs + drainMs + flightMs;
    const surface = (ms: number) =>
      bottom + (top - bottom) * easeIn(clamp01(ms / riseMs));
    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const x0 = area.left + Math.random() * width;
      const depth = DEPTH * Math.random() ** 2;
      const calm = 1 - depth / DEPTH;
      const phase = Math.random() * Math.PI * 2;
      const place = (ms: number, into: Point): Point => {
        into.x = x0 + Math.sin(ms * 0.004 + phase) * 8;
        into.y =
          surface(ms) +
          depth +
          Math.sin(x0 * 0.02 + ms * 0.008 + phase) * WAVE * calm;
        return into;
      };
      const leaves = riseMs + (depth / DEPTH) * drainMs;
      const from = place(leaves, { x: 0, y: 0 });
      const lift: Point = { x: from.x, y: fallback.y - 40 };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) {
          place(ms, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        const total = cover?.total() ?? fallback;
        bezier(
          from,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    // the surface passes y when easeIn(ms / riseMs) reaches its share
    const swallows = bars
      .map((bar) => ({
        bar,
        at:
          riseMs * Math.sqrt(clamp01((bottom - bar.center.y) / (bottom - top))),
      }))
      .sort((a, b) => a.at - b.at);

    const swallowing = createBeats(
      swallows,
      (s) => s.at,
      (s, k) => {
        const t = k / Math.max(1, swallows.length - 1);
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 2));
        cover!.burst(s.bar.center, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SWALLOW_SHAKE, t));
      },
    );
    const surging = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          swallowing.tick(ms, now);
          surging.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
