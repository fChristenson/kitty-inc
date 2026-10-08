// the "Fencing" event (wisp; worker perma tiers): it covers its crit, whose
// click freezes the screen while a pair of fencer wisps faces off over every
// worker; they dart in and clash, spring apart and clash again, faster each
// bout, every clash a flash and a ring, until both lunge down onto their
// worker in a flash and a jolt that lights it up a perma tier, the bouts
// finishing one after another, the last in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "fencing";
const MAX_WORKERS = 5;
const CLASHES = 3;
const GUARD = 80;
const ABOVE = 110;
const BOB = 8;
const ENTER_MS = 200;
const LUNGE_MS = 140;
const FENCER = 0.4;
const CLASH_SHAKE = 0.3;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Bout {
  worker: RewardWorker;
  line: Point;
  starts: number;
  clashes: number[];
  hits: number;
}

export const forceFencingEvent = registerWispEvent(
  KEY,
  "Fencing",
  () => CONFIG.fencingEvent.chance,
  (floor, context) => {
    const { staggerMs, boutMs, holdMs, mergeMs } = CONFIG.fencingEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const bouts: Bout[] = workers.map((worker, k) => {
      const starts = k * staggerMs;
      let clock = starts + ENTER_MS;
      const clashes = Array.from({ length: CLASHES }, (_, j) => {
        clock += lerp(boutMs, j / (CLASHES - 1));
        return clock;
      });
      return {
        worker,
        line: { x: worker.at.x, y: worker.at.y - ABOVE },
        starts,
        clashes,
        hits: clock + LUNGE_MS,
      };
    });
    const last = bouts.reduce((a, b) => (b.hits > a.hits ? b : a));
    const endAt = last.hits;
    // how far apart the pair stands at ms: together at every clash
    const apartAt = (bout: Bout, ms: number) => {
      const first = bout.starts + ENTER_MS;
      if (ms < first)
        return (
          GUARD * 2.5 * (1 - easeOut(clamp01((ms - bout.starts) / ENTER_MS))) +
          GUARD
        );
      let from = first;
      for (const at of bout.clashes) {
        if (ms < at) {
          const u = (ms - from) / (at - from);
          return from === first
            ? GUARD * (1 - easeIn(u))
            : GUARD * Math.sin(Math.PI * u);
        }
        from = at;
      }
      return 0;
    };
    const fencers = bouts.flatMap((bout) =>
      [-1, 1].map((side) => {
        const at: Point = { x: 0, y: 0 };
        return {
          bout,
          at: (ms: number): Point => {
            const t = Math.max(0, ms);
            const lastClash = bout.clashes[CLASHES - 1];
            const lunge = easeIn(clamp01((t - lastClash) / LUNGE_MS));
            at.x = bout.line.x + side * apartAt(bout, t) * (1 - lunge);
            at.y =
              lerp([bout.line.y, bout.worker.at.y], lunge) +
              side * Math.sin(t * 0.03) * BOB * (1 - lunge);
            return at;
          },
        };
      }),
    );
    const clashes = bouts.flatMap((bout) =>
      bout.clashes.map((ms) => ({ bout, ms })),
    );

    const clashing = createBeats(
      clashes,
      (c) => c.ms,
      (c) => {
        cover!.burst(c.bout.line, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CLASH_SHAKE);
      },
    );
    const order = bouts.slice().sort((a, b) => a.hits - b.hits);
    const hitting = createBeats(
      order,
      (b) => b.hits,
      (bout, k) => {
        cover!.promote(bout.worker);
        if (bout === last) {
          cover!.blast(bout.worker.at);
          return;
        }
        cover!.burst(bout.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, order.length - 1)));
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
          clashing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const f of fencers)
            drawWispBetween(
              ctx,
              f.at,
              ms,
              now,
              WISP_SIZE * FENCER,
              0.8,
              f.bout.starts,
              f.bout.hits,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
