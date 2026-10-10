// the "Hailstone" event (experiment: the Collatz hailstone sequence; free
// upgrade levels): it covers its crit, whose click freezes the screen while
// a hailstone wisp pops in high on the right and bounces its way through a
// Collatz sequence toward the clicked floor's bar: every step its height is
// the number's (on a log scale), so an odd number tosses it way up on an
// updraft (3n + 1) and an even one drops it (n / 2), each landing a jolt and
// a glimmer left behind, tracing the sequence's jagged chart, quicker and
// quicker, its peak a bang; when the number falls to 1 it slams onto the
// bar for free levels in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { hops } from "../../../../shared/bounce";
import { drawBeam } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "hailstone";
// starts that take 14 to 23 steps to fall to 1
const STARTS = [7, 9, 15, 18, 19, 25];
// px from the screen's top and right the sequence's peak and start keep
const TOP = 200;
const RIGHT = 90;
const LIFT: [number, number] = [70, 30];
const APPEAR_MS = 140;
const STONE = WISP_SIZE * 0.9;
const MARK = 14;
const CHART_W = 5;
const CHART_ALPHA = 0.35;
const UP_SHAKE = 0.35;
const DOWN_SHAKE = 0.2;
const PEAK_SHAKE = 1.1;

function collatz(n: number): number[] {
  const values = [n];
  while (n > 1) {
    n = n % 2 ? 3 * n + 1 : n / 2;
    values.push(n);
  }
  return values;
}

export const forceHailstoneEvent = registerWispEvent(
  KEY,
  "Hailstone",
  () => CONFIG.hailstoneEvent.chance,
  (floor, context, area) => {
    const { stepMs, levelShare, holdMs, mergeMs } = CONFIG.hailstoneEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const values = collatz(STARTS[Math.floor(Math.random() * STARTS.length)]);
    const peak = Math.max(...values);
    const peakAt = values.indexOf(peak);
    const steps = values.length - 1;
    const bottom = bar.box.y;
    const top = Math.min(bottom - 200, area.top + TOP);
    const points: Point[] = values.map((v, i) => ({
      x: lerp([area.right - RIGHT, bar.center.x], i / steps),
      y: bottom - (Math.log2(v) / Math.log2(peak)) * (bottom - top),
    }));
    const path = hops(points, stepMs, LIFT, APPEAR_MS);
    const endAt = path.endMs;
    const levels = levelsFor(bar.floor, levelShare, 3);

    const appearing = createBeats(
      [0],
      (ms) => ms,
      () => {
        cover!.burst(points[0], 0.5);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      path.bounces,
      (b) => b.ms,
      (b, k) => {
        const i = k + 1;
        if (i === steps) {
          cover!.levels(bar, levels, points[i - 1]);
          cover!.slam(bar);
          cover!.blast(b.at);
          return;
        }
        const up = values[i] > values[i - 1];
        if (i === peakAt) {
          cover!.burst(b.at, 0.8);
          if (!cover!.isLive()) return;
          playExplosion();
          shakeScreen(PEAK_SHAKE);
          return;
        }
        if (up) cover!.burst(b.at, 0.35);
        if (!cover!.isLive()) return;
        if (up) playSwoosh();
        else playBloop();
        shakeScreen(up ? UP_SHAKE : DOWN_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          appearing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          // the chart so far: every landing so far joined up, fading at the end
          const fade = 1 - clamp01((ms - endAt) / 400);
          let landed = 0;
          while (landed < steps && path.bounces[landed].ms <= ms) landed++;
          for (let i = 1; i <= landed; i++)
            drawBeam(
              ctx,
              points[i - 1],
              points[i],
              CHART_W,
              CHART_ALPHA * fade,
            );
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          ctx.globalAlpha = fade;
          for (let i = 0; i <= landed; i++)
            stampGlimmer(
              ctx,
              points[i].x,
              points[i].y,
              i === peakAt ? MARK * 2 : MARK,
              ms * 0.004 + i,
              i === peakAt ? COLOR.white : COLOR.heavenlyGold,
            );
          endLightBatch(ctx);
          ctx.restore();
          drawWispBetween(ctx, path.at, ms, now, STONE, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
