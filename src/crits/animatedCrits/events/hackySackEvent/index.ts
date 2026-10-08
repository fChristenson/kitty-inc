// the "Hacky Sack" event (bounce; worker perma tiers): it covers its crit,
// whose click freezes the screen while a ring of player wisps gathers round
// a worker and kicks a ball wisp back and forth across the circle in
// looping arcs, every kick a splash and a pop, quicker and quicker; the
// last player smashes it straight down onto the worker, who lights up a
// perma tier with a jolt, then the circle moves on to the next worker, the
// last smash landing in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawBounceSplash,
  hops,
  type Bounce,
  type BouncePath,
} from "../../../../shared/bounce";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "hackySack";
const MAX_WORKERS = 3;
const PLAYERS = 5;
// each kick crosses the ring, skipping a player, so the arcs cross over
const SKIP = 2;
const KICKS = 6;
const RING_X = 120;
const RING_Y = 70;
const LIFT: [number, number] = [110, 70];
const SPIKE_MS = 110;
const MOVE_MS = 150;
const BALL = 0.32;
const PLAYER = 0.3;
const SPLASH = 60;
const KICK_SHAKE = 0.2;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Circle {
  worker: RewardWorker;
  ring: Point[];
  path: BouncePath;
  spike: BouncePath;
  appears: number;
  lands: number;
}

export const forceHackySackEvent = registerWispEvent(
  KEY,
  "Hacky Sack",
  () => CONFIG.hackySackEvent.chance,
  (floor, context) => {
    const { kicksMs, holdMs, mergeMs } = CONFIG.hackySackEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const circles: Circle[] = workers.map((worker, k) => {
      const { x, y } = worker.at;
      const turn = Math.random() * Math.PI * 2;
      const ring = Array.from({ length: PLAYERS }, (_, i) => {
        const a = turn + (i / PLAYERS) * Math.PI * 2;
        return { x: x + Math.cos(a) * RING_X, y: y + Math.sin(a) * RING_Y };
      });
      const order = [from];
      for (let n = 0; n < KICKS; n++) order.push(ring[(n * SKIP) % PLAYERS]);
      const legMs = lerp(kicksMs, k / Math.max(1, workers.length - 1));
      const appears = clock;
      const path = hops(
        order,
        [legMs * 1.4, legMs * 0.8],
        LIFT,
        clock + MOVE_MS,
      );
      const kicker = order[order.length - 1];
      const spike = hops(
        [kicker, worker.at],
        [SPIKE_MS, SPIKE_MS],
        [15, 15],
        path.endMs,
      );
      clock = spike.endMs;
      from = worker.at;
      return { worker, ring, path, spike, appears, lands: spike.endMs };
    });
    const last = circles[circles.length - 1];
    const endAt = last.lands;
    const kicks: Bounce[] = circles.flatMap((c) => c.path.bounces);
    const players = circles.map((c) => c.ring.map((p) => () => p));
    const ballAt = (ms: number): Point => {
      for (const c of circles) {
        if (ms < c.path.endMs) return c.path.at(ms);
        if (ms < c.spike.endMs) return c.spike.at(ms);
      }
      return last.spike.at(ms);
    };

    const kicking = createBeats(
      kicks,
      (b) => b.ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(KICK_SHAKE);
      },
    );
    const spiking = createBeats(
      circles,
      (c) => c.lands,
      (c, k) => {
        cover!.promote(c.worker);
        if (c === last) {
          cover!.blast(c.worker.at);
          return;
        }
        cover!.burst(c.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, circles.length - 1)));
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
          kicking.tick(ms, now);
          spiking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const b of kicks)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          for (let k = 0; k < circles.length; k++) {
            const c = circles[k];
            if (ms < c.appears || ms > c.lands + 150) continue;
            const grow = clamp01((ms - c.appears) / MOVE_MS);
            const fade = 1 - clamp01((ms - c.lands) / 150);
            for (const p of players[k])
              drawWispHead(
                ctx,
                p,
                ms,
                now,
                WISP_SIZE * PLAYER * grow * fade,
                0.5,
              );
          }
          drawWispBetween(ctx, ballAt, ms, now, WISP_SIZE * BALL, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
