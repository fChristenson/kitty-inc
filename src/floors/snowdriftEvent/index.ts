// the "Snowdrift" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a howling blizzard of cash
// blows in off one side of the screen in gusting sheets and banks up in
// drifts against every income bar in view, each drift piling higher until
// it tops out with a whump, a jolt and free levels, bar after bar, ever
// faster; then the wind swings round and blows every drift up into the
// total in a huge blast and shake. Pays floor income × floor number ×
// REWARD, plus the levels
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";
import { findRewardBars, levelsFor } from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "snowdrift";
const REWARD = 2;
const MAX_BARS = 4;
const DRIFT_COINS = 330;
const COIN = 0.5;
// a drift runs DRIFT of its bar from the windward end, HEAP px high there
const DRIFT = 0.7;
const HEAP = 70;
// flakes ride in from FROM px off the edge, rising or dropping up to GUST
// px and fluttering FLUTTER px on the way
const FROM = 60;
const GUST = 220;
const FLUTTER = 30;
const BLOW_SPREAD = 300;
const LIFT = 50;
const DRIFT_SHAKE: [number, number] = [0.6, 1.4];

export const forceSnowdriftEvent = registerWispEvent(
  KEY,
  "Snowdrift",
  () => CONFIG.snowdriftEvent.chance,
  (floor, context, area) => {
    const { pileMs, gapsMs, flyMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.snowdriftEvent;
    const fallback = totalSpot(area);
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const fromLeft = Math.random() < 0.5;
    const dir = fromLeft ? 1 : -1;
    const edge = fromLeft ? area.left - FROM : area.right + FROM;
    let clock = 0;
    const drifts = bars.map((bar, k) => {
      const starts = clock;
      clock += lerp(gapsMs, k / Math.max(1, bars.length - 1));
      const windward = fromLeft ? bar.box.x : bar.box.x + bar.box.width;
      return { bar, starts, windward, tops: starts + pileMs + flyMs };
    });
    const turnAt = drifts[drifts.length - 1].tops + 120;
    const endAt = turnAt + BLOW_SPREAD + flightMs;

    const paths: CoinPath[] = drifts.flatMap((drift) =>
      Array.from({ length: DRIFT_COINS }, () => {
        const d = Math.random() ** 1.4;
        const rest: Point = {
          x: drift.windward + dir * d * drift.bar.box.width * DRIFT,
          y: drift.bar.box.y - Math.random() * HEAP * (1 - d) - 4,
        };
        const from: Point = {
          x: edge,
          y: rest.y + (Math.random() * 2 - 1) * GUST,
        };
        const leaves = drift.starts + Math.random() * pileMs;
        const lands = leaves + flyMs;
        const phase = Math.random() * Math.PI * 2;
        // the wind turns: the drifts blow off into the total, top first
        const blows =
          turnAt + (1 - (drift.bar.box.y - rest.y) / HEAP) * BLOW_SPREAD;
        const lift: Point = { x: rest.x - dir * 80, y: rest.y - LIFT };
        const at: Point = { x: 0, y: 0 };
        return (f: number) => {
          const ms = f * endAt;
          if (ms < leaves) return { x: from.x, y: from.y, scale: 0 };
          if (ms < lands) {
            const u = (ms - leaves) / flyMs;
            return {
              x: lerp([from.x, rest.x], u),
              y:
                lerp([from.y, rest.y], u * u) +
                Math.sin(u * Math.PI * 3 + phase) * FLUTTER * (1 - u),
              scale: COIN,
            };
          }
          if (ms < blows) return { x: rest.x, y: rest.y, scale: COIN };
          const total = cover?.total() ?? fallback;
          bezier(
            rest,
            lift,
            total,
            easeIn(clamp01((ms - blows) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        };
      }),
    );

    const topping = createBeats(
      drifts,
      (d) => d.tops,
      (d, k) => {
        const t = k / Math.max(1, drifts.length - 1);
        cover!.levels(d.bar, levelsFor(d.bar.floor, levelShare, 2), {
          x: edge,
          y: d.bar.center.y,
        });
        cover!.burst({ x: d.windward, y: d.bar.box.y }, 0.4 + 0.3 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DRIFT_SHAKE, t));
      },
    );
    const blowing = createBeats(
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
          topping.tick(ms, now);
          blowing.tick(ms, now);
        },
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
