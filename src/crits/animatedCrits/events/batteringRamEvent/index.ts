// the "Battering Ram" event (wisp; a free floor): it covers its crit, whose
// click freezes the screen while a wisp swoops in under the building's
// locked floor; it draws back and rams up into the floor's underside, again
// and again, each time drawing back further, swelling bigger and hitting
// harder, every ram a flash, a bang and a big jolt; the last smashes in
// with a huge blast and shake, and as the screen unfreezes the floor bursts
// open: unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "batteringRam";
const RAMS = 4;
// each draw-back pulls PULL px under the floor, further every time
const PULL: [number, number] = [160, 360];
const SIZE: [number, number] = [1, 2.4];
const RAM_SHAKE: [number, number] = [1, 1.9];

export const forceBatteringRamEvent = registerWispEvent(
  KEY,
  "Battering Ram",
  () => CONFIG.batteringRamEvent.chance,
  (floor, context, area) => {
    const { swoopMs, drawsMs, strikeMs, holdMs, mergeMs } =
      CONFIG.batteringRamEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const target: Point = {
      x: FLOOR_W / 2,
      y: locked.offsetY + FLOOR_H - 30,
    };
    const centre: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const entry: Point = {
      x: Math.random() < 0.5 ? area.left - 60 : area.right + 60,
      y: Math.min(area.bottom - 60, target.y + PULL[0]),
    };
    // each ram: drawn back down under the floor, then rammed up into it
    const rams = Array.from({ length: RAMS }, (_, k) => {
      const t = k / (RAMS - 1);
      return {
        back: {
          x: target.x,
          y: Math.min(area.bottom - 60, target.y + lerp(PULL, t)),
        },
        drawMs: lerp(drawsMs, t),
        startsAt: 0,
        hitAt: 0,
      };
    });
    let clock: number = swoopMs;
    for (const ram of rams) {
      ram.startsAt = clock;
      ram.hitAt = clock + ram.drawMs + strikeMs;
      clock = ram.hitAt;
    }
    const endAt = clock;
    const at: Point = { x: 0, y: 0 };
    const place = (from: Point, to: Point, u: number) => {
      at.x = from.x + (to.x - from.x) * u;
      at.y = from.y + (to.y - from.y) * u;
      return at;
    };
    const ram = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      if (ms < swoopMs)
        return place(entry, rams[0].back, easeOut(ms / swoopMs));
      const r = rams.find((x) => ms <= x.hitAt)!;
      const k = rams.indexOf(r);
      const from = k === 0 ? rams[0].back : target;
      const pulled = ms - r.startsAt;
      if (pulled < r.drawMs)
        return place(from, r.back, easeOut(pulled / r.drawMs));
      return place(r.back, target, easeIn((pulled - r.drawMs) / strikeMs));
    };

    const swooshing = createBeats(
      rams,
      (r) => r.startsAt + r.drawMs,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const ramming = createBeats(
      rams,
      (r) => r.hitAt,
      (_, k) => {
        const t = k / (RAMS - 1);
        if (k === RAMS - 1) {
          cover!.blast(centre);
          return;
        }
        cover!.burst(target, 0.7 + 0.5 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(RAM_SHAKE, t));
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
          swooshing.tick(ms, now);
          ramming.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          const grow = clamp01(ms / endAt);
          drawWispBetween(
            ctx,
            ram,
            ms,
            now,
            WISP_SIZE * lerp(SIZE, grow),
            grow,
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
