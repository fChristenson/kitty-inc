// the "Dust Bunnies" event (clutter; worker perma tiers): it covers its
// crit, whose click freezes the screen while a gust blows gold dust in off
// the screen's side, settling in wavy drifts over all of it; one huge
// broom sweeps it down from the top and up from the bottom into a line
// across the middle, then works along the line in short brisk strokes,
// pushing it from both sides into a fat dust bunny for every worker in
// view, every stroke a swoosh and a jolt; each bunny then hops up onto its
// worker in a flash, lighting up a perma tier, the last in a huge blast.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawBroom,
  heapSpots,
  planSweep,
  scatterWaves,
  simulateSweep,
  sweepLane,
  type BroomState,
  type SweepStroke,
} from "../../../../shared/clutter";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "dustBunnies";
const BITS = 360;
const BIT = 10;
const MARGIN = 40;
const MAX_WORKERS = 4;
// px each half of the line sits off the middle, and the short strokes' head
const BAND = 40;
const SHORT = 150;
const HEAP_W = 90;
const HEAP_H = 60;
const BEND = 180;
const GUST_SHAKE = 0.6;
const STROKE_SHAKE: [number, number] = [0.3, 0.8];
const HOP_SHAKE = 0.9;

export const forceDustBunniesEvent = registerWispEvent(
  KEY,
  "Dust Bunnies",
  () => CONFIG.dustBunniesEvent.chance,
  (floor, context, area) => {
    const { blowMs, dragMs, liftMs, gatherMs, hopMs, holdMs, mergeMs } =
      CONFIG.dustBunniesEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const box = {
      left: area.left + MARGIN,
      top: area.top + MARGIN,
      right: area.right - MARGIN,
      bottom: area.bottom - MARGIN,
    };
    const spots = scatterWaves(box, BITS);
    // the gust carries each bit in from the left, the nearest first
    const arrives = spots.map(
      (s) => blowMs * (0.3 + 0.7 * ((s.x - box.left) / (box.right - box.left))),
    );
    const mid = (area.top + area.bottom) / 2;
    const midX = (area.left + area.right) / 2;
    const wide = (area.right - area.left) * 1.05;
    // down from the top and up from the bottom into a line, then along it
    // in from both sides of every bunny's spot
    const strokes: SweepStroke[] = [
      ...sweepLane(
        { x: midX, y: area.top - 40 },
        { x: midX, y: mid - BAND },
        2,
        Math.PI / 2,
        wide,
      ),
      ...sweepLane(
        { x: midX, y: area.bottom + 40 },
        { x: midX, y: mid + BAND },
        2,
        -Math.PI / 2,
        wide,
      ),
    ];
    const n = workers.length;
    const segment = (area.right - area.left) / n;
    const bunnies: Point[] = workers.map((_, k) => ({
      x: area.left + segment * (k + 0.5),
      y: mid,
    }));
    bunnies.forEach((b, k) => {
      const lo = area.left + segment * k - 20;
      const hi = area.left + segment * (k + 1) + 20;
      strokes.push(
        {
          from: { x: lo, y: mid },
          to: { x: b.x - 24, y: mid },
          heading: 0,
          length: SHORT,
        },
        {
          from: { x: hi, y: mid },
          to: { x: b.x + 24, y: mid },
          heading: Math.PI,
          length: SHORT,
        },
      );
    });
    const sweep = planSweep(strokes, blowMs, dragMs, liftMs);
    const swept = simulateSweep(sweep, spots);
    const sweptAt = sweep.endMs;
    // every bit gathers into the bunny nearest where the sweep left it
    const owner = spots.map((_, i) => {
      const end = swept.end(i);
      let best = 0;
      for (let k = 1; k < n; k++)
        if (Math.abs(bunnies[k].x - end.x) < Math.abs(bunnies[best].x - end.x))
          best = k;
      return best;
    });
    const heaps = bunnies.map((b) =>
      heapSpots({ x: b.x, y: b.y + HEAP_H / 2 }, BITS, HEAP_W, HEAP_H),
    );
    const hopsAt = workers.map((_, k) => sweptAt + gatherMs + k * hopMs * 0.4);
    const landsAt = hopsAt.map((ms) => ms + hopMs);
    const endAt = landsAt[n - 1];
    const bends = workers.map((w, k) => ({
      x: (bunnies[k].x + w.at.x) / 2,
      y: Math.min(bunnies[k].y, w.at.y) - BEND,
    }));

    const gusting = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(GUST_SHAKE);
      },
    );
    const sweeping = createBeats(
      sweep.starts,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(STROKE_SHAKE, k / Math.max(1, strokes.length - 1)));
      },
    );
    const bunching = createBeats(
      [sweptAt],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      landsAt,
      (ms) => ms,
      (_, k) => {
        const worker = workers[k];
        cover!.promote(worker);
        if (k === n - 1) {
          cover!.blast(worker.at);
          return;
        }
        cover!.burst(worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HOP_SHAKE);
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const broom: BroomState = {
      x: 0,
      y: 0,
      heading: 0,
      length: 0,
      pushing: false,
    };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          gusting.tick(ms, now);
          sweeping.tick(ms, now);
          bunching.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const gather = easeOut(clamp01((ms - sweptAt) / gatherMs));
          for (let i = 0; i < spots.length; i++) {
            const k = owner[i];
            if (ms >= landsAt[k]) continue;
            if (ms < blowMs) {
              const u = easeOut(clamp01(ms / arrives[i]));
              bit.x = lerp([area.left - 100, spots[i].x], u);
              bit.y = spots[i].y - 80 * Math.sin(Math.PI * u);
            } else if (ms < sweptAt) {
              swept.at(i, ms, bit);
            } else if (ms < hopsAt[k]) {
              const end = swept.end(i);
              bit.x = lerp([end.x, heaps[k][i].x], gather);
              bit.y = lerp([end.y, heaps[k][i].y], gather);
            } else {
              const from = heaps[k][i];
              const to = workers[k].at;
              bezier(
                from,
                bends[k],
                to,
                easeIn(clamp01((ms - hopsAt[k]) / hopMs)),
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
          if (ms >= blowMs - 100 && ms <= sweptAt + 100) {
            const b = sweep.at(Math.min(Math.max(ms, blowMs), sweptAt), broom);
            if (b) drawBroom(ctx, b, 1, ms, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
