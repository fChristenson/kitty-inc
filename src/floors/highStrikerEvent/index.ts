// the "High Striker" event (an experiment beyond the seven looks: the
// carnival strongman bell; free upgrade levels): it covers its crit, whose
// click freezes the screen while a beam of light shoots up the middle of the
// screen to a bell wisp at the top and a mallet wisp slams down at its foot
// with a bang and a jolt, firing a puck wisp up the track; every income bar
// it rockets past lands free levels; it falls back and the mallet slams
// again, harder, the puck flying higher, and on the third strike it rings
// the bell with a "DING!" in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../shared/critText";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "highStriker";
const MAX_BARS = 5;
// the puck flies HEIGHTS of the way up the track on each strike, rising
// for RISE of the strike
const HEIGHTS = [0.45, 0.75, 1];
const RISE = 0.45;
const TOP = 170;
const BOTTOM = 90;
const MALLET_MS = 120;
const TRACK = 6;
const BELL = 0.7;
const PUCK = 0.45;
const MALLET = 0.6;
const DING_MS = 600;
const STRIKE_SHAKE: [number, number] = [0.7, 1.2];

export const forceHighStrikerEvent = registerWispEvent(
  KEY,
  "High Striker",
  () => CONFIG.highStrikerEvent.chance,
  (floor, context, area) => {
    const { strikesMs, holdMs, mergeMs } = CONFIG.highStrikerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const cx = (area.left + area.right) / 2;
    const foot: Point = { x: cx, y: area.bottom - BOTTOM };
    const bell: Point = { x: cx, y: area.top + TOP };
    const ding = createCritTextSprite("DING!", COLOR.heavenlyGold, {
      fontSize: 60,
      strokeWidth: 10,
    });
    let clock = MALLET_MS;
    const strikes = HEIGHTS.map((height, k) => {
      const hits = clock;
      const span = lerp(strikesMs, k / (HEIGHTS.length - 1));
      clock += span;
      const peak = lerp([foot.y, bell.y], height);
      const rise = span * RISE;
      // the moment the rising puck passes each bar it reaches
      const passes = bars
        .filter((bar) => bar.center.y >= peak)
        .map((bar) => {
          const share = (foot.y - bar.center.y) / (foot.y - peak);
          // easeOut(t) = share: t = 1 - sqrt(1 - share)
          return { bar, at: hits + rise * (1 - Math.sqrt(1 - share)) };
        });
      return {
        hits,
        span,
        peak,
        rise,
        passes,
        rings: height === 1 ? hits + rise : null,
      };
    });
    const ringAt = strikes[strikes.length - 1].rings!;
    const endAt = ringAt;
    const passes: { bar: RewardBar; at: number }[] = strikes.flatMap(
      (s) => s.passes,
    );
    const puckAt: Point = { x: cx, y: 0 };
    const puck = (ms: number): Point => {
      let s = strikes[0];
      for (const strike of strikes) if (ms >= strike.hits) s = strike;
      const t = ms - s.hits;
      puckAt.y =
        t < s.rise
          ? lerp([foot.y, s.peak], easeOut(clamp01(t / s.rise)))
          : lerp(
              [s.peak, foot.y],
              easeIn(clamp01((t - s.rise) / (s.span - s.rise))),
            );
      return puckAt;
    };
    const malletAt: Point = { x: cx + 40, y: 0 };
    const mallet = (ms: number): Point => {
      let s = strikes[0];
      for (const strike of strikes)
        if (ms >= strike.hits - MALLET_MS) s = strike;
      const u = clamp01((ms - (s.hits - MALLET_MS)) / MALLET_MS);
      malletAt.y = foot.y - 140 * (1 - easeIn(u));
      return malletAt;
    };
    const bellSpot = () => bell;

    const striking = createBeats(
      strikes,
      (s) => s.hits,
      (_, k) => {
        cover!.burst(foot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / (strikes.length - 1)));
      },
    );
    const passing = createBeats(
      passes,
      (p) => p.at,
      (p) =>
        cover!.levels(
          p.bar,
          Math.max(1, Math.round(levelsFor(p.bar.floor) / 2)),
          foot,
        ),
    );
    const ringing = createBeats(
      [ringAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(bell);
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
          striking.tick(ms, now);
          passing.tick(ms, now);
          ringing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DING_MS) return;
          if (ms <= endAt) {
            drawBeam(ctx, foot, bell, TRACK, 0.35);
            drawWispBetween(
              ctx,
              puck,
              ms,
              now,
              WISP_SIZE * PUCK,
              1,
              strikes[0].hits,
              endAt,
            );
            drawWispBetween(
              ctx,
              mallet,
              ms,
              now,
              WISP_SIZE * MALLET,
              0.5,
              0,
              endAt,
            );
          }
          drawWispBetween(
            ctx,
            bellSpot,
            ms,
            now,
            WISP_SIZE * BELL,
            ms >= ringAt ? 1 : 0.3,
            0,
            endAt + DING_MS,
          );
          const t = (ms - ringAt) / DING_MS;
          if (t >= 0 && t < 1)
            drawCritTextSprite(
              ctx,
              ding,
              bell.x,
              bell.y - 70 - 30 * t,
              1 + 0.4 * (1 - t),
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
