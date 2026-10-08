// the "Hurdles" event (experiment: a hurdles race; free upgrade levels): it
// covers its crit, whose click freezes the screen while a hurdle of light
// springs up on every income bar and a runner wisp sprints out of the
// clicked floor's button along the top bar, leaping its hurdle in full
// stride: the hurdle blazes with a whoosh and a jolt as the bar lands free
// levels; it drops off the end onto the bar below and sprints back the
// other way, zigzagging down the bars ever faster, and clears the last
// hurdle in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "hurdles";
const MAX_BARS = 4;
const RIDE = 16;
const HURDLE = 46;
const JUMP = 80;
// the leap spans this much of each run, centred on the hurdle
const LEAP = 0.3;
const ENTER_MS = 200;
const DROP_MS = 140;
const HURDLE_WIDTH = 10;
const BLAZE_MS = 260;
const RUNNER = 0.45;
const CLEAR_SHAKE: [number, number] = [0.6, 1.2];

export const forceHurdlesEvent = registerWispEvent(
  KEY,
  "Hurdles",
  () => CONFIG.hurdlesEvent.chance,
  (floor, context) => {
    const { runsMs, holdMs, mergeMs } = CONFIG.hurdlesEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock: number = ENTER_MS;
    const runs = bars.map((bar, k) => {
      const ltr = k % 2 === 0;
      const y = bar.box.y - RIDE;
      const from = ltr ? bar.box.x : bar.box.x + bar.box.width;
      const to = ltr ? bar.box.x + bar.box.width : bar.box.x;
      const mid = (from + to) / 2;
      const starts = clock;
      const ms = lerp(runsMs, k / Math.max(1, bars.length - 1));
      const ends = starts + ms;
      clock = ends + DROP_MS;
      return {
        bar,
        y,
        from,
        to,
        starts,
        ends,
        clears: starts + ms * 0.5,
        foot: { x: mid, y: bar.box.y },
        top: { x: mid, y: bar.box.y - HURDLE },
      };
    });
    const last = runs[runs.length - 1];
    const endAt = last.clears;
    const runnerAt: Point = { x: 0, y: 0 };
    const runner = (ms: number): Point => {
      const first = runs[0];
      if (ms < first.starts) {
        const u = easeOut(clamp01(ms / ENTER_MS));
        runnerAt.x = lerp([button.x, first.from], u);
        runnerAt.y = lerp([button.y, first.y], u);
        return runnerAt;
      }
      let k = 0;
      while (k + 1 < runs.length && ms >= runs[k + 1].starts) k++;
      const r = runs[k];
      if (ms > r.ends) {
        // dropping off the end onto the next bar
        const next = runs[k + 1] ?? r;
        const u = easeIn(clamp01((ms - r.ends) / DROP_MS));
        runnerAt.x = r.to;
        runnerAt.y = lerp([r.y, next.y], u);
        return runnerAt;
      }
      const u = (ms - r.starts) / (r.ends - r.starts);
      const leap = clamp01((u - (0.5 - LEAP / 2)) / LEAP);
      runnerAt.x = lerp([r.from, r.to], u);
      runnerAt.y =
        r.y - Math.sin(leap * Math.PI) * JUMP - Math.abs(Math.sin(ms / 40)) * 4;
      return runnerAt;
    };

    const clearing = createBeats(
      runs,
      (r) => r.clears,
      (r, k) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor), r.top);
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(r.top);
          return;
        }
        cover!.burst(r.top, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CLEAR_SHAKE, k / Math.max(1, runs.length - 1)));
      },
    );
    const landing = createBeats(
      runs.slice(0, -1),
      (r) => r.ends + DROP_MS,
      () => {
        if (cover?.isLive()) playBloop();
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
          clearing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + BLAZE_MS) return;
          for (const r of runs) {
            const t = (ms - r.clears) / BLAZE_MS;
            if (t >= 1) continue;
            const blaze = t < 0 ? 0.5 : 1 - t;
            drawBeam(
              ctx,
              r.foot,
              r.top,
              HURDLE_WIDTH * (t < 0 ? 1 : 1 + t),
              blaze,
            );
          }
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              runner,
              ms,
              now,
              WISP_SIZE * RUNNER,
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
