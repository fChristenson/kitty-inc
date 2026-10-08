// the "Breaching Charge" event (explosion; a free floor): it covers its
// crit, whose click freezes the screen while a ring of lit charges flies out
// of the clicked floor's button and clamps round the building's locked
// floor; they go off in a chain round the ring, bang after bang, shake
// after shake; then a cluster of charges packed onto the lock all blow at
// once, and the main charge goes up in a huge blast and shake, blowing the
// floor open, unlocked for free, as the screen unfreezes. Then the crit's
// tier pays out
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
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "breachingCharge";
const RING = 6;
const RING_REACH: [number, number] = [260, 150];
const CORE = 3;
const CORE_REACH = 45;
const BOMB = 0.32;
const FUSE = 12;
const RING_BLAST = 170;
const CORE_BLAST = 150;
const MAIN_BLAST = 380;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceBreachingChargeEvent = registerWispEvent(
  KEY,
  "Breaching Charge",
  () => CONFIG.breachingChargeEvent.chance,
  (floor, context) => {
    const { setupMs, chainMs, coreMs, holdMs, mergeMs } =
      CONFIG.breachingChargeEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const blasts: Blast[] = [];
    const charges: { at: (ms: number) => Point; blows: number }[] = [];
    const place = (spot: Point, delay: number, blows: number) => {
      const at: Point = { x: 0, y: 0 };
      charges.push({
        blows,
        at: (ms: number): Point => {
          const u = easeOut(clamp01((ms - delay) / setupMs));
          at.x = lerp([button.x, spot.x], u);
          at.y = lerp([button.y, spot.y], u);
          return at;
        },
      });
    };
    const ringStarts = setupMs + RING * 20;
    for (let i = 0; i < RING; i++) {
      const a = (i / RING) * Math.PI * 2 - Math.PI / 2;
      const spot: Point = {
        x: lock.x + Math.cos(a) * RING_REACH[0],
        y: lock.y + Math.sin(a) * RING_REACH[1],
      };
      const blows = ringStarts + i * chainMs;
      place(spot, i * 20, blows);
      blasts.push({
        at: spot,
        ms: blows,
        size: RING_BLAST,
        shake: 0.6 + 0.08 * i,
      });
    }
    const coreBlows = ringStarts + RING * chainMs + coreMs * 0.3;
    for (let c = 0; c < CORE; c++) {
      const a = (c / CORE) * Math.PI * 2 + Math.PI / 4;
      const spot: Point = {
        x: lock.x + Math.cos(a) * CORE_REACH,
        y: lock.y + Math.sin(a) * CORE_REACH,
      };
      place(spot, c * 20, coreBlows);
      blasts.push({ at: spot, ms: coreBlows, size: CORE_BLAST, shake: 1.2 });
    }
    const endAt = coreBlows + coreMs;
    place(lock, 0, endAt);
    blasts.push({ at: lock, ms: endAt, size: MAIN_BLAST, shake: 1.6 });
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
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          booming.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const c of charges) {
            if (ms >= c.blows) continue;
            drawLitFuse(ctx, c.at(ms), ms / c.blows, FUSE, now);
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              0,
              c.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
