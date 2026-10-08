// the "Rock the Boat" event (clutter; a free floor): it covers its crit,
// whose click freezes the screen while waves of glitter wash down over the
// whole screen; then the screen rocks like a boat in a swell (shown only by
// the mess): the glitter slides away to one side and piles against it with
// a jolt, sloshes back across to the other, then rushes up to the top, every
// tilt a swoosh and a rumble, bunching tighter each time; on the last roll
// it all pours together into the lock in a heap, which blows open in a huge
// blast: the floor unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { scatterWaves, simulateClean } from "../../../../shared/clutter";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "rockTheBoat";
const BITS = 380;
const BIT = 10;
const MARGIN = 60;
const DROP = 260;
// the slide's pull (px/ms²; a loose bit tops out near 72 times it, capped
// at 2.5 px/ms), the walls' spring back (px/ms² per px past them) and the
// final pour's pull into the lock
const TILT = 0.035;
const WALL = 0.01;
const POUR = 0.03;
// the tilts in turn, as the way the glitter slides
const TILTS: Point[] = [
  { x: -1, y: 0.25 },
  { x: 1, y: 0.25 },
  { x: 0.15, y: -1 },
];
const TILT_SHAKE: [number, number] = [0.5, 0.9];
const POUR_SHAKE = 1;
const LAND_SHAKE = 0.4;

export const forceRockTheBoatEvent = registerWispEvent(
  KEY,
  "Rock the Boat",
  () => CONFIG.rockTheBoatEvent.chance,
  (floor, context, area) => {
    const { dumpMs, tiltMs, pourMs, holdMs, mergeMs } = CONFIG.rockTheBoatEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const box = {
      left: area.left + MARGIN,
      top: area.top + MARGIN,
      right: area.right - MARGIN,
      bottom: area.bottom - MARGIN,
    };
    const spots = scatterWaves(box, BITS);
    const drops = spots.map(() => Math.random() * dumpMs * 0.5);
    const fallMs = dumpMs * 0.5;
    const tilts = TILTS.map((dir, k) => {
      const n = Math.hypot(dir.x, dir.y);
      return { x: dir.x / n, y: dir.y / n, ms: dumpMs + k * tiltMs };
    });
    const pourAt = dumpMs + TILTS.length * tiltMs;
    const openAt = pourAt + pourMs;

    const swept = simulateClean(
      spots,
      [
        {
          kind: "force",
          push: (x, y, ms, into) => {
            if (ms >= pourAt) {
              const dx = lock.x - x;
              const dy = lock.y - y;
              const d = Math.hypot(dx, dy) || 1;
              into.x = (dx / d) * POUR;
              into.y = (dy / d) * POUR;
              return into;
            }
            const k = Math.min(
              tilts.length - 1,
              Math.floor((ms - dumpMs) / tiltMs),
            );
            into.x = tilts[k].x * TILT;
            into.y = tilts[k].y * TILT;
            // the screen's edges hold the mess in like a boat's sides
            if (x < box.left) into.x += (box.left - x) * WALL;
            if (x > box.right) into.x -= (x - box.right) * WALL;
            if (y < box.top) into.y += (box.top - y) * WALL;
            if (y > box.bottom) into.y -= (y - box.bottom) * WALL;
            return into;
          },
        },
      ],
      dumpMs,
      openAt,
    );

    const landing = createBeats(
      [dumpMs * 0.4, dumpMs * 0.8],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(LAND_SHAKE);
      },
    );
    const rocking = createBeats(
      tilts,
      (t) => t.ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(TILT_SHAKE, k / Math.max(1, tilts.length - 1)));
      },
    );
    const piling = createBeats(
      tilts.map((t) => t.ms + tiltMs * 0.75),
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(LAND_SHAKE);
      },
    );
    const pouring = createBeats(
      [pourAt, openAt],
      (ms) => ms,
      (ms) => {
        if (ms >= openAt) {
          cover!.blast(lock);
          return;
        }
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(POUR_SHAKE);
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: openAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          landing.tick(ms, now);
          rocking.tick(ms, now);
          piling.tick(ms, now);
          pouring.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms < 0 || ms >= openAt) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < spots.length; i++) {
            if (ms < drops[i]) continue;
            if (ms < dumpMs) {
              const u = easeIn(clamp01((ms - drops[i]) / fallMs));
              bit.x = spots[i].x;
              bit.y = lerp([spots[i].y - DROP, spots[i].y], u);
            } else swept.at(i, ms, bit);
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              BIT,
              i * 1.3 + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
