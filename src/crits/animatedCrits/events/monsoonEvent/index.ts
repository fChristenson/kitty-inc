// the "Monsoon" event (ripple; worker perma tiers): it covers its crit, whose
// click freezes the screen while drops of light fall a short way onto the
// workers, each landing in a splash and a flat ring rippling out at its
// feet, quickening from a drizzle to a downpour; a worker's second drop
// strikes it up a perma tier; then one huge drop falls from high into their
// midst with the biggest blast and a double ring. Then the crit's tier pays
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import {
  drawDrop,
  drawRipple,
  drawSplash,
  rainTimes,
} from "../../../../shared/animationStyles/ripple";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  playBarExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { findRewardWorkers } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "monsoon";
const MAX_WORKERS = 8;
// a drop falls FALL px over FALL_MS onto a worker
const FALL = 260;
const FALL_MS = 200;
const DROP = 40;
const SPLASH = 22;
const SPLASH_TIERED = 28;
const RIPPLE = 170;
const RIPPLE_TIERED = 230;
const RIPPLE_W = 14;
const DROP_SHAKE = 0.3;
const TIER_SHAKE: [number, number] = [0.7, 1.3];
const TIER_BLAST = 70;
// the huge drop from BIG_FALL of the screen's height, into the workers' midst
const BIG_FALL = 0.55;
const BIG_DROP = 90;
const BIG_RIPPLE = 0.45;
const BIG_RIPPLE_W = 30;
const BIG_RIPPLE_MS = 700;
const BIG_SPLASH = 50;
const BIG_SPLASH_N = 12;
const BIG_SPLASH_MS = 500;
const BIG_SHAKE = 2.8;

export const forceMonsoonEvent = registerWispEvent(
  KEY,
  "Monsoon",
  () => CONFIG.monsoonEvent.chance,
  (floor, context, area) => {
    const { firstMs, gapsMs, bigGapMs, bigFallMs, holdMs, mergeMs } =
      CONFIG.monsoonEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const n = workers.length;
    // every worker twice: in turn, then back the other way
    const drops = rainTimes(n * 2, firstMs, gapsMs).map((at, k) => ({
      worker: workers[k < n ? k : 2 * n - 1 - k],
      at,
      tiers: k >= n,
    }));
    const mid: Point = { x: 0, y: 0 };
    for (const w of workers) {
      mid.x += w.at.x / n;
      mid.y += w.at.y / n;
    }
    const bigAt = drops[drops.length - 1].at + bigGapMs;
    const height = area.bottom - area.top;
    const width = area.right - area.left;
    const endMs = bigAt + BIG_RIPPLE_MS;

    const raining = createBeats(
      drops,
      (d) => d.at,
      (d, k) => {
        if (d.tiers) {
          cover!.promote(d.worker);
          if (!cover!.isLive()) return;
          playExplosion();
          shakeScreen(lerp(TIER_SHAKE, (k - n) / Math.max(1, n - 1)));
          return;
        }
        if (!cover!.isLive()) return;
        playBarExplosion(lerp([0.7, 1], k / Math.max(1, n - 1)));
        shakeScreen(DROP_SHAKE);
      },
    );
    const landing = createBeats(
      [bigAt],
      (ms) => ms,
      () => {
        cover!.blast(mid);
        if (cover!.isLive()) shakeScreen(BIG_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: bigAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          raining.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          for (const d of drops)
            drawRipple(
              ctx,
              d.worker.at,
              ms - d.at,
              d.tiers ? RIPPLE_TIERED : RIPPLE,
              RIPPLE_W,
            );
          drawRipple(
            ctx,
            mid,
            ms - bigAt,
            width * BIG_RIPPLE,
            BIG_RIPPLE_W,
            2,
            BIG_RIPPLE_MS,
          );
          beginLightBatch(ctx);
          for (const d of drops) {
            drawDrop(ctx, d.worker.at, d.at - ms, FALL_MS, FALL, DROP);
            drawSplash(
              ctx,
              d.worker.at,
              ms - d.at,
              d.tiers ? SPLASH_TIERED : SPLASH,
            );
          }
          drawDrop(
            ctx,
            mid,
            bigAt - ms,
            bigFallMs,
            height * BIG_FALL,
            BIG_DROP,
          );
          drawSplash(
            ctx,
            mid,
            ms - bigAt,
            BIG_SPLASH,
            BIG_SPLASH_N,
            BIG_SPLASH_MS,
          );
          endLightBatch(ctx);
          ctx.globalCompositeOperation = previous;
          for (const d of drops)
            if (d.tiers && ms - d.at < DETONATION_MS)
              drawDetonation(ctx, d.worker.at, ms - d.at, TIER_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
