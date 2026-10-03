// the "Cluster Bomb" event (explosion; worker perma tiers): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// lobs a big bomb wisp high over the screen, its fuse fizzing and blinking
// ever faster; at the top of its arc it bursts open in a fireball and a
// bang, scattering bomblets that arc down onto the workers in view, each
// fizzing on its way and going off on its worker in a fireball, a bang and
// a jolt that lights it up a perma tier; the last blows in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";
import { findRewardWorkers } from "../eventRewards";

const KEY = "clusterBomb";
const MAX_WORKERS = 6;
// the bomb bursts APEX of the way up the screen; bomblets arc LOFT px over
// their higher end
const APEX = 0.22;
const LOFT = 120;
const BOMB = 0.9;
const BOMBLET = 0.45;
const FUSE = 40;
const BOMBLET_FUSE = 20;
const BURST = 120;
const BLAST = 80;
const HIT_SHAKE: [number, number] = [0.8, 1.6];

export const forceClusterBombEvent = registerWispEvent(
  KEY,
  "Cluster Bomb",
  () => CONFIG.clusterBombEvent.chance,
  (floor, context, area) => {
    const { lobMs, scatterMs, staggerMs, holdMs, mergeMs } =
      CONFIG.clusterBombEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const apex: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * APEX,
    };
    const lobArc: Point = {
      x: (button.x + apex.x) / 2,
      y: apex.y - LOFT,
    };
    const burstAt = lobMs;
    // nearer workers are hit first
    const order = [...workers].sort(
      (a, b) =>
        Math.hypot(a.at.x - apex.x, a.at.y - apex.y) -
        Math.hypot(b.at.x - apex.x, b.at.y - apex.y),
    );
    const bomblets = order.map((worker, k) => {
      const lands = burstAt + scatterMs + k * staggerMs;
      const arc: Point = {
        x: (apex.x + worker.at.x) / 2 + (Math.random() * 2 - 1) * 80,
        y: Math.min(apex.y, worker.at.y) - LOFT,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        lands,
        seed: k * 13,
        at: (ms: number): Point | null => {
          if (ms < burstAt || ms >= lands) return null;
          return bezier(
            apex,
            arc,
            worker.at,
            easeIn((ms - burstAt) / (lands - burstAt)),
            at,
          );
        },
      };
    });
    const endAt = bomblets[bomblets.length - 1].lands;
    const bombAt: Point = { x: 0, y: 0 };
    const bomb = (ms: number): Point | null =>
      ms < 0 || ms >= burstAt
        ? null
        : bezier(button, lobArc, apex, easeOut(ms / lobMs), bombAt);

    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => {
        cover!.burst(apex, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.4);
      },
    );
    const hitting = createBeats(
      bomblets,
      (b) => b.lands,
      (b, k) => {
        cover!.promote(b.worker);
        if (k === bomblets.length - 1) {
          cover!.blast(b.worker.at);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, bomblets.length - 1)));
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
          bursting.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          if (ms < burstAt) {
            const p = bomb(ms);
            if (p) drawLitFuse(ctx, p, clamp01(ms / lobMs), FUSE, now);
          }
          drawWispBetween(
            ctx,
            bomb,
            ms,
            now,
            WISP_SIZE * BOMB,
            0.8,
            0,
            burstAt,
          );
          drawDetonation(ctx, apex, ms - burstAt, BURST, now, 1);
          for (const b of bomblets) {
            const p = b.at(ms);
            if (p)
              drawLitFuse(
                ctx,
                p,
                clamp01((ms - burstAt) / (b.lands - burstAt)),
                BOMBLET_FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMBLET,
              0.8,
              burstAt,
              b.lands,
            );
            drawDetonation(ctx, b.worker.at, ms - b.lands, BLAST, now, b.seed);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
