// the "String of Pearls" event (wisp; free upgrade levels): it covers its
// crit, whose click freezes the screen while a huge comet wisp streaks in
// over the bars and tears apart with a bang into a string of glowing
// fragments strung out along its path like pearls; one after another the
// fragments peel off and plunge onto the income bars below, each impact a
// blast and a jolt of free levels, quicker and quicker, the last landing
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute, bezier } from "../../../../shared/curves";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "stringOfPearls";
const MAX_BARS = 5;
const ABOVE = 150;
const TEAR_U = 0.12;
const LAG_MS = 110;
const SPREAD_MS = 250;
const DIVE_MS = 200;
const COMET = 0.8;
const PEARL = 0.4;
const TEAR_SHAKE = 0.9;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Pearl {
  bar: RewardBar;
  peels: number;
  lands: number;
  at: (ms: number) => Point | null;
}

export const forceStringOfPearlsEvent = registerWispEvent(
  KEY,
  "String of Pearls",
  () => CONFIG.stringOfPearlsEvent.chance,
  (floor, context, area) => {
    const { travelMs, holdMs, mergeMs } = CONFIG.stringOfPearlsEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => a.box.y - b.box.y);
    if (bars.length === 0) return;
    // in from the top corner, over every bar in turn, and away off the far side
    const route: Point[] = [
      {
        x: area.left - 80,
        y: Math.max(area.top - 40, bars[0].box.y - ABOVE * 2),
      },
      ...bars.map((b) => ({ x: b.center.x, y: b.box.y - ABOVE })),
      { x: area.right + 80, y: bars[bars.length - 1].box.y - ABOVE },
    ];
    const lastPoint = route.length - 1;
    const tears = TEAR_U * travelMs;
    const pearls: Pearl[] = bars.map((bar, j) => {
      const u = (j + 1) / lastPoint;
      const peels = j * LAG_MS + u * travelMs;
      const lands = peels + DIVE_MS;
      const spot: Point = { x: 0, y: 0 };
      const over = alongRoute(route, u, { x: 0, y: 0 });
      const lift: Point = { x: over.x, y: over.y - 40 };
      // all one comet until the tear, then strung out behind the lead
      const lag = (ms: number) =>
        ((j * LAG_MS) / travelMs) * clamp01((ms - tears) / SPREAD_MS);
      return {
        bar,
        peels,
        lands,
        at: (ms) => {
          if (ms > lands) return null;
          if (ms < peels)
            return alongRoute(
              route,
              clamp01(Math.max(0, ms) / travelMs - lag(ms)),
              spot,
            );
          return bezier(
            over,
            lift,
            bar.center,
            easeIn((ms - peels) / DIVE_MS),
            spot,
          );
        },
      };
    });
    const last = pearls[pearls.length - 1];
    const endAt = last.lands;
    const tearAt: Point = alongRoute(route, TEAR_U, { x: 0, y: 0 });

    const tearing = createBeats(
      [tears],
      (ms) => ms,
      () => {
        cover!.burst(tearAt, 0.7);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(TEAR_SHAKE);
      },
    );
    const landing = createBeats(
      pearls,
      (p) => p.lands,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor, 0.03, 2), p.bar.center);
        if (p === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, pearls.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          tearing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          // one great comet until it tears, then its string of fragments
          if (ms < tears) {
            drawWispBetween(
              ctx,
              pearls[0].at,
              ms,
              now,
              WISP_SIZE * COMET,
              1,
              0,
              tears,
            );
            return;
          }
          for (const p of pearls)
            drawWispBetween(
              ctx,
              p.at,
              ms,
              now,
              WISP_SIZE * PEARL,
              1,
              tears,
              p.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
