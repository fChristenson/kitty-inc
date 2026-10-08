// the "Capillary" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a pool of cash spreads along
// the bottom of the screen and thin threads of it start creeping up out of
// it, against gravity, towards every income bar, faster and faster, each
// thread that wicks its way up onto its bar landing with a jolt of free
// levels; then the whole pool drains up the threads into the total in a
// huge blast and shake. Pays floor income × floor number × REWARD, plus the
// levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";
import { totalSpot } from "../../cashFlow";

const KEY = "capillary";
const REWARD = 2;
const MAX_BARS = 4;
const POOL = 260;
const PER_WICK = 70;
const COIN = 0.45;
const LOW = 40;
const DEEP = 60;
const WIGGLE = 5;
const GATHER = 30;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Wick {
  bar: RewardBar;
  foot: Point;
  top: Point;
  starts: number;
  reaches: number;
}

export const forceCapillaryEvent = registerWispEvent(
  KEY,
  "Capillary",
  () => CONFIG.capillaryEvent.chance,
  (floor, context, area) => {
    const { spreadMs, climbsMs, levelShare, holdMs, mergeMs } =
      CONFIG.capillaryEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    const width = area.right - area.left;
    const poolY = area.bottom - LOW;
    const total = totalSpot(area);
    let clock: number = spreadMs;
    const wicks: Wick[] = bars.map((bar, k) => {
      const climb = lerp(climbsMs, k / Math.max(1, bars.length - 1));
      const starts = spreadMs + k * 90;
      clock = Math.max(clock, starts + climb);
      return {
        bar,
        foot: { x: bar.center.x, y: poolY },
        top: { x: bar.center.x, y: bar.center.y },
        starts,
        reaches: starts + climb,
      };
    });
    const drainsAt = clock + 150;
    const travel = drainsAt + 600;
    // up the nearest wick (or straight up) and over into the total
    const drainOf = (x: number) => {
      let best: Wick | null = null;
      for (const w of wicks)
        if (!best || Math.abs(w.foot.x - x) < Math.abs(best.foot.x - x))
          best = w;
      return best;
    };
    const paths: CoinPath[] = [];
    for (let i = 0; i < POOL; i++) {
      const x = area.left + Math.random() * width;
      const depth = Math.random() * DEEP;
      const appears = Math.random() * spreadMs;
      const phase = Math.random() * Math.PI * 2;
      const wick = drainOf(x);
      const via: Point = wick ? wick.top : { x, y: poolY - 200 };
      paths.push((f) => {
        const ms = f * travel;
        const y =
          poolY -
          DEEP / 2 +
          depth +
          Math.sin(x * 0.04 + ms * 0.006 + phase) * 4;
        if (ms < drainsAt) {
          const grow = easeOut(clamp01((ms - appears) / 250));
          return { x, y, scale: COIN * grow };
        }
        const u = easeIn(clamp01((ms - drainsAt) / (travel - drainsAt)));
        const v = Math.min(1, u * 2);
        const w = Math.max(0, u * 2 - 1);
        const mx = lerp([x, via.x], v);
        const my = lerp([y, via.y], v);
        return {
          x: lerp([mx, total.x], w),
          y: lerp([my, total.y], w),
          scale: COIN,
        };
      });
    }
    for (const wick of wicks)
      for (let j = 0; j < PER_WICK; j++) {
        const leaves =
          wick.starts + ((wick.reaches - wick.starts) * 0.4 * j) / PER_WICK;
        const arrives = leaves + (wick.reaches - wick.starts) * 0.6;
        const a = Math.random() * Math.PI * 2;
        const r = GATHER * Math.sqrt(Math.random());
        paths.push((f) => {
          const ms = f * travel;
          if (ms < leaves) return { x: wick.foot.x, y: wick.foot.y, scale: 0 };
          if (ms < arrives) {
            const u = easeIn((ms - leaves) / (arrives - leaves));
            const y = lerp([wick.foot.y, wick.top.y], u);
            return {
              x: wick.foot.x + Math.sin(y * 0.05 + ms * 0.01) * WIGGLE,
              y,
              scale: COIN,
            };
          }
          const gx = wick.top.x + Math.cos(a) * r;
          const gy = wick.top.y + Math.sin(a) * r * 0.5;
          if (ms < drainsAt) return { x: gx, y: gy, scale: COIN };
          const u = easeIn(clamp01((ms - drainsAt) / (travel - drainsAt)));
          return {
            x: lerp([gx, total.x], u),
            y: lerp([gy, total.y], u),
            scale: COIN,
          };
        });
      }
    const last = wicks[wicks.length - 1];

    const reaching = createBeats(
      wicks,
      (w) => w.starts + (w.reaches - w.starts) * 0.6,
      (w, k) => {
        cover!.levels(w.bar, levelsFor(w.bar.floor, levelShare, 2), w.top);
        if (w === last) for (const bar of bars) cover!.slam(bar);
        cover!.burst(w.top, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, wicks.length - 1)));
      },
    );
    const draining = createBeats(
      [drainsAt, travel],
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
          reaching.tick(ms, now);
          draining.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
