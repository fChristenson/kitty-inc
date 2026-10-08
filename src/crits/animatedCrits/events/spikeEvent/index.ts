// the "Spike" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while a ball wisp is bumped up out of the clicked
// floor's button and set high over an income bar; a spiker wisp leaps up to
// meet it at the top and slams it straight down onto the bar with a bang and
// a big jolt, and the bar jumps a crit tier; the ball pops back up and is
// set again over the next bar, each rally quicker, the last spike a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "spike";
const MAX_BARS = 3;
// each set peaks SET px over the bar; the spike takes SPIKE_MS
const SET = 230;
const SPIKE_MS = 90;
const BALL = 0.4;
const SPIKER = 0.55;
const HIT_SHAKE: [number, number] = [1, 1.5];

export const forceSpikeEvent = registerWispEvent(
  KEY,
  "Spike",
  () => CONFIG.spikeEvent.chance,
  (floor, context) => {
    const { setsMs, holdMs, mergeMs } = CONFIG.spikeEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const rallies = bars.map((bar, k) => {
      const top: Point = {
        x: bar.center.x + (k % 2 === 0 ? 60 : -60),
        y: bar.center.y - SET,
      };
      const ctrl: Point = { x: (from.x + top.x) / 2, y: top.y - 120 };
      const sets = clock;
      const spikes = sets + lerp(setsMs, k / Math.max(1, bars.length - 1));
      const hits = spikes + SPIKE_MS;
      clock = hits;
      const rally = { bar, from, ctrl, top, sets, spikes, hits };
      from = bar.center;
      return rally;
    });
    const last = rallies[rallies.length - 1];
    const endAt = last.hits;
    const ballAt: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point => {
      let r = rallies[0];
      for (const rally of rallies) if (ms >= rally.sets) r = rally;
      if (ms < r.spikes)
        return bezier(
          r.from,
          r.ctrl,
          r.top,
          easeOut(clamp01((ms - r.sets) / (r.spikes - r.sets))),
          ballAt,
        );
      const u = easeIn(clamp01((ms - r.spikes) / SPIKE_MS));
      ballAt.x = lerp([r.top.x, r.bar.center.x], u);
      ballAt.y = lerp([r.top.y, r.bar.center.y], u);
      return ballAt;
    };
    const spikerAt: Point = { x: 0, y: 0 };
    const spiker = (ms: number): Point => {
      let r = rallies[0];
      for (const rally of rallies) if (ms >= rally.sets) r = rally;
      // it leaps from below to meet the ball at the top of the set
      const u = clamp01((ms - r.sets) / (r.spikes - r.sets));
      const side = r.top.x > r.bar.center.x ? 1 : -1;
      spikerAt.x = r.top.x + side * 30;
      spikerAt.y =
        lerp([r.bar.center.y + 20, r.top.y - 20], easeOut(u)) +
        (ms > r.spikes ? (ms - r.spikes) * 0.6 : 0);
      return spikerAt;
    };

    const bumping = createBeats(
      rallies,
      (r) => r.sets,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const spiking = createBeats(
      rallies,
      (r) => r.hits,
      (r, k) => {
        cover!.tierUp(r.bar, r.top);
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(r.bar.center);
          return;
        }
        cover!.burst(r.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, rallies.length - 1)));
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
          bumping.tick(ms, now);
          spiking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawWispBetween(ctx, ball, ms, now, WISP_SIZE * BALL, 1, 0, endAt);
          for (const r of rallies)
            drawWispBetween(
              ctx,
              spiker,
              ms,
              now,
              WISP_SIZE * SPIKER,
              0.6,
              r.sets + (r.spikes - r.sets) * 0.4,
              r.hits,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
