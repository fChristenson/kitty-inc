// the "Pick-Up Sticks" event (beam; crit tiers): it covers its crit, whose
// click freezes the screen while a fistful of blazing beams stands bundled
// upright in the middle of the screen; it's let go and the beams clatter
// down every which way into a crisscrossed heap with a crash and a jolt;
// then they're plucked off the heap one at a time, each flying up, swinging
// flat and slamming down along an income bar in a flare, a crack and a jolt
// that jumps it a crit tier, quicker every time; the last slam in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "pickUpSticks";
const MAX_BARS = 5;
const STICKS = 7;
const LENGTH = 440;
const WIDTH = 16;
const FAN = 0.12;
const HEAP_W = 260;
const HEAP_H = 160;
const FLY_LIFT = 140;
const FLARE_MS = 260;
const CRASH_SHAKE = 1.1;
const SLAM_SHAKE: [number, number] = [0.6, 1.3];

interface Stick {
  bar: RewardBar;
  tiers: boolean;
  // standing in the bundle, lying in the heap, and flat along its bar
  stand: number;
  heap: Point;
  angle: number;
  plucked: number;
  slams: number;
}

export const forcePickUpSticksEvent = registerWispEvent(
  KEY,
  "Pick-Up Sticks",
  () => CONFIG.pickUpSticksEvent.chance,
  (floor, context, area) => {
    const { standMs, fallMs, settleMs, plucksMs, flyMs, holdMs, mergeMs } =
      CONFIG.pickUpSticksEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const mid: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * 0.55,
    };
    const crashAt = standMs + fallMs;
    let clock = crashAt + settleMs;
    const count = Math.max(STICKS, bars.length);
    const sticks: Stick[] = Array.from({ length: count }, (_, i) => {
      const plucked = clock;
      clock += lerp(plucksMs, i / Math.max(1, count - 1));
      return {
        bar: bars[i % bars.length],
        tiers: i < bars.length,
        stand: (i / (count - 1) - 0.5) * FAN,
        heap: {
          x: mid.x + (Math.random() - 0.5) * HEAP_W,
          y: mid.y + (Math.random() - 0.5) * HEAP_H,
        },
        angle: Math.random() * Math.PI,
        plucked,
        slams: plucked + flyMs,
      };
    });
    const last = sticks[sticks.length - 1];
    const endAt = last.slams;
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const at: Point = { x: 0, y: 0 };

    const crashing = createBeats(
      [crashAt],
      (ms) => ms,
      () => {
        cover!.burst(mid, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CRASH_SHAKE);
      },
    );
    const slamming = createBeats(
      sticks,
      (s) => s.slams,
      (s, k) => {
        if (s.tiers) cover!.tierUp(s.bar, s.bar.center);
        else cover!.slam(s.bar);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SLAM_SHAKE, k / Math.max(1, sticks.length - 2)));
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
          crashing.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + FLARE_MS) return;
          for (const s of sticks) {
            const since = ms - s.slams;
            if (since >= 0) {
              if (since < FLARE_MS) {
                const fade = 1 - since / FLARE_MS;
                const half = s.bar.box.width / 2;
                a.x = s.bar.center.x - half;
                b.x = s.bar.center.x + half;
                a.y = b.y = s.bar.center.y;
                drawBeam(ctx, a, b, WIDTH * (1 + fade), fade);
                drawBeamFlare(ctx, s.bar.center, 50, fade, now);
              }
              continue;
            }
            let angle: number;
            let length = LENGTH;
            if (ms < standMs) {
              // bundled upright, trembling
              angle =
                -Math.PI / 2 + s.stand + Math.sin(ms * 0.05 + s.angle) * 0.02;
              at.x = mid.x;
              at.y = mid.y;
            } else if (ms < s.plucked) {
              // toppling over into the heap
              const u = easeIn(clamp01((ms - standMs) / fallMs));
              angle = lerp([-Math.PI / 2 + s.stand, s.angle], u);
              at.x = lerp([mid.x, s.heap.x], u);
              at.y = lerp([mid.y, s.heap.y], u);
            } else {
              // plucked, swinging flat and slamming down along its bar
              const u = clamp01((ms - s.plucked) / flyMs);
              const e = easeIn(u);
              angle = lerp(
                [s.angle, s.angle > Math.PI / 2 ? Math.PI : 0],
                easeOut(u),
              );
              length = lerp([LENGTH, s.bar.box.width], e);
              at.x = lerp([s.heap.x, s.bar.center.x], e);
              at.y =
                lerp([s.heap.y, s.bar.center.y], e) -
                Math.sin(Math.PI * u) * FLY_LIFT;
            }
            const dx = (Math.cos(angle) * length) / 2;
            const dy = (Math.sin(angle) * length) / 2;
            a.x = at.x - dx;
            a.y = at.y - dy;
            b.x = at.x + dx;
            b.y = at.y + dy;
            drawBeam(ctx, a, b, WIDTH, 0.95);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
