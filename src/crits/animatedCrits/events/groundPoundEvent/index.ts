// the "Ground Pound" event (explosion; worker perma tiers): it covers its
// crit, whose click freezes the screen while a huge lit bomb wisp leaps out
// of the clicked floor's button in a high arc and pounds down on a worker in
// a big blast whose shock blows a ring of smaller blasts outward round it, a
// bang and a hard jolt each, as the worker climbs a perma tier; it bounces
// on to the next worker in lower, quicker leaps, and its last pound is a
// colossal blast and the biggest shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "groundPound";
const MAX_WORKERS = 5;
const ARC: [number, number] = [420, 220];
const BLAST = 240;
const FINAL_BLAST = 440;
const RING = 6;
const RING_BLAST = 90;
const RING_REACH = 110;
const RING_MS = 30;
const BOMB = 0.8;
const FUSE = 22;
const BANG_GAP_MS = 60;
const POUND_SHAKE: [number, number] = [1.0, 1.6];

interface Leap {
  worker: RewardWorker;
  from: Point;
  bend: Point;
  leaves: number;
  lands: number;
  final: boolean;
}

export const forceGroundPoundEvent = registerWispEvent(
  KEY,
  "Ground Pound",
  () => CONFIG.groundPoundEvent.chance,
  (floor, context) => {
    const { leapsMs, holdMs, mergeMs } = CONFIG.groundPoundEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const leaps: Leap[] = workers.map((worker, k) => {
      const t = k / Math.max(1, workers.length - 1);
      const leaves = clock;
      clock += lerp(leapsMs, t);
      const leap = {
        worker,
        from,
        bend: {
          x: (from.x + worker.at.x) / 2,
          y: Math.min(from.y, worker.at.y) - lerp(ARC, t),
        },
        leaves,
        lands: clock,
        final: k === workers.length - 1,
      };
      from = worker.at;
      return leap;
    });
    const endAt = clock;
    const blasts = leaps.flatMap((l, k) => [
      {
        at: l.worker.at,
        ms: l.lands,
        size: l.final ? FINAL_BLAST : BLAST,
        shake: l.final
          ? 2.4
          : lerp(POUND_SHAKE, k / Math.max(1, leaps.length - 1)),
      },
      ...Array.from({ length: RING }, (_, i) => {
        const a = (i / RING) * Math.PI * 2;
        return {
          at: {
            x: l.worker.at.x + Math.cos(a) * RING_REACH,
            y: l.worker.at.y + Math.sin(a) * RING_REACH * 0.5,
          },
          ms: l.lands + 40 + (i % 3) * RING_MS,
          size: RING_BLAST,
          shake: i === 0 ? 0.5 : 0,
        };
      }),
    ]);
    const bombAt: Point = { x: 0, y: 0 };
    const bomb = (ms: number): Point => {
      const t = Math.max(0, ms);
      let l = leaps[0];
      for (const leap of leaps) if (t >= leap.leaves) l = leap;
      const u = clamp01((t - l.leaves) / (l.lands - l.leaves));
      return bezier(l.from, l.bend, l.worker.at, u, bombAt);
    };
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        if (b.shake > 0) shakeScreen(b.shake);
      },
    );
    const pounding = createBeats(
      leaps,
      (l) => l.lands,
      (l) => {
        cover!.promote(l.worker);
        if (l.final) cover!.blast(l.worker.at);
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
          booming.tick(ms, now);
          pounding.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 900) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          if (ms >= endAt) return;
          drawLitFuse(ctx, bomb(ms), ms / endAt, FUSE, now);
          drawWispBetween(ctx, bomb, ms, now, WISP_SIZE * BOMB, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
