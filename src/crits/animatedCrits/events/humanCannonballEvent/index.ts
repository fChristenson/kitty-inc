// the "Human Cannonball" event (wisp; a free floor): it covers its crit,
// whose click freezes the screen while a wisp drops into the clicked
// floor's button as into a cannon; a fuse fizzes down to it, then BOOM: the
// wisp is fired up the screen in a straight streak through a column of
// glittering rings of light, each popping with a flash and a jolt as it
// shoots through, and smashes into the building's locked floor in a huge
// blast and shake, and the floor bursts open, unlocked for free, as the
// screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars, findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "humanCannonball";
const LOAD_MS = 220;
const LOAD_FROM = 260;
const FUSE = 90;
const FUSE_SIZE = 30;
const SPARK = 0.2;
const TREMBLE = 3;
// RINGS (or one per bar passed, up to MAX_RINGS) of SPARKLES sparkles,
// RING_X by RING_Y px round, fading in over RING_IN_MS and popping over POP_MS
const RINGS = 3;
const MAX_RINGS = 6;
const SPARKLES = 14;
const RING_X = 64;
const RING_Y = 20;
const SPARKLE_R = 7;
const RING_IN_MS = 300;
const POP_MS = 260;
const POP_GROW = 0.8;
const BOOM = 200;
const BALL = 0.5;
const POP_SHAKE: [number, number] = [0.5, 1.1];
const BOOM_SHAKE = 1.3;

export const forceHumanCannonballEvent = registerWispEvent(
  KEY,
  "Human Cannonball",
  () => CONFIG.humanCannonballEvent.chance,
  (floor, context) => {
    const { fuseMs, flightMs, holdMs, mergeMs } = CONFIG.humanCannonballEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const fireAt = LOAD_MS + fuseMs;
    const hitAt = fireAt + flightMs;
    const dx = lock.x - button.x;
    const dy = lock.y - button.y;
    const length = Math.hypot(dx, dy) || 1;
    const ax = dx / length;
    const ay = dy / length;
    const passed = findRewardBars(floor, context).filter(
      (b) =>
        b.center.y < Math.max(button.y, lock.y) &&
        b.center.y > Math.min(button.y, lock.y),
    ).length;
    const count = Math.min(MAX_RINGS, Math.max(RINGS, passed));
    const rings = Array.from({ length: count }, (_, k) => {
      const u = (k + 1) / (count + 1);
      return {
        at: { x: button.x + dx * u, y: button.y + dy * u } as Point,
        pops: fireAt + u * flightMs,
      };
    });

    const top: Point = { x: button.x, y: button.y - LOAD_FROM };
    const ball: Point = { x: 0, y: 0 };
    const cannonball = (ms: number): Point => {
      const t = Math.max(0, ms);
      if (t < LOAD_MS) {
        ball.x = button.x;
        ball.y = lerp([top.y, button.y], easeIn(t / LOAD_MS));
      } else if (t < fireAt) {
        const burn = (t - LOAD_MS) / fuseMs;
        ball.x = button.x + Math.sin(t * 0.09) * TREMBLE * burn;
        ball.y = button.y + Math.cos(t * 0.11) * TREMBLE * burn;
      } else {
        const u = clamp01((t - fireAt) / flightMs);
        ball.x = button.x + dx * u;
        ball.y = button.y + dy * u;
      }
      return ball;
    };
    const fuseStart: Point = { x: button.x + FUSE, y: button.y + FUSE * 0.25 };
    const spark: Point = { x: 0, y: 0 };
    const fuse = (ms: number): Point => {
      const u = clamp01((ms - LOAD_MS) / fuseMs);
      spark.x = lerp([fuseStart.x, button.x], u);
      spark.y = lerp([fuseStart.y, button.y], u);
      return spark;
    };

    const booming = createBeats(
      [fireAt],
      (ms) => ms,
      () => {
        cover!.burst(button, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BOOM_SHAKE);
      },
    );
    const popping = createBeats(
      rings,
      (r) => r.pops,
      (r, k) => {
        cover!.burst(r.at, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(POP_SHAKE, k / Math.max(1, count - 1)));
      },
    );
    const smashing = createBeats(
      [hitAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: hitAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          booming.tick(ms, now);
          popping.tick(ms, now);
          smashing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > hitAt + POP_MS) return;
          drawDetonation(ctx, button, ms - fireAt, BOOM, now);
          for (let k = 0; k < count; k++) {
            const r = rings[k];
            const since = ms - r.pops;
            if (since >= POP_MS) continue;
            const grow = since > 0 ? 1 + POP_GROW * (since / POP_MS) : 1;
            const alpha =
              since > 0
                ? 1 - since / POP_MS
                : clamp01((ms - LOAD_MS) / RING_IN_MS);
            if (alpha <= 0) continue;
            for (let i = 0; i < SPARKLES; i++) {
              const a = (Math.PI * 2 * i) / SPARKLES + now / 600;
              const across = Math.cos(a) * RING_X * grow;
              const along = Math.sin(a) * RING_Y * grow;
              drawGlitterLight(
                ctx,
                r.at.x - ay * across + ax * along,
                r.at.y + ax * across + ay * along,
                SPARKLE_R,
                k * SPARKLES + i,
                alpha,
                now,
              );
            }
          }
          if (ms >= LOAD_MS && ms < fireAt) {
            const burn = (ms - LOAD_MS) / fuseMs;
            drawLitFuse(ctx, fuse(ms), burn, FUSE_SIZE, now);
          }
          drawWispBetween(
            ctx,
            fuse,
            ms,
            now,
            WISP_SIZE * SPARK,
            1,
            LOAD_MS,
            fireAt,
          );
          drawWispBetween(
            ctx,
            cannonball,
            ms,
            now,
            WISP_SIZE * BALL,
            ms < fireAt ? clamp01((ms - LOAD_MS) / fuseMs) : 1,
            0,
            hitAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
