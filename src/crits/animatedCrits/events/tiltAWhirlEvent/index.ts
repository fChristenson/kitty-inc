// the "Tilt-a-Whirl" event (wisp; worker perma tiers): it covers its crit,
// whose click freezes the screen while three wisps on a whirling hub spin
// out of the clicked floor's button like a fairground ride: the hub swings
// in a wide, tilted circle round a worker as the wisps whirl round the hub
// the other way, faster and faster, then the whole ride snaps in onto the
// worker with a bang and a jolt as it climbs a perma tier, and whirls off to
// the next; the last snap blows in a huge blast and shake. Then the crit's
// tier pays out
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "tiltAWhirl";
const MAX_WORKERS = 5;
const CARS = 3;
const HUB_R = 80;
const CAR_R = 36;
const HUB_TURNS = 2;
const CAR_TURNS = 5;
const SQUASH = 0.55;
const CAR = 0.38;
const SNAP_SHAKE: [number, number] = [0.6, 1.4];

interface Ride {
  worker: RewardWorker;
  from: Point;
  leaves: number;
  arrives: number;
  snaps: number;
  final: boolean;
}

export const forceTiltAWhirlEvent = registerWispEvent(
  KEY,
  "Tilt-a-Whirl",
  () => CONFIG.tiltAWhirlEvent.chance,
  (floor, context) => {
    const { spinsMs, hopMs, holdMs, mergeMs } = CONFIG.tiltAWhirlEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const rides: Ride[] = workers.map((worker, k) => {
      const leaves = clock;
      const arrives = leaves + hopMs;
      const snaps =
        arrives + lerp(spinsMs, k / Math.max(1, workers.length - 1));
      clock = snaps;
      const ride = {
        worker,
        from,
        leaves,
        arrives,
        snaps,
        final: k === workers.length - 1,
      };
      from = worker.at;
      return ride;
    });
    const endAt = rides[rides.length - 1].snaps;
    const rideAt = (ms: number): Ride => {
      let r = rides[0];
      for (const ride of rides) if (ms >= ride.leaves) r = ride;
      return r;
    };
    const cars = Array.from({ length: CARS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const t = Math.max(0, ms);
        const r = rideAt(t);
        const { x, y } = r.worker.at;
        let cx: number;
        let cy: number;
        let reach: number;
        if (t < r.arrives) {
          const e = easeOut(clamp01((t - r.leaves) / (r.arrives - r.leaves)));
          cx = lerp([r.from.x, x], e);
          cy = lerp([r.from.y, y], e);
          reach = e;
        } else {
          cx = x;
          cy = y;
          reach =
            1 - easeIn(clamp01((t - r.arrives) / (r.snaps - r.arrives))) ** 2;
        }
        const u = t / 1000;
        const hub = Math.PI * 2 * HUB_TURNS * u * 1.6;
        const car = -Math.PI * 2 * CAR_TURNS * u + (i / CARS) * Math.PI * 2;
        at.x = cx + (Math.cos(hub) * HUB_R + Math.cos(car) * CAR_R) * reach;
        at.y =
          cy + (Math.sin(hub) * HUB_R * SQUASH + Math.sin(car) * CAR_R) * reach;
        return at;
      };
    });

    const snapping = createBeats(
      rides,
      (r) => r.snaps,
      (r, k) => {
        cover!.promote(r.worker);
        if (r.final) {
          cover!.blast(r.worker.at);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(r.worker.at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SNAP_SHAKE, k / Math.max(1, rides.length - 1)));
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
        tick: (ms, now) => snapping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          for (const car of cars)
            drawWispBetween(ctx, car, ms, now, WISP_SIZE * CAR, 0.5, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
