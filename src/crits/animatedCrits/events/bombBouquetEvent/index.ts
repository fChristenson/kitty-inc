// the "Bomb Bouquet" event (explosion; worker perma tiers): it covers its
// crit, whose click freezes the screen while lit bombs spring out of the
// clicked floor's button in stems, one stem reaching toward each worker;
// the stem goes off in a chain from the button outward, blast after blast
// racing up it, and at its tip a cluster of blasts blooms right on the
// worker, who climbs a perma tier; stem after stem blooms, every blast with
// its own bang and shake, the last bouquet bursting in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "bombBouquet";
const MAX_WORKERS = 5;
// STEM bombs up each stem, then PETALS blasts round the bloom
const STEM = 3;
const PETALS = 4;
const PETAL_REACH = 55;
const SETUP_MS = 220;
const BOMB = 0.3;
const FUSE = 12;
const STEM_BLAST = 140;
const PETAL_BLAST = 110;
const BLOOM_BLAST = 200;
const FINALE_BLAST = 320;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceBombBouquetEvent = registerWispEvent(
  KEY,
  "Bomb Bouquet",
  () => CONFIG.bombBouquetEvent.chance,
  (floor, context) => {
    const { linksMs, stemsMs, holdMs, mergeMs } = CONFIG.bombBouquetEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const blasts: Blast[] = [];
    const bombs: { at: (ms: number) => Point; shows: number; blows: number }[] =
      [];
    let clock: number = SETUP_MS;
    const blooms = workers.map((worker, k) => {
      const lights = clock;
      // the stem bows a little to one side on its way to the worker
      const bow = (k % 2 === 0 ? 1 : -1) * 40;
      for (let i = 0; i < STEM; i++) {
        const u = (i + 1) / (STEM + 1);
        const spot: Point = {
          x: lerp([button.x, worker.at.x], u) + Math.sin(u * Math.PI) * bow,
          y: lerp([button.y, worker.at.y], u),
        };
        const shows = lights - SETUP_MS;
        const blows = lights + i * linksMs;
        const at: Point = { x: 0, y: 0 };
        bombs.push({
          shows,
          blows,
          at: (ms: number): Point => {
            const v = easeOut(clamp01((ms - shows) / SETUP_MS));
            at.x = lerp([button.x, spot.x], v);
            at.y = lerp([button.y, spot.y], v);
            return at;
          },
        });
        blasts.push({
          at: spot,
          ms: blows,
          size: STEM_BLAST,
          shake: 0.5 + 0.15 * i,
        });
      }
      const blooms = lights + STEM * linksMs;
      blasts.push({ at: worker.at, ms: blooms, size: BLOOM_BLAST, shake: 1.1 });
      for (let p = 0; p < PETALS; p++) {
        const a = (p / PETALS) * Math.PI * 2 + k;
        blasts.push({
          at: {
            x: worker.at.x + Math.cos(a) * PETAL_REACH,
            y: worker.at.y + Math.sin(a) * PETAL_REACH,
          },
          ms: blooms + 60 + p * 25,
          size: PETAL_BLAST,
          shake: 0.8,
        });
      }
      clock += lerp(stemsMs, k / Math.max(1, workers.length - 1));
      return { worker, blooms };
    });
    const last = blooms[blooms.length - 1];
    const endAt = last.blooms + 60 + PETALS * 25;
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
        shakeScreen(b.shake);
      },
    );
    const blooming = createBeats(
      blooms,
      (b) => b.blooms,
      (b) => cover!.promote(b.worker),
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(last.worker.at),
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
          blooming.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          drawDetonation(ctx, last.worker.at, ms - endAt, FINALE_BLAST, now);
          for (const b of bombs) {
            if (ms < b.shows || ms >= b.blows) continue;
            drawLitFuse(
              ctx,
              b.at(ms),
              (ms - b.shows) / (b.blows - b.shows),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              b.shows,
              b.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
