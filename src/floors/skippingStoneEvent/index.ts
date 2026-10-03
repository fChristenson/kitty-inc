// the "Skipping Stone" event (wisp; free upgrade levels): it covers its
// crit, whose click freezes the screen while a stone wisp is skimmed off the
// clicked floor's button and skips down the income bars, touching down on
// each one with a splash, a bloop and a jolt as it lands free levels, every
// skip shorter, lower and quicker than the last, until it skids onto the
// last bar and sinks in a huge blast and shake. Then the crit's tier pays
// out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "skippingStone";
const MAX_BARS = 5;
const HOP: [number, number] = [170, 40];
const STONE = 0.42;
const SKIP_SHAKE: [number, number] = [0.5, 1.1];

export const forceSkippingStoneEvent = registerWispEvent(
  KEY,
  "Skipping Stone",
  () => CONFIG.skippingStoneEvent.chance,
  (floor, context) => {
    const { skipsMs, holdMs, mergeMs } = CONFIG.skippingStoneEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const ltr = button.x < bars[0].center.x;
    let clock = 0;
    let from: Point = button;
    const skips = bars.map((bar, k) => {
      const u = k / Math.max(1, bars.length - 1);
      const to: Point = {
        x: bar.box.x + bar.box.width * (ltr ? 0.15 + 0.7 * u : 0.85 - 0.7 * u),
        y: bar.box.y,
      };
      const a = from;
      const ctrl: Point = {
        x: (a.x + to.x) / 2,
        y: Math.min(a.y, to.y) - lerp(HOP, u),
      };
      const leaves = clock;
      clock += lerp(skipsMs, u);
      const lands = clock;
      from = to;
      const at: Point = { x: 0, y: 0 };
      return {
        bar,
        to,
        leaves,
        lands,
        at: (ms: number): Point =>
          bezier(a, ctrl, to, clamp01((ms - leaves) / (lands - leaves)), at),
      };
    });
    const last = skips[skips.length - 1];
    const endAt = last.lands;
    const stone = (ms: number): Point => {
      let s = skips[0];
      for (const skip of skips) if (ms >= skip.leaves) s = skip;
      return s.at(ms);
    };

    const skipping = createBeats(
      skips,
      (s) => s.lands,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor), s.to);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.to);
          return;
        }
        cover!.burst(s.to, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SKIP_SHAKE, k / Math.max(1, skips.length - 1)));
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
        tick: (ms, now) => skipping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              stone,
              ms,
              now,
              WISP_SIZE * STONE,
              0.7,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
