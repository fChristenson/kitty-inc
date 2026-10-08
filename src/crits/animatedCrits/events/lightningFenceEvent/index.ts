// the "Lightning Fence" event (lightning; a free floor): it covers its crit,
// whose click freezes the screen while fence-post wisps shoot out of the
// clicked floor's button one after another and plant themselves in a
// zigzag line up the building to the locked floor, each with a thunk; then
// the current switches on: a bolt cracks from post to post racing up the
// fence, every jump a blinding flash, a crack and a jolt, ever faster, and
// the last bolt leaps into the lock in a huge blast and shake; the floor
// bursts open, unlocked for free, as the screen unfreezes. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "lightningFence";
const POSTS = 7;
const ZIGZAG = 110;
const POST = 0.35;
const GLOW_MS = 300;
const JUMP_SHAKE: [number, number] = [0.4, 1.2];

export const forceLightningFenceEvent = registerWispEvent(
  KEY,
  "Lightning Fence",
  () => CONFIG.lightningFenceEvent.chance,
  (floor, context) => {
    const { plantMs, jumpsMs, holdMs, mergeMs } = CONFIG.lightningFenceEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const posts = Array.from({ length: POSTS }, (_, k) => {
      const u = (k + 1) / (POSTS + 1);
      const spot: Point = {
        x: lerp([button.x, lock.x], u) + (k % 2 === 0 ? -ZIGZAG : ZIGZAG),
        y: lerp([button.y, lock.y], u),
      };
      const plants = (plantMs * (k + 1)) / POSTS;
      const at: Point = { x: 0, y: 0 };
      return {
        spot,
        plants,
        at: (ms: number): Point => {
          const v = easeOut(clamp01(ms / plants));
          at.x = lerp([button.x, spot.x], v);
          at.y = lerp([button.y, spot.y], v);
          return at;
        },
      };
    });
    const chain = [button, ...posts.map((p) => p.spot), lock];
    let clock: number = plantMs + 120;
    const jumps = chain.slice(1).map((to, k) => {
      clock += lerp(jumpsMs, k / (chain.length - 2));
      return {
        to,
        at: clock,
        bolt: createBolt(chain[k], to, 1),
        final: to === lock,
      };
    });
    const endAt = clock;

    const planting = createBeats(
      posts,
      (p) => p.plants,
      (p) => {
        cover!.burst(p.spot, 0.15);
        if (cover!.isLive()) playBloop();
      },
    );
    const jumping = createBeats(
      jumps,
      (j) => j.at,
      (j, k) => {
        if (j.final) {
          cover!.blast(lock);
          return;
        }
        cover!.burst(j.to, 0.3);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(JUMP_SHAKE, k / (jumps.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          planting.tick(ms, now);
          jumping.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + GLOW_MS) return;
          for (const j of jumps) {
            if (ms < j.at) break;
            // each live span stays lit till the end, the newest brightest
            const fresh = 1 - Math.min(1, (ms - j.at) / GLOW_MS);
            const fade = ms > endAt ? 1 - (ms - endAt) / GLOW_MS : 1;
            drawBolt(
              ctx,
              j.bolt,
              (0.4 + 0.6 * fresh) * fade,
              j.final ? 1.8 : 0.9,
            );
            if (fresh > 0) drawStrike(ctx, j.to, fresh, 0.7, now);
          }
          if (ms > endAt) return;
          for (const p of posts)
            drawWispBetween(
              ctx,
              p.at,
              ms,
              now,
              WISP_SIZE * POST,
              0.6,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
