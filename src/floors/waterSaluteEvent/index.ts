// the "Water Salute" event (money; crit tiers and cash): it covers its crit,
// whose click freezes the screen while two great jets of cash blast up out
// of the screen's bottom corners and arch toward each other like a fire
// crew's water salute, meeting in a peak high over an income bar, then
// crash down onto it together with a bang and a jolt, the bar jumping a
// crit tier; the salute swings up to the next bar, quicker each time, the
// last crash a huge blast and shake as all the cash pours into the total.
// Pays floor income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardBars } from "../eventRewards";

const KEY = "waterSalute";
const REWARD = 2;
const MAX_BARS = 4;
const CORNER = 30;
const PEAK = 170;
// the jet's share of its line spent climbing to the peak, the rest crashing down
const CLIMB = 0.8;
const COINS = 12;
const CRASH_SHAKE: [number, number] = [0.7, 1.5];

// a jet from `from` climbing in a parabola to `peak`, then plunging onto `to`
function jet(from: Point, peak: Point, to: Point): Point[] {
  return sampleLine((u) => {
    if (u < CLIMB) {
      const v = u / CLIMB;
      return {
        x: lerp([from.x, peak.x], v),
        y: peak.y + (from.y - peak.y) * (1 - v) ** 2,
      };
    }
    const v = (u - CLIMB) / (1 - CLIMB);
    return { x: lerp([peak.x, to.x], v), y: peak.y + (to.y - peak.y) * v * v };
  }, 60);
}

export const forceWaterSaluteEvent = registerWispEvent(
  KEY,
  "Water Salute",
  () => CONFIG.waterSaluteEvent.chance,
  (floor, context, area) => {
    const { salutesMs, travelMs, holdMs, mergeMs } = CONFIG.waterSaluteEvent;
    // the lowest bar first, the salute climbing the stack
    const bars = findRewardBars(floor, context).slice(-MAX_BARS).reverse();
    if (bars.length === 0) return;
    const corners: Point[] = [
      { x: area.left + CORNER, y: area.bottom - CORNER },
      { x: area.right - CORNER, y: area.bottom - CORNER },
    ];
    let clock = 0;
    const salutes = bars.map((bar, k) => {
      const t = k / Math.max(1, bars.length - 1);
      const starts = clock;
      const gap = lerp(salutesMs, t);
      clock += gap;
      const travel = lerp(travelMs, t);
      const peak: Point = {
        x: bar.center.x,
        y: Math.max(area.top + 120, bar.center.y - PEAK),
      };
      return {
        bar,
        starts,
        crashes: starts + travel,
        lines: corners.map((c) => jet(c, peak, bar.center)),
        pour: {
          coinsAlong: 180,
          width: 28,
          streamMs: gap,
          travelMs: travel,
        } as Pour,
      };
    });
    const last = salutes[salutes.length - 1];
    const endAt = last.crashes;
    const durationMs = Math.max(
      pourDurationMs(last.starts, last.pour),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      salutes,
      (s) => s.starts,
      (s) => {
        for (const line of s.lines) pourLine(cover!, line, s.pour);
      },
    );
    const crashing = createBeats(
      salutes,
      (s) => s.crashes,
      (s, k) => {
        cover!.tierUp(s.bar, { x: s.bar.center.x, y: s.bar.center.y - PEAK });
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.7);
        cover!.launchFrom(
          s.bar.center,
          clampTargetsY(
            sprayTargets(s.bar.center, COINS, [60, 180], -Math.PI / 2, 2.4),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CRASH_SHAKE, k / Math.max(1, salutes.length - 1)));
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
