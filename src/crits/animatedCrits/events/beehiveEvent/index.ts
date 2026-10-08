// the "Beehive" event (wisp; perma tiers for workers): it covers its crit,
// whose click freezes the screen while a swarm of small wisps boils out of
// the clicked floor's button like angry bees and swoops onto one worker in
// view after another, ever faster; at each it whirls round the worker's head
// in a tight buzzing ball, then swarms it in a flash, a bloop and a jolt that
// lights it up a perma tier; after the last, the whole swarm bursts outward
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeOutCubic,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";
import { WORKER_HEIGHT } from "../../../../floors/worker";

const KEY = "beehive";
const BEES = 7;
const BEE = 0.5;
const MAX_WORKERS = 5;
// the swarm's loose spread in flight, and how tight it whirls on a head
const LOOSE = 95;
const TIGHT = 42;
// each bee jitters JITTER px off its orbit
const JITTER = 16;
const STING_SHAKE: [number, number] = [0.7, 1.5];
const STING_BURST: [number, number] = [0.5, 0.85];
const BURST_OUT = 420;

export const forceBeehiveEvent = registerWispEvent(
  KEY,
  "Beehive",
  () => CONFIG.beehiveEvent.chance,
  (floor, context) => {
    const { flightsMs, buzzesMs, burstMs, holdMs, mergeMs } =
      CONFIG.beehiveEvent;
    const workers = findRewardWorkers(floor, context)
      .sort((a, b) => a.at.x - b.at.x)
      .slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    if (Math.random() < 0.5) workers.reverse();
    const button = getButtonCenter(context.isGroundFloor);
    const heads = workers.map((w) => ({
      x: w.at.x,
      y: w.at.y - WORKER_HEIGHT * 0.3,
    }));
    // flying to head k from legs[k], whirling on it from buzz[k] to stings[k]
    const legs: number[] = [];
    const buzz: number[] = [];
    const stings: number[] = [];
    let clock = 0;
    workers.forEach((_, k) => {
      const t = k / Math.max(1, workers.length - 1);
      legs.push(clock);
      clock += lerp(flightsMs, t);
      buzz.push(clock);
      clock += lerp(buzzesMs, t);
      stings.push(clock);
    });
    const burstAt = clock;
    const endAt = burstAt + burstMs;

    // the swarm's middle (into centre) and how tight it's packed, ms in
    const swarm = (ms: number, centre: Point): number => {
      let k = 0;
      while (k + 1 < workers.length && ms >= legs[k + 1]) k++;
      const from = k === 0 ? button : heads[k - 1];
      const to = heads[k];
      const u = smoothstep(clamp01((ms - legs[k]) / (buzz[k] - legs[k])));
      // a swooping arc up and over to the next head
      centre.x = from.x + (to.x - from.x) * u;
      centre.y = from.y + (to.y - from.y) * u - Math.sin(Math.PI * u) * 140;
      if (ms < buzz[k]) return LOOSE;
      return lerp(
        [LOOSE, TIGHT],
        clamp01(((ms - buzz[k]) / (stings[k] - buzz[k])) * 2),
      );
    };
    const bees = Array.from({ length: BEES }, (_, b) => {
      const phase = (b / BEES) * Math.PI * 2;
      const speed = (0.012 + Math.random() * 0.008) * (b % 2 ? 1 : -1);
      const tilt = 0.45 + Math.random() * 0.4;
      const wobble = Math.random() * 10;
      const outAngle = phase + (Math.random() - 0.5) * 0.6;
      const into: Point = { x: 0, y: 0 };
      const centre: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= endAt) return null;
        if (ms >= burstAt) {
          const out =
            easeOutCubic(clamp01((ms - burstAt) / burstMs)) * BURST_OUT;
          const last = heads[heads.length - 1];
          into.x = last.x + Math.cos(outAngle) * (TIGHT + out);
          into.y = last.y + Math.sin(outAngle) * (TIGHT + out);
          return into;
        }
        const r = swarm(ms, centre) * Math.min(1, ms / 120);
        const a = phase + ms * speed;
        into.x =
          centre.x + Math.cos(a) * r + Math.sin(ms * 0.05 + wobble) * JITTER;
        into.y =
          centre.y +
          Math.sin(a) * r * tilt +
          Math.cos(ms * 0.063 + wobble) * JITTER;
        return into;
      };
    });

    let lastBuzz = -Infinity;
    const stinging = createBeats(
      stings,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, workers.length - 1);
        cover!.promote(workers[k]);
        cover!.burst(heads[k], lerp(STING_BURST, t));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STING_SHAKE, t));
      },
    );
    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => cover!.blast(heads[heads.length - 1]),
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
          stinging.tick(ms, now);
          bursting.tick(ms, now);
          // the swarm's low buzzing rumble
          if (ms < burstAt && now - lastBuzz >= 90 && cover?.isLive()) {
            lastBuzz = now;
            shakeScreen(0.25);
          }
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / burstAt);
          for (const at of bees)
            drawWispBetween(ctx, at, ms, now, WISP_SIZE * BEE, heat, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
