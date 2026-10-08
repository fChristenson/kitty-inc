// the "Bomb Crown" event (explosion; a free floor): it covers its crit,
// whose click freezes the screen while ten lit bomb wisps stream up out of
// the clicked floor's button and ring the building's locked floor like a
// crown, spinning round it faster and faster as their fuses race down; they
// go off one after another round the ring, each a big blast, a bang and a
// jolt, then the lock itself goes up in a colossal blast and the biggest
// shake, and the floor bursts open, unlocked for free, as the screen
// unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
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
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "bombCrown";
const BOMBS = 10;
const RX = 270;
const RY = 110;
const ARRIVE = 0.3;
const SPINS = 2;
const BLOWS: [number, number] = [0.65, 0.95];
const BLAST = 150;
const COLOSSAL = 460;
const CORE_DELAY_MS = 110;
const BOMB = 0.4;
const FUSE = 14;
const BANG_GAP_MS = 55;
const CHAIN_SHAKE: [number, number] = [0.5, 1.1];

export const forceBombCrownEvent = registerWispEvent(
  KEY,
  "Bomb Crown",
  () => CONFIG.bombCrownEvent.chance,
  (floor, context) => {
    const { spinMs, holdMs, mergeMs } = CONFIG.bombCrownEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const ringAt = (i: number, ms: number, into: Point): Point => {
      const u = clamp01(ms / spinMs);
      const a = (i / BOMBS) * Math.PI * 2 + Math.PI * 2 * SPINS * u * u;
      const ex = lock.x + Math.cos(a) * RX;
      const ey = lock.y + Math.sin(a) * RY;
      const e = easeOut(clamp01((ms - i * 25) / (spinMs * ARRIVE)));
      into.x = lerp([button.x, ex], e);
      into.y = lerp([button.y, ey], e);
      return into;
    };
    const bombs = Array.from({ length: BOMBS }, (_, i) => {
      const blows = spinMs * lerp(BLOWS, i / (BOMBS - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        blows,
        spot: ringAt(i, blows, { x: 0, y: 0 }),
        shake: lerp(CHAIN_SHAKE, i / (BOMBS - 1)),
        at: (ms: number): Point => ringAt(i, Math.max(0, ms), at),
      };
    });
    const coreAt = spinMs + CORE_DELAY_MS;
    let lastBang = -Infinity;

    const blowing = createBeats(
      bombs,
      (b) => b.blows,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.blows - lastBang >= BANG_GAP_MS) {
          lastBang = b.blows;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const crowning = createBeats(
      [coreAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2.6);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: coreAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          blowing.tick(ms, now);
          crowning.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > coreAt + 900) return;
          for (const b of bombs) {
            drawDetonation(ctx, b.spot, ms - b.blows, BLAST, now);
            if (ms >= b.blows) continue;
            drawLitFuse(ctx, b.at(ms), ms / b.blows, FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              0,
              b.blows,
            );
          }
          drawDetonation(ctx, lock, ms - coreAt, COLOSSAL, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
