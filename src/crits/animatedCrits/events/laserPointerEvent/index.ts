// the "Laser Pointer" event (beam; worker perma tiers): it covers its crit,
// whose click freezes the screen while a laser pointer flicks on from off
// the screen's corner and its blazing dot darts all over the screen, three
// wisp kittens bounding after it; it teases them, flicking away just as they
// pounce, then holds still on a worker and they all pile on, the beam
// flaring with a bang and a jolt as the worker lights up a perma tier; worker
// after worker, ever faster, the last pounce a huge blast and shake. Then
// the crit's tier pays out
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
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "laserPointer";
const MAX_WORKERS = 4;
// the kittens trail the dot by LAGS ms; a pounce lands once the last is there
const LAGS = [60, 100, 140];
const KITTEN = 0.55;
const POINTER = 5;
const BLAZE = 22;
const DOT = 16;
const FLARE_MS = 200;
// a tease is a dart TEASE px off the worker and straight back away
const TEASE = 150;
const TEASE_DWELL_MS = 40;
const POUNCE_SHAKE: [number, number] = [0.6, 1.4];

interface Stop {
  at: Point;
  arrives: number;
  leaves: number;
  worker: RewardWorker | null;
}

export const forceLaserPointerEvent = registerWispEvent(
  KEY,
  "Laser Pointer",
  () => CONFIG.laserPointerEvent.chance,
  (floor, context, area) => {
    const { dartsMs, holdsMs, holdMs, mergeMs } = CONFIG.laserPointerEvent;
    const workers = findRewardWorkers(floor, context)
      .sort((a, b) => a.at.y - b.at.y)
      .slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const fromLeft = Math.random() < 0.5;
    const pointer: Point = {
      x: fromLeft ? area.left - 40 : area.right + 40,
      y: area.bottom + 40,
    };
    const midX = (area.left + area.right) / 2;
    // a tease beside each worker, then the worker itself
    const stops: Stop[] = [];
    let clock = 0;
    const pounce = LAGS[LAGS.length - 1];
    workers.forEach((worker, k) => {
      const t = k / Math.max(1, workers.length - 1);
      const dart = lerp(dartsMs, t);
      const side = worker.at.x < midX ? 1 : -1;
      const tease: Point = {
        x: worker.at.x + side * TEASE,
        y: worker.at.y - TEASE * 0.4,
      };
      clock += dart;
      stops.push({
        at: tease,
        arrives: clock,
        leaves: clock + TEASE_DWELL_MS,
        worker: null,
      });
      clock += TEASE_DWELL_MS + dart;
      const leaves = clock + pounce + lerp(holdsMs, t);
      stops.push({ at: worker.at, arrives: clock, leaves, worker });
      clock = leaves;
    });
    const endAt = stops[stops.length - 1].arrives + pounce;
    const start: Point = {
      x: fromLeft ? area.left + 40 : area.right - 40,
      y: area.bottom - 60,
    };
    const dotAt: Point = { x: 0, y: 0 };
    const dot = (ms: number, into: Point): Point => {
      let k = 0;
      while (k < stops.length && ms >= stops[k].arrives) k++;
      if (k > 0 && ms < stops[k - 1].leaves) {
        into.x = stops[k - 1].at.x;
        into.y = stops[k - 1].at.y;
        return into;
      }
      if (k === stops.length) {
        const s = stops[k - 1];
        into.x = s.at.x;
        into.y = s.at.y;
        return into;
      }
      const from = k === 0 ? start : stops[k - 1].at;
      const departs = k === 0 ? 0 : stops[k - 1].leaves;
      const u = smoothstep(
        clamp01((ms - departs) / (stops[k].arrives - departs)),
      );
      into.x = lerp([from.x, stops[k].at.x], u);
      into.y = lerp([from.y, stops[k].at.y], u);
      return into;
    };
    const kittens = LAGS.map((lag) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < lag || ms > endAt ? null : dot(ms - lag, at);
    });
    const pounces = stops.filter((s) => s.worker);

    const teasing = createBeats(
      stops.filter((s) => !s.worker),
      (s) => s.leaves,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const pouncing = createBeats(
      pounces,
      (s) => s.arrives + pounce,
      (s, k) => {
        const t = k / Math.max(1, pounces.length - 1);
        cover!.promote(s.worker!);
        if (k === pounces.length - 1) {
          cover!.blast(s.at);
          return;
        }
        cover!.burst(s.at, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(POUNCE_SHAKE, t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          teasing.tick(ms, now);
          pouncing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const kitten of kittens)
            drawWispBetween(
              ctx,
              kitten,
              ms,
              now,
              WISP_SIZE * KITTEN,
              0.6,
              0,
              endAt,
            );
          if (ms > endAt + FLARE_MS) return;
          dot(ms, dotAt);
          // the beam blazes for a moment on every pounce
          let blaze = 0;
          for (const s of pounces) {
            const t = (ms - s.arrives - pounce) / FLARE_MS;
            if (t >= 0 && t < 1) blaze = Math.max(blaze, 1 - t);
          }
          const fade = ms > endAt ? 1 - (ms - endAt) / FLARE_MS : 1;
          drawBeam(
            ctx,
            pointer,
            dotAt,
            lerp([POINTER, BLAZE], blaze),
            (0.6 + 0.4 * Math.random()) * fade,
          );
          drawBeamFlare(ctx, dotAt, DOT * (1 + 2 * blaze), fade, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
