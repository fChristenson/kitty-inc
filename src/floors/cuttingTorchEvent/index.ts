// the "Cutting Torch" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while a wisp flies out of the clicked floor's
// button up to the building's locked floor and fires a short blazing beam
// into it like a cutting torch, sparks spraying, carving a glowing seam
// round the lock, every corner a crack and a jolt, cutting ever faster; as
// the seam closes the cut-out bursts in a huge blast and shake and the floor
// bursts open, unlocked for free, as the screen unfreezes. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { measure, pointAlong } from "../cashFlow";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "cuttingTorch";
// the seam: a box HALF_W by HALF_H round the lock; the torch hangs STANDOFF
// px off the seam
const HALF_W = 130;
const HALF_H = 80;
const STANDOFF = 55;
const SEAM = 7;
const FLAME = 12;
const FLARE = 30;
const TORCH = 0.5;
const CORNER_SHAKE: [number, number] = [0.5, 1.2];

export const forceCuttingTorchEvent = registerWispEvent(
  KEY,
  "Cutting Torch",
  () => CONFIG.cuttingTorchEvent.chance,
  (floor, context) => {
    const { flyMs, cutMs, holdMs, mergeMs } = CONFIG.cuttingTorchEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const seam: Point[] = [
      { x: lock.x - HALF_W, y: lock.y - HALF_H },
      { x: lock.x + HALF_W, y: lock.y - HALF_H },
      { x: lock.x + HALF_W, y: lock.y + HALF_H },
      { x: lock.x - HALF_W, y: lock.y + HALF_H },
      { x: lock.x - HALF_W, y: lock.y - HALF_H },
    ];
    const along = measure(seam);
    const length = along[along.length - 1];
    // the cut quickens: share of the seam done at u through it
    const cutShare = (u: number) => easeIn(u) * 0.6 + u * 0.4;
    const shareTime = (share: number) => {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (cutShare(mid) < share) lo = mid;
        else hi = mid;
      }
      return flyMs + hi * cutMs;
    };
    const corners = seam.slice(1).map((at, k) => ({
      at,
      ms: shareTime(along[k + 1] / length),
    }));
    const endAt = flyMs + cutMs;
    const contact: Point = { x: 0, y: 0 };
    const contactAt = (ms: number) =>
      pointAlong(seam, along, cutShare(clamp01((ms - flyMs) / cutMs)), contact);
    const torchAt: Point = { x: 0, y: 0 };
    const torch = (ms: number): Point => {
      if (ms < flyMs) {
        const u = easeOut(ms / flyMs);
        torchAt.x = lerp([button.x, seam[0].x - STANDOFF], u);
        torchAt.y = lerp([button.y, seam[0].y - STANDOFF], u);
        return torchAt;
      }
      contactAt(ms);
      const dx = contact.x - lock.x;
      const dy = contact.y - lock.y;
      const d = Math.hypot(dx, dy) || 1;
      torchAt.x = contact.x + (dx / d) * STANDOFF;
      torchAt.y = contact.y + (dy / d) * STANDOFF;
      return torchAt;
    };
    const cut: Point = { x: 0, y: 0 };

    const cornering = createBeats(
      corners.slice(0, -1),
      (c) => c.ms,
      (c, k) => {
        cover!.burst(c.at, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CORNER_SHAKE, k / 2));
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
          cornering.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          if (ms > flyMs) {
            const done = cutShare(clamp01((ms - flyMs) / cutMs)) * length;
            for (let i = 1; i < seam.length; i++) {
              if (along[i - 1] >= done) break;
              const to =
                along[i] <= done
                  ? seam[i]
                  : pointAlong(seam, along, done / length, cut);
              drawBeam(ctx, seam[i - 1], to, SEAM, 0.75);
            }
            const t = torch(ms);
            contactAt(ms);
            drawBeam(ctx, t, contact, FLAME, 1);
            drawBeamFlare(ctx, contact, FLARE, 1, now);
          }
          drawWispBetween(
            ctx,
            torch,
            ms,
            now,
            WISP_SIZE * TORCH,
            0.9,
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
