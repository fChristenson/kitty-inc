// the "Drill Duel" event (drill; worker perma tiers): it covers its crit,
// whose click freezes the screen while two drill heads scream in from
// either side over a worker and slam into each other point to point; they
// grind head to head, shuddering, a fountain of sparks and chips spraying
// out between them, every shove a jolt, until one shatters in a burst and
// the winner turns and bores straight down into the worker, lighting it up
// a perma tier; a duel over every worker, quicker each time, the last
// ending in a huge blast and shake. Then the crit's tier pays out
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
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDrill,
  drawDrillHead,
  drawDrillSparks,
  planDrill,
  type Drill,
} from "../../../../shared/drill";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "drillDuel";
const MAX_WORKERS = 5;
const ABOVE = 110;
const WIDE = 260;
const HIGH = 70;
// how far apart the two tips sit while they grind
const GAP = 14;
const SHUDDER = 4;
const SHOVES = 3;
const SIZE = WISP_SIZE * 0.9;
const SHOVE_SHAKE = 0.4;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Duel {
  worker: RewardWorker;
  meet: Point;
  starts: number;
  meets: number;
  breaks: number;
  winner: number;
  shoves: number[];
  heads: ((ms: number) => Point)[];
  drill: Drill;
}

export const forceDrillDuelEvent = registerWispEvent(
  KEY,
  "Drill Duel",
  () => CONFIG.drillDuelEvent.chance,
  (floor, context) => {
    const { approachMs, grindsMs, boreMs, holdMs, mergeMs } =
      CONFIG.drillDuelEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock = 0;
    const duels: Duel[] = workers.map((worker, k) => {
      const meet: Point = { x: worker.at.x, y: worker.at.y - ABOVE };
      const starts = clock;
      const meets = starts + approachMs;
      const breaks =
        meets + lerp(grindsMs, k / Math.max(1, workers.length - 1));
      const shoves = Array.from(
        { length: SHOVES },
        (_, j) => meets + ((breaks - meets) * (j + 1)) / (SHOVES + 1),
      );
      const winner = Math.random() < 0.5 ? 0 : 1;
      const heads = [-1, 1].map((side) => {
        const from: Point = { x: meet.x + side * WIDE, y: meet.y - HIGH };
        const spot: Point = { x: 0, y: 0 };
        return (ms: number): Point => {
          if (ms < meets) {
            const u = easeIn(clamp01((ms - starts) / approachMs));
            spot.x = lerp([from.x, meet.x + side * GAP], u);
            spot.y = lerp([from.y, meet.y], u);
          } else {
            spot.x = meet.x + side * GAP + Math.sin(ms * 0.8 + side) * SHUDDER;
            spot.y = meet.y + Math.cos(ms * 0.9) * SHUDDER;
          }
          return spot;
        };
      });
      const drill = planDrill(meet, worker.at, {
        approachMs: 120,
        boreMs,
        pushes: 3,
        reach: 18,
        startMs: breaks,
      });
      clock = breaks - approachMs * 0.5;
      return {
        worker,
        meet,
        starts,
        meets,
        breaks,
        winner,
        shoves,
        heads,
        drill,
      };
    });
    const last = duels.reduce((a, b) =>
      b.drill.through > a.drill.through ? b : a,
    );
    const endAt = last.drill.through;
    const shoves = duels.flatMap((d) => d.shoves);

    const meeting = createBeats(
      duels,
      (d) => d.meets,
      (d) => {
        cover!.burst(d.meet, 0.5);
        if (cover!.isLive()) playExplosion();
      },
    );
    const shoving = createBeats(
      shoves,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(SHOVE_SHAKE);
      },
    );
    const breaking = createBeats(
      duels,
      (d) => d.breaks,
      (d) =>
        cover!.burst(
          { x: d.meet.x + (d.winner ? -1 : 1) * GAP, y: d.meet.y },
          0.7,
        ),
    );
    const boring = createBeats(
      duels.slice().sort((a, b) => a.drill.through - b.drill.through),
      (d) => d.drill.through,
      (d, k) => {
        cover!.promote(d.worker);
        if (d === last) {
          cover!.blast(d.worker.at);
          return;
        }
        cover!.burst(d.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, duels.length - 1)));
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
          meeting.tick(ms, now);
          shoving.tick(ms, now);
          breaking.tick(ms, now);
          boring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const d of duels) {
            if (ms < d.starts) continue;
            if (ms < d.breaks) {
              // the two heads, point to point, sparks spraying out between them
              for (let side = 0; side < 2; side++) {
                const at = d.heads[side];
                const tip = at(ms);
                const angle = side ? Math.PI : 0;
                drawDrillHead(
                  ctx,
                  tip,
                  angle,
                  SIZE,
                  ms * 0.06 * (side ? -1 : 1),
                  now,
                );
                drawWispBetween(
                  ctx,
                  at,
                  ms,
                  now,
                  SIZE * 0.5,
                  1,
                  d.starts,
                  d.breaks,
                );
              }
              if (ms >= d.meets) {
                drawDrillSparks(
                  ctx,
                  d.meet,
                  Math.PI / 2,
                  ms - d.meets,
                  1,
                  SIZE,
                  now,
                );
                drawDrillSparks(
                  ctx,
                  d.meet,
                  -Math.PI / 2,
                  ms - d.meets,
                  0.6,
                  SIZE,
                  now,
                );
              }
              continue;
            }
            drawDrill(ctx, d.drill, ms, now, SIZE);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
