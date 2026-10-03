// the "Double Strike" event (lightning; worker perma tiers): it covers its
// crit, whose click freezes the screen while a thin flickering leader bolt
// stabs down out of the sky onto a worker with a crackle, marking them;
// a beat later lightning strikes twice in the same place: a massive bolt
// cracks down along the same path in a blinding flash, a crack and a big
// jolt, and the worker climbs a perma tier; worker after worker, the beats
// ever quicker, the last strike a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { findRewardWorkers } from "../eventRewards";

const KEY = "doubleStrike";
const MAX_WORKERS = 6;
const LEADER_MS = 220;
const BOLT_MS = 260;
const LEADER = 0.4;
const BOLT = 1.8;
const MARK_SHAKE = 0.25;
const HIT_SHAKE: [number, number] = [0.8, 1.5];

export const forceDoubleStrikeEvent = registerWispEvent(
  KEY,
  "Double Strike",
  () => CONFIG.doubleStrikeEvent.chance,
  (floor, context, area) => {
    const { gapsMs, waitMs, holdMs, mergeMs } = CONFIG.doubleStrikeEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock = 0;
    const strikes = workers.map((worker, k) => {
      const sky: Point = {
        x: worker.at.x + (Math.random() - 0.5) * 140,
        y: area.top,
      };
      const marks = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      // both bolts share one path, so it strikes the very same place
      const bolt = createBolt(sky, worker.at, 2);
      return { worker, bolt, marks, hits: marks + waitMs };
    });
    const last = strikes[strikes.length - 1];
    const endAt = last.hits;

    const marking = createBeats(
      strikes,
      (s) => s.marks,
      () => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(MARK_SHAKE);
      },
    );
    const hitting = createBeats(
      strikes,
      (s) => s.hits,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, strikes.length - 1)));
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
          marking.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + BOLT_MS) return;
          for (const s of strikes) {
            const m = (ms - s.marks) / LEADER_MS;
            if (m >= 0 && m < 1) {
              drawBolt(
                ctx,
                s.bolt,
                (1 - m) * (0.5 + 0.5 * Math.random()),
                LEADER,
              );
              drawStrike(ctx, s.worker.at, 0.5 * (1 - m), 0.5, now);
            }
            const h = (ms - s.hits) / BOLT_MS;
            if (h >= 0 && h < 1) {
              drawBolt(ctx, s.bolt, 1 - h, BOLT);
              drawStrike(ctx, s.worker.at, 1 - h, 1.4, now);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
