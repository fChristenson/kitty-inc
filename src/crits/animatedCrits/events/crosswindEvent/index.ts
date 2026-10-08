// the "Crosswind" event (clutter; worker perma tiers): it covers its crit,
// whose click freezes the screen while a blast off the clicked floor's
// button blows glitter out all over the screen, landing in a spiral; then
// unseen gusts squeeze it: crosswinds from both sides shove it into one
// tall column down the middle, an updraft and a downdraft crush the column
// into a ball, a last gust from every side packs it into a heap, each gust
// a whoosh and a jolt; the heap bursts and its glitter streaks off onto the
// workers in view, one after another, each lighting up a perma tier, the
// last in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  heapSpots,
  scatterSpiral,
  simulateClean,
} from "../../../../shared/clutter";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "crosswind";
const BITS = 320;
const BIT = 10;
const MARGIN = 40;
const MAX_WORKERS = 6;
// which way each gust squeezes: across (x), up and down (y), or both
const GUSTS: ("x" | "y" | "xy")[] = ["x", "x", "y", "y", "xy"];
// a gust pushes a bit toward the middle line by SPRING px/ms² per px off it,
// at most MAX_PUSH; a loose bit settles at about 72 × its push in px/ms
const SPRING = 0.00016;
const MAX_PUSH = 0.035;
const HEAP_W = 110;
const HEAP_H = 70;
const BEND = 160;
const SPILL_SHAKE = 0.7;
const GUST_SHAKE: [number, number] = [0.45, 1.0];
const BURST_SHAKE = 1.1;
const HIT_SHAKE: [number, number] = [0.5, 1.0];

export const forceCrosswindEvent = registerWispEvent(
  KEY,
  "Crosswind",
  () => CONFIG.crosswindEvent.chance,
  (floor, context, area) => {
    const { spillMs, gustMs, gapMs, gatherMs, flyMs, holdMs, mergeMs } =
      CONFIG.crosswindEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const spots = scatterSpiral(
      {
        left: area.left + MARGIN,
        top: area.top + MARGIN,
        right: area.right - MARGIN,
        bottom: area.bottom - MARGIN,
      },
      BITS,
    );
    const fromButton = Math.max(
      ...spots.map((s) => Math.hypot(s.x - button.x, s.y - button.y)),
    );
    // each bit leaves the button as the blast's front reaches its distance
    const leaves = spots.map(
      (s) =>
        spillMs *
        0.35 *
        (Math.hypot(s.x - button.x, s.y - button.y) / fromButton),
    );
    const spillFly = spillMs * 0.65;

    const gusts = GUSTS.map((axis, k) => {
      const starts = spillMs + k * (gustMs + gapMs);
      return { axis, starts, ends: starts + gustMs };
    });
    const packed = gusts[gusts.length - 1].ends;
    const squeeze = (off: number, strength: number) =>
      Math.max(-MAX_PUSH, Math.min(MAX_PUSH, off * SPRING)) * strength;
    const swept = simulateClean(
      spots,
      [
        {
          kind: "force",
          push: (x, y, ms, into) => {
            for (const g of gusts) {
              if (ms < g.starts || ms >= g.ends) continue;
              // each gust swells and dies away
              const strength = Math.sin((Math.PI * (ms - g.starts)) / gustMs);
              into.x = g.axis === "y" ? 0 : squeeze(centre.x - x, strength);
              into.y = g.axis === "x" ? 0 : squeeze(centre.y - y, strength);
              return into;
            }
            return null;
          },
        },
      ],
      spillMs,
      packed,
    );
    // what's left settles into one heap, which then bursts onto the workers
    const heap = heapSpots(
      { x: centre.x, y: centre.y + HEAP_H / 2 },
      spots.length,
      HEAP_W,
      HEAP_H,
    );
    const burstAt = packed + gatherMs;
    const flights = spots.map((_, i) => {
      const w = i % workers.length;
      const departs = burstAt + w * flyMs * 0.25 + (i % 7) * 8;
      const to = workers[w].at;
      const from = heap[i];
      const side = i % 2 ? 1 : -1;
      return {
        w,
        departs,
        arrives: departs + flyMs,
        from,
        bend: {
          x: (from.x + to.x) / 2 + side * BEND * 0.5,
          y: Math.min(from.y, to.y) - BEND,
        },
        to,
      };
    });
    const hits = workers.map((_, w) =>
      Math.min(...flights.filter((f) => f.w === w).map((f) => f.arrives)),
    );
    const lastHit = Math.max(...hits);
    const endAt = Math.max(...flights.map((f) => f.arrives));

    const spilling = createBeats(
      [0],
      (ms) => ms,
      () => {
        cover!.burst(button, 0.8);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(SPILL_SHAKE);
      },
    );
    const gusting = createBeats(
      gusts,
      (g) => g.starts,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(GUST_SHAKE, k / (gusts.length - 1)));
      },
    );
    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => {
        cover!.burst(centre, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BURST_SHAKE);
      },
    );
    const tagging = createBeats(
      hits,
      (ms) => ms,
      (ms, w) => {
        const worker = workers[w];
        cover!.promote(worker);
        if (ms === lastHit) {
          cover!.blast(worker.at);
          return;
        }
        cover!.burst(worker.at, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, w / Math.max(1, workers.length - 1)));
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          spilling.tick(ms, now);
          gusting.tick(ms, now);
          bursting.tick(ms, now);
          tagging.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms < 0 || ms > endAt) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const gather = easeOut(clamp01((ms - packed) / gatherMs));
          for (let i = 0; i < spots.length; i++) {
            if (ms < leaves[i]) continue;
            const f = flights[i];
            if (ms >= f.arrives) continue;
            if (ms < spillMs) {
              const u = easeOut(clamp01((ms - leaves[i]) / spillFly));
              bit.x = lerp([button.x, spots[i].x], u);
              bit.y = lerp([button.y, spots[i].y], u);
            } else if (ms < packed) {
              swept.at(i, ms, bit);
            } else if (ms < f.departs) {
              const end = swept.end(i);
              bit.x = lerp([end.x, f.from.x], gather);
              bit.y = lerp([end.y, f.from.y], gather);
            } else {
              bezier(
                f.from,
                f.bend,
                f.to,
                easeIn(clamp01((ms - f.departs) / flyMs)),
                bit,
              );
            }
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              BIT,
              i * 1.3 + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
