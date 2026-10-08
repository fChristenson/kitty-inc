// the "Stargate" event (beam; a free floor): it covers its crit, whose click
// freezes the screen while a ring of eight beams flickers up round the
// building's locked floor and its chevrons lock on one after another, each
// segment blazing to life with a clunk and a jolt, ever faster, as the ring
// spins up; with the eighth the gate fires, a blinding flare blowing open
// its middle in a huge blast and shake, and the floor bursts open,
// unlocked for free, as the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "stargate";
const CHEVRONS = 8;
// the ring is RING of the floor's height across, spinning SPIN rad a second
const RING = 0.42;
const SPIN = 1.2;
const SEGMENT = 16;
const CHEVRON = 22;
const LOCK_SHAKE: [number, number] = [0.3, 1.1];

export const forceStargateEvent = registerWispEvent(
  KEY,
  "Stargate",
  () => CONFIG.stargateEvent.chance,
  (floor, context) => {
    const { riseMs, locksMs, fireMs, holdMs, mergeMs } = CONFIG.stargateEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const center: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const radius = FLOOR_H * RING;
    let clock: number = riseMs;
    const locks = Array.from({ length: CHEVRONS }, (_, k) => {
      const at = clock;
      clock += lerp(locksMs, k / (CHEVRONS - 1));
      return at;
    });
    const fireAt = locks[CHEVRONS - 1] + fireMs;
    const endAt = fireAt;
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const corner = (i: number, ms: number, into: Point) => {
      const angle =
        (i / CHEVRONS) * Math.PI * 2 + (ms / 1000) * SPIN * (1 + ms / endAt);
      into.x = center.x + Math.cos(angle) * radius;
      into.y = center.y + Math.sin(angle) * radius;
      return into;
    };

    const locking = createBeats(
      locks,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LOCK_SHAKE, k / (CHEVRONS - 1)));
      },
    );
    const firing = createBeats(
      [fireAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          locking.tick(ms, now);
          firing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 400) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 400 : 1;
          const t = Math.min(ms, endAt);
          for (let i = 0; i < CHEVRONS; i++) {
            corner(i, t, a);
            corner(i + 1, t, b);
            if (ms < riseMs || ms < locks[i]) {
              if (ms > riseMs * (i / CHEVRONS)) drawAimLaser(ctx, a, b);
              continue;
            }
            const pop = 1 - clamp01((ms - locks[i]) / 200);
            drawBeam(ctx, a, b, SEGMENT, 0.6 * fade);
            drawBeamFlare(ctx, a, CHEVRON * (0.6 + pop) * fade, fade, now);
          }
          if (ms > fireAt - fireMs)
            drawBeamFlare(
              ctx,
              center,
              radius * 0.8 * clamp01((ms - fireAt + fireMs) / fireMs) * fade,
              fade,
              now,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
