// the "Head-On" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while two rivers of cash burst in
// from the screen's left and right edges and race along an income bar
// toward each other, smashing head-on over its middle in a crown of cash
// splashing high, a bang and a jolt that lands free levels on the bar; the
// next pair tears in along the next bar, quicker each time, the last crash
// a huge blast and shake as the cash pours into the total. Pays floor
// income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "headOn";
const REWARD = 2;
const MAX_BARS = 4;
const ABOVE = 50;
const SURGE = 40;
const CROWN = 22;
const CRASH_SHAKE: [number, number] = [0.7, 1.5];

export const forceHeadOnEvent = registerWispEvent(
  KEY,
  "Head-On",
  () => CONFIG.headOnEvent.chance,
  (floor, context, area) => {
    const { crashesMs, travelMs, levelShare, holdMs, mergeMs } =
      CONFIG.headOnEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const crashes = bars.map((bar, k) => {
      const t = k / Math.max(1, bars.length - 1);
      const starts = clock;
      const gap = lerp(crashesMs, t);
      clock += gap;
      const travel = lerp(travelMs, t);
      const meet: Point = { x: bar.center.x, y: bar.center.y - ABOVE };
      // each river surges in a low wave along the bar to the middle
      const lines = [area.left, area.right].map((edge) =>
        sampleLine(
          (u) => ({
            x: lerp([edge, meet.x], u),
            y: meet.y - Math.sin(Math.PI * u) * SURGE,
          }),
          30,
        ),
      );
      return {
        bar,
        meet,
        starts,
        crashes: starts + travel,
        lines,
        pour: {
          coinsAlong: 200,
          width: 30,
          streamMs: gap,
          travelMs: travel,
        } as Pour,
      };
    });
    const last = crashes[crashes.length - 1];
    const endAt = last.crashes;
    const durationMs = Math.max(
      pourDurationMs(last.starts, last.pour),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      crashes,
      (c) => c.starts,
      (c) => {
        for (const line of c.lines) pourLine(cover!, line, c.pour);
      },
    );
    const crashing = createBeats(
      crashes,
      (c) => c.crashes,
      (c, k) => {
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 2), c.meet);
        cover!.launchFrom(
          c.meet,
          clampTargetsY(
            sprayTargets(c.meet, CROWN, [80, 260], -Math.PI / 2, 1.4),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.meet);
          return;
        }
        cover!.burst(c.meet, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CRASH_SHAKE, k / Math.max(1, crashes.length - 1)));
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
          crashing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
