// the "Ring of Fire" event (explosion; worker perma tiers): it covers its
// crit, whose click freezes the screen while a ring of fizzing bomb wisps
// circles every worker; round the first ring they go off one after another,
// each a big blast with its own bang and shake, and as the last one blows
// the worker in the middle lights up a perma tier in a bigger blast, which
// sets the next ring going, quicker each time; the last ring ends in one
// colossal blast with the hardest shake of all. Then the crit's tier pays
// out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "ringOfFire";
const MAX_WORKERS = 4;
const RING = 5;
const RADIUS = 70;
const BOMB = 0.3;
const FUSE = 34;
const RING_BLAST = 190;
const CORE_BLAST = 300;
const COLOSSAL = 680;
const BANG_GAP_MS = 50;
const BLAST_SHAKE: [number, number] = [0.5, 1.1];
const CORE_SHAKE = 1.3;
const FINAL_SHAKE = 2.4;

interface Bomb {
  at: Point;
  // fizzing from when its ring is lit
  lit: number;
  blows: number;
}

interface Ring {
  worker: RewardWorker;
  bombs: Bomb[];
  core: number;
}

export const forceRingOfFireEvent = registerWispEvent(
  KEY,
  "Ring of Fire",
  () => CONFIG.ringOfFireEvent.chance,
  (floor, context) => {
    const { fuseMs, popsMs, coreGapMs, holdMs, mergeMs } =
      CONFIG.ringOfFireEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock: number = fuseMs;
    let lit = 0;
    const rings: Ring[] = workers.map((worker, k) => {
      const gap = lerp(popsMs, k / Math.max(1, workers.length - 1));
      const turn = Math.random() * Math.PI * 2;
      const bombs = Array.from({ length: RING }, (_, i) => {
        const a = turn + (i / RING) * Math.PI * 2;
        const blows = clock + i * gap;
        return {
          at: {
            x: worker.at.x + Math.cos(a) * RADIUS,
            y: worker.at.y + Math.sin(a) * RADIUS,
          },
          lit,
          blows,
        };
      });
      const core = clock + (RING - 1) * gap + coreGapMs;
      lit = clock;
      clock = core;
      return { worker, bombs, core };
    });
    const last = rings[rings.length - 1];
    const endAt = last.core + DETONATION_MS;
    const bombs = rings.flatMap((r) => r.bombs);
    const bombSpots = bombs.map((b) => () => b.at);
    const blasts = [
      ...bombs.map((b) => ({ at: b.at, ms: b.blows, size: RING_BLAST })),
      ...rings.map((r) => ({
        at: r.worker.at,
        ms: r.core,
        size: r === last ? COLOSSAL : CORE_BLAST,
      })),
    ];

    let bang = -Infinity;
    const popping = createBeats(
      bombs,
      (b) => b.blows,
      (b) => {
        if (!cover!.isLive()) return;
        if (b.blows - bang >= BANG_GAP_MS) {
          bang = b.blows;
          playExplosion();
        }
        shakeScreen(lerp(BLAST_SHAKE, b.blows / last.core));
      },
    );
    const igniting = createBeats(
      rings,
      (r) => r.core,
      (r) => {
        cover!.promote(r.worker);
        if (r === last) {
          cover!.blast(r.worker.at);
          if (!cover!.isLive()) return;
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          return;
        }
        cover!.burst(r.worker.at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CORE_SHAKE);
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
          popping.tick(ms, now);
          igniting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (let i = 0; i < bombs.length; i++) {
            const b = bombs[i];
            if (ms >= b.blows || ms < b.lit) continue;
            const burn = (ms - b.lit) / (b.blows - b.lit);
            drawLitFuse(ctx, b.at, burn, FUSE, now);
            drawWispHead(
              ctx,
              bombSpots[i],
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6 + 0.4 * burn,
            );
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
