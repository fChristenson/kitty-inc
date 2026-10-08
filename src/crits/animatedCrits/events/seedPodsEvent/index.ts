// the "Seed Pods" event (explosion; a free floor): it covers its crit, whose
// click freezes the screen while a zigzag of bomb pods swells up from the
// clicked floor's button toward the next locked floor, every fuse fizzing
// and blinking; the lowest pod bursts in a big blast, flinging seed bombs in
// arcs: one lands on the next pod and sets it off, the rest pop in a
// cluster round it, and so the chain bursts up pod by pod, quicker and
// quicker, every blast its own bang and shake, until the top pod's seeds
// all slam into the lock at once in a cluster of blasts and it bursts open
// in a huge one: the floor unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
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
import { bezier } from "../../../../shared/curves";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "seedPods";
const PODS = 4;
// px each pod sits off the line to the lock, alternating sides, and the
// top pod's gap under the lock
const ZIG = 200;
const UNDER_LOCK = 160;
// seeds flung by each pod that pop round it, how far, and those the top
// pod throws into the lock
const CLUSTER = 4;
const CLUSTER_REACH: [number, number] = [120, 210];
const LOCK_SEEDS = 6;
const LOCK_RING = 70;
// px the seeds' arcs rise over their chords
const ARC = 140;
const POD = WISP_SIZE * 1.1;
const SEED = WISP_SIZE * 0.5;
const FUSE = 46;
const POD_BLAST = 300;
const SEED_BLAST = 130;
const LOCK_SEED_BLAST = 190;
const POD_SHAKE: [number, number] = [1.3, 1.9];
const SEED_SHAKE = 0.5;
const SOUND_GAP_MS = 60;

interface Seed {
  from: Point;
  bend: Point;
  to: Point;
  starts: number;
  lands: number;
  spot: Point;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  last: boolean;
}

export const forceSeedPodsEvent = registerWispEvent(
  KEY,
  "Seed Pods",
  () => CONFIG.seedPodsEvent.chance,
  (floor, context) => {
    const { growMs, fuseMs, seedMs, holdMs, mergeMs } = CONFIG.seedPodsEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const top: Point = { x: lock.x, y: lock.y + UNDER_LOCK };
    const pods: Point[] = Array.from({ length: PODS }, (_, k) => {
      const u = (k + 1) / PODS;
      const side = k === PODS - 1 ? 0 : k % 2 ? 1 : -1;
      return {
        x: lerp([button.x, top.x], u) + side * ZIG,
        y: lerp([button.y, top.y], u),
      };
    });
    const seeds: Seed[] = [];
    const blasts: Blast[] = [];
    const fling = (from: Point, to: Point, starts: number, flight: number) => {
      seeds.push({
        from,
        bend: {
          x: (from.x + to.x) / 2,
          y: Math.min(from.y, to.y) - ARC,
        },
        to,
        starts,
        lands: starts + flight,
        spot: { x: 0, y: 0 },
      });
    };
    // each pod blasts as the last one's seed lands on it
    const blastAt: number[] = [growMs + fuseMs];
    for (let k = 0; k < PODS; k++) {
      const t = k / Math.max(1, PODS - 1);
      const at = blastAt[k];
      blasts.push({
        at: pods[k],
        ms: at,
        size: POD_BLAST,
        shake: lerp(POD_SHAKE, t),
        last: false,
      });
      const flight = lerp(seedMs, t);
      if (k < PODS - 1) {
        fling(pods[k], pods[k + 1], at, flight);
        blastAt.push(at + flight);
        for (let c = 0; c < CLUSTER; c++) {
          const angle = Math.PI * 2 * ((c + Math.random() * 0.5) / CLUSTER);
          const reach = lerp(CLUSTER_REACH, Math.random());
          const to = {
            x: pods[k].x + Math.cos(angle) * reach,
            y: pods[k].y + Math.sin(angle) * reach,
          };
          const lands = at + flight * 0.75;
          fling(pods[k], to, at, flight * 0.75);
          blasts.push({
            at: to,
            ms: lands,
            size: SEED_BLAST,
            shake: SEED_SHAKE,
            last: false,
          });
        }
        continue;
      }
      // the top pod's seeds all slam into the lock together
      for (let c = 0; c <= LOCK_SEEDS; c++) {
        const angle = (Math.PI * 2 * c) / LOCK_SEEDS;
        const to =
          c === LOCK_SEEDS
            ? lock
            : {
                x: lock.x + Math.cos(angle) * LOCK_RING,
                y: lock.y + Math.sin(angle) * LOCK_RING,
              };
        fling(pods[k], to, at, flight);
        blasts.push({
          at: to,
          ms: at + flight,
          size: LOCK_SEED_BLAST,
          shake: 0,
          last: c === LOCK_SEEDS,
        });
      }
    }
    const endAt = Math.max(...seeds.map((s) => s.lands));
    const seedAts = seeds.map(
      (s) =>
        (ms: number): Point | null =>
          ms > s.lands
            ? null
            : bezier(
                s.from,
                s.bend,
                s.to,
                clamp01((ms - s.starts) / (s.lands - s.starts)),
                s.spot,
              ),
    );
    const podAts = pods.map((p) => () => p);
    let soundAt = -Infinity;

    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b, _, now) => {
        if (b.last) {
          cover!.blast(lock);
          return;
        }
        if (!cover!.isLive()) return;
        if (b.shake > 0) shakeScreen(b.shake);
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playExplosion();
        }
      },
    );
    const growing = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          growing.tick(ms, now);
          blasting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 900) return;
          for (let k = 0; k < PODS; k++) {
            if (ms >= blastAt[k]) continue;
            const grow = easeOut(
              clamp01((ms - (k * growMs) / (PODS + 1)) / (growMs * 0.5)),
            );
            if (grow <= 0) continue;
            const burn = clamp01((ms - growMs) / (blastAt[k] - growMs));
            drawLitFuse(ctx, pods[k], burn, FUSE * grow, now);
            drawWispHead(ctx, podAts[k], ms, now, POD * grow, burn);
          }
          for (let i = 0; i < seeds.length; i++)
            drawWispBetween(
              ctx,
              seedAts[i],
              ms,
              now,
              SEED,
              0.8,
              seeds[i].starts,
              seeds[i].lands,
            );
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
