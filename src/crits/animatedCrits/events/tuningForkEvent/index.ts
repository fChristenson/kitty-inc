// the "Tuning Fork" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while two prong wisps drop in over an income bar
// and start to hum, swinging apart and together ever faster and wider, a
// bolt flickering between them quicker and quicker into a solid crackling
// buzz; then the fork strikes: both prongs slam down onto the bar, each
// cracking a bolt into it, in a flash, a bang and a jolt as it jumps a crit
// tier; the fork rings on the next bar, quicker each time, the last strike
// a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "tuningFork";
const MAX_BARS = 4;
const RISE = 150;
const GAP = 70;
const ENTER_MS = 120;
const STRIKE_MS = 90;
const AFTER_MS = 200;
// the hum's swing (px) and beat (Hz) as it builds
const SWING: [number, number] = [4, 26];
const HUM_HZ: [number, number] = [4, 22];
const WISP = 0.45;
const STRIKE_SHAKE: [number, number] = [0.8, 1.5];

interface Fork {
  bar: RewardBar;
  starts: number;
  strikes: number;
  hits: number;
  prongs: [Point, Point];
  arc: Bolt;
  stabs: [Bolt, Bolt];
}

export const forceTuningForkEvent = registerWispEvent(
  KEY,
  "Tuning Fork",
  () => CONFIG.tuningForkEvent.chance,
  (floor, context) => {
    const { humsMs, holdMs, mergeMs } = CONFIG.tuningForkEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const forks: Fork[] = bars.map((bar, k) => {
      const starts = clock;
      const strikes =
        starts + ENTER_MS + lerp(humsMs, k / Math.max(1, bars.length - 1));
      const hits = strikes + STRIKE_MS;
      clock = hits;
      const prongs: [Point, Point] = [
        { x: bar.center.x - GAP / 2, y: bar.center.y - RISE },
        { x: bar.center.x + GAP / 2, y: bar.center.y - RISE },
      ];
      return {
        bar,
        starts,
        strikes,
        hits,
        prongs,
        arc: createBolt(prongs[0], prongs[1], 0),
        stabs: [
          createBolt(prongs[0], bar.center, 1),
          createBolt(prongs[1], bar.center, 1),
        ],
      };
    });
    const last = forks[forks.length - 1];
    const endAt = last.hits + AFTER_MS;
    // where each prong is at ms: dropping in, humming, then slamming down
    const place = (f: Fork, ms: number) => {
      const hum = clamp01(
        (ms - f.starts - ENTER_MS) / (f.strikes - f.starts - ENTER_MS),
      );
      const swing =
        ms < f.strikes
          ? lerp(SWING, hum) *
            Math.sin(
              ((ms - f.starts) / 1000) * Math.PI * 2 * lerp(HUM_HZ, hum * hum),
            )
          : 0;
      const drop = easeOut(clamp01((ms - f.starts) / ENTER_MS));
      const slam = easeIn(clamp01((ms - f.strikes) / STRIKE_MS));
      const y = lerp(
        [f.bar.center.y - RISE * 2.5, f.bar.center.y - RISE],
        drop,
      );
      for (let side = 0; side < 2; side++) {
        const p = f.prongs[side];
        const out = (side === 0 ? -1 : 1) * (GAP / 2 + swing);
        p.x = f.bar.center.x + out * (1 - slam);
        p.y = lerp([y, f.bar.box.y - 6], slam);
      }
    };
    const prongs = forks.flatMap((f) =>
      f.prongs.map((p) => (ms: number) => (place(f, ms), p)),
    );

    const humming = createBeats(
      forks,
      (f) => f.starts + ENTER_MS,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const striking = createBeats(
      forks,
      (f) => f.hits,
      (f, k) => {
        cover!.tierUp(f.bar);
        if (f === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(f.bar.center);
          return;
        }
        cover!.burst(f.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, forks.length - 1)));
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
          humming.tick(ms, now);
          striking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (let i = 0; i < forks.length; i++) {
            const f = forks[i];
            if (ms < f.starts || ms > f.hits + AFTER_MS) continue;
            place(f, ms);
            const hum = clamp01(
              (ms - f.starts - ENTER_MS) / (f.strikes - f.starts - ENTER_MS),
            );
            // flickers on and off, ever faster, until it holds solid
            const flicker = Math.sin(ms / lerp([60, 8], hum)) > 0.6 - 1.6 * hum;
            if (ms < f.strikes && hum > 0 && flicker)
              drawBolt(ctx, f.arc, 0.4 + 0.6 * hum, 0.6);
            if (ms >= f.hits) {
              const fade = 1 - (ms - f.hits) / AFTER_MS;
              drawBolt(ctx, f.stabs[0], fade, 0.9);
              drawBolt(ctx, f.stabs[1], fade, 0.9);
              drawStrike(ctx, f.bar.center, fade, 1, now);
            }
            drawWispBetween(
              ctx,
              prongs[i * 2],
              ms,
              now,
              WISP_SIZE * WISP,
              0.5,
              f.starts,
              f.hits + AFTER_MS,
            );
            drawWispBetween(
              ctx,
              prongs[i * 2 + 1],
              ms,
              now,
              WISP_SIZE * WISP,
              0.5,
              f.starts,
              f.hits + AFTER_MS,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
