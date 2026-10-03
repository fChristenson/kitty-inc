// the "Xylophone" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while a mallet wisp bounces out of the
// clicked floor's button and plays the income bars like a xylophone: a
// glissando down the bars, hop by hop, each strike ringing a flash of light
// along the bar, a bloop and a jolt as it lands free levels; then back up
// twice as fast, and a last double-handed strike lands on every bar at once
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { drawBeam } from "../../shared/beam";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "xylophone";
const MAX_BARS = 5;
const HOP = 70;
const RING_MS = 260;
const RING_WIDTH = 30;
const MALLET = 0.45;
const STRIKE_SHAKE: [number, number] = [0.4, 1];

export const forceXylophoneEvent = registerWispEvent(
  KEY,
  "Xylophone",
  () => CONFIG.xylophoneEvent.chance,
  (floor, context) => {
    const { downMs, upMs, holdMs, mergeMs, levelShare } = CONFIG.xylophoneEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // down the bars, then back up; each strike on a bar a bit right of the last
    const order = [...bars, ...bars.slice(0, -1).reverse()];
    let clock = 0;
    let from: Point = button;
    const strikes = order.map((bar, k) => {
      const down = k < bars.length;
      const to: Point = {
        x:
          bar.box.x +
          bar.box.width * (0.2 + 0.6 * (k / Math.max(1, order.length - 1))),
        y: bar.center.y,
      };
      const ctrl: Point = {
        x: (from.x + to.x) / 2,
        y: Math.min(from.y, to.y) - HOP,
      };
      const leaves = clock;
      clock += down ? downMs : upMs;
      const hits = clock;
      const a = from;
      const at: Point = { x: 0, y: 0 };
      from = to;
      return {
        bar,
        to,
        leaves,
        hits,
        at: (ms: number): Point =>
          bezier(a, ctrl, to, clamp01((ms - leaves) / (hits - leaves)), at),
      };
    });
    const endAt = clock;
    const mallet = (ms: number): Point => {
      let s = strikes[0];
      for (const strike of strikes) if (ms >= strike.leaves) s = strike;
      return s.at(ms);
    };

    const striking = createBeats(
      strikes,
      (s) => s.hits,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 1), s.to);
        if (k === strikes.length - 1) {
          for (const bar of bars)
            cover!.levels(bar, levelsFor(bar.floor, levelShare, 1));
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.to);
          return;
        }
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, strikes.length - 1)));
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
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + RING_MS) return;
          // each struck bar rings, a flash of light running its length
          for (const s of strikes) {
            const t = (ms - s.hits) / RING_MS;
            if (t < 0 || t >= 1) continue;
            const half = s.bar.box.width * 0.5 * Math.min(1, t * 3);
            const { x, y } = s.bar.center;
            ringFrom.x = x - half;
            ringFrom.y = y;
            ringTo.x = x + half;
            ringTo.y = y;
            drawBeam(ctx, ringFrom, ringTo, RING_WIDTH * (1 - t), 1 - t);
          }
          drawWispBetween(
            ctx,
            mallet,
            ms,
            now,
            WISP_SIZE * MALLET,
            0.8,
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

const ringFrom: Point = { x: 0, y: 0 };
const ringTo: Point = { x: 0, y: 0 };
