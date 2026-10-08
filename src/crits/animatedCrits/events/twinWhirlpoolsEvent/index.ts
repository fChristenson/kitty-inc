// the "Twin Whirlpools" event (money; crit tiers and cash): it covers its
// crit, whose click freezes the screen while cash pours in off the edges
// and spins up into a whirlpool over each of two income bars, each one
// screwing its bar a crit tier with a bang and a jolt as it takes shape;
// then the two whirlpools wheel round each other, faster and closer, and
// merge into one giant whirlpool in a huge blast and shake as the cash
// pours into the total. Pays floor income × floor number × REWARD, plus the
// tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOut,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "twinWhirlpools";
const REWARD = 2;
const COINS = 340;
const COIN = 0.5;
const ARMS = 3;
const RADIUS: [number, number] = [18, 150];
// how far round an arm curls from its middle to its rim
const TWIST = 0.022;
// laps a second the whirlpools spin, from forming to merged
const SPIN: [number, number] = [0.6, 2.4];
const ORBITS = 1.25;
const MERGED = 0.75;
const OFFSET = 260;
const FORM_SHAKE = 0.9;

interface Pool {
  bar: RewardBar | null;
  home: Point;
  side: number;
}

export const forceTwinWhirlpoolsEvent = registerWispEvent(
  KEY,
  "Twin Whirlpools",
  () => CONFIG.twinWhirlpoolsEvent.chance,
  (floor, context, area) => {
    const { formMs, orbitMs, holdMs, mergeMs } = CONFIG.twinWhirlpoolsEvent;
    const bars = findRewardBars(floor, context).slice(0, 2);
    if (bars.length === 0) return;
    // a second whirlpool mirrors the first when only one bar is in view
    const homes: Point[] =
      bars.length === 2
        ? bars.map((b) => b.center)
        : [
            { x: bars[0].center.x - OFFSET, y: bars[0].center.y },
            { x: bars[0].center.x + OFFSET, y: bars[0].center.y },
          ];
    const pools: Pool[] = homes.map((home, k) => ({
      bar: bars[k] ?? null,
      home,
      side: k === 0 ? 1 : -1,
    }));
    const mid: Point = {
      x: (homes[0].x + homes[1].x) / 2,
      y: (homes[0].y + homes[1].y) / 2,
    };
    const apart = Math.hypot(homes[0].x - mid.x, homes[0].y - mid.y);
    const start = Math.atan2(homes[0].y - mid.y, homes[0].x - mid.x);
    const mergesAt = formMs + orbitMs;
    const travel = mergesAt + 260;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    // the whirlpools' angle so far, spinning up as they close in
    const spinAt = (ms: number) => {
      const t = Math.max(0, ms) / 1000;
      const span = travel / 1000;
      return (
        Math.PI * 2 * (SPIN[0] * t + ((SPIN[1] - SPIN[0]) * t * t) / (2 * span))
      );
    };
    const centre: Point = { x: 0, y: 0 };
    const centreAt = (pool: Pool, ms: number) => {
      const u = easeIn(clamp01((ms - formMs) / orbitMs));
      const a =
        start + Math.PI * 2 * ORBITS * u + (pool.side < 0 ? Math.PI : 0);
      const d = apart * (1 - u) ** 1.3;
      centre.x = mid.x + Math.cos(a) * d;
      centre.y = mid.y + Math.sin(a) * d;
    };
    const paths: CoinPath[] = pools.flatMap((pool) =>
      Array.from({ length: COINS }, (_, i) => {
        const r = lerp(RADIUS, Math.sqrt(Math.random()));
        const arm = ((i % ARMS) / ARMS) * Math.PI * 2;
        // poured in off a random edge
        const edge: Point =
          Math.random() < 0.5
            ? {
                x: Math.random() < 0.5 ? area.left - 40 : area.right + 40,
                y: area.top + Math.random() * height,
              }
            : {
                x: area.left + Math.random() * width,
                y: Math.random() < 0.5 ? area.top - 40 : area.bottom + 40,
              };
        const arrives = between([0.2, 0.9]) * formMs;
        return (f: number) => {
          const ms = f * travel;
          centreAt(pool, ms);
          const shrink =
            ms > mergesAt
              ? MERGED
              : lerp([1, MERGED], easeIn(clamp01((ms - formMs) / orbitMs)));
          const a = arm + r * TWIST * pool.side + spinAt(ms) * pool.side;
          const x = centre.x + Math.cos(a) * r * shrink;
          const y = centre.y + Math.sin(a) * r * shrink;
          if (ms >= arrives) return { x, y, scale: COIN };
          const u = easeOut(clamp01(ms / arrives));
          return {
            x: lerp([edge.x, x], u),
            y: lerp([edge.y, y], u),
            scale: COIN * u,
          };
        };
      }),
    );

    const forming = createBeats(
      pools,
      (_, k) => formMs * (0.7 + 0.3 * k),
      (pool) => {
        if (pool.bar) cover!.tierUp(pool.bar, pool.home);
        cover!.burst(pool.home, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FORM_SHAKE);
      },
    );
    const merging = createBeats(
      [mergesAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(mid);
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
          forming.tick(ms, now);
          merging.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
