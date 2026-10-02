// the "Elevator" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a fat column of cash shoots up
// one side of the screen like an elevator up its shaft; at every income bar
// it passes it dings: a jet of cash branches off sideways into that bar,
// which jolts with a splash, a bloop and free levels; floor after floor up
// the screen, and at the top bar every bar slams in a huge blast and shake.
// Pays floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardBars, levelsFor } from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "elevator";
const REWARD = 2;
const MAX_BARS = 5;
// the shaft runs SHAFT px in from the screen's edge
const SHAFT = 40;
const DING_SHAKE: [number, number] = [0.6, 1.4];

export const forceElevatorEvent = registerWispEvent(
  KEY,
  "Elevator",
  () => CONFIG.elevatorEvent.chance,
  (floor, context, area) => {
    const { riseMs, branchMs, levelShare, holdMs, mergeMs } =
      CONFIG.elevatorEvent;
    // bottom first, the way the column climbs
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    const left = Math.random() < 0.5;
    const x = left ? area.left + SHAFT : area.right - SHAFT;
    const bottom = area.bottom + 40;
    const top = bars[bars.length - 1].center.y - 30;
    const shaft = sampleLine(
      (u) => ({ x, y: bottom + (top - bottom) * u }),
      40,
    );
    const stops = bars.map((bar) => {
      const at = (bottom - bar.center.y) / (bottom - top);
      const from: Point = { x, y: bar.center.y };
      const end: Point = {
        x: left ? bar.box.x + 20 : bar.box.x + bar.box.width - 20,
        y: bar.center.y,
      };
      const lift: Point = { x: (from.x + end.x) / 2, y: bar.center.y - 50 };
      return {
        bar,
        end,
        line: sampleLine((u) => bezier(from, lift, end, u, { x: 0, y: 0 }), 24),
        startsAt: riseMs * Math.min(1, at),
      };
    });
    const endAt = stops[stops.length - 1].startsAt + branchMs;
    const rise: Pour = {
      coinsAlong: 520,
      width: 26,
      streamMs: endAt - branchMs,
      travelMs: riseMs,
    };
    const branch: Pour = {
      coinsAlong: 170,
      width: 14,
      streamMs: 380,
      travelMs: branchMs,
    };

    const branching = createBeats(
      stops,
      (s) => s.startsAt,
      (s) => pourLine(cover!, s.line, branch),
    );
    const dinging = createBeats(
      stops,
      (s) => s.startsAt + branchMs,
      (s, k) => {
        const t = k / Math.max(1, stops.length - 1);
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 2), {
          x,
          y: s.bar.center.y,
        });
        if (k === stops.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.end, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DING_SHAKE, t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(0, rise),
          pourDurationMs(stops[stops.length - 1].startsAt, branch),
          endAt + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => {
          branching.tick(ms, now);
          dinging.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, shaft, rise);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
