// the "Pinstripe" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while rivers of cash shoot straight
// across the screen one after another, one along each income bar's row, each
// the other way to the last, striping the screen like a pinstripe suit; as
// each river's head races through its bar the bar lands free levels with a
// splash, a bloop and a jolt; the last stripe slams its bar in a huge blast
// and shake and the coins sweep into the total. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "pinstripe";
const REWARD = 2;
const MAX_BARS = 5;
const EDGE = 10;
const HIT_SHAKE: [number, number] = [0.5, 1.3];

export const forcePinstripeEvent = registerWispEvent(
  KEY,
  "Pinstripe",
  () => CONFIG.pinstripeEvent.chance,
  (floor, context, area) => {
    const { gapsMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.pinstripeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const pour: Pour = { coinsAlong: 700, width: 30, streamMs, travelMs };
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    let clock = 0;
    const stripes = bars.map((bar, k) => {
      const ltr = k % 2 === 0;
      const from: Point = { x: ltr ? left : right, y: bar.center.y };
      const to: Point = { x: ltr ? right : left, y: bar.center.y };
      const line = sampleLine(
        (u) => ({ x: lerp([from.x, to.x], u), y: from.y }),
        40,
      );
      const starts = clock;
      clock += lerp(gapsMs, k / Math.max(1, bars.length - 1));
      const share = Math.abs(bar.center.x - from.x) / (right - left);
      return { bar, from, line, starts, hits: starts + travelMs * share };
    });
    const last = stripes[stripes.length - 1];
    const durationMs = Math.max(
      pourDurationMs(last.starts, pour),
      last.hits + holdMs + mergeMs,
    );

    const pouring = createBeats(
      stripes,
      (s) => s.starts,
      (s) => pourLine(cover!, s.line, pour),
    );
    const hitting = createBeats(
      stripes,
      (s) => s.hits,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor), s.from);
        if (s === last) {
          cover!.slam(s.bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, stripes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          hitting.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
