// the "Kangaroo" event (wisp; a free floor): it covers its crit, whose click
// freezes the screen while a kangaroo wisp bounds out of the clicked floor's
// button in huge zigzag leaps, each landing a thump, a burst and a jolt,
// each leap higher and further, until its last mighty bound lands it
// smack on the building's locked floor in a huge blast and shake, and the
// floor bursts open, unlocked for free, as the screen unfreezes. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "kangaroo";
const HOPS = 5;
const SWAY = 220;
const LEAP: [number, number] = [120, 260];
const ROO = 0.55;
const LAND_SHAKE: [number, number] = [0.6, 1.2];

export const forceKangarooEvent = registerWispEvent(
  KEY,
  "Kangaroo",
  () => CONFIG.kangarooEvent.chance,
  (floor, context) => {
    const { hopsMs, holdMs, mergeMs } = CONFIG.kangarooEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    let clock = 0;
    let from: Point = button;
    const hops = Array.from({ length: HOPS }, (_, k) => {
      const final = k === HOPS - 1;
      const u = (k + 1) / HOPS;
      const to: Point = final
        ? lock
        : {
            x: lock.x + (k % 2 === 0 ? -SWAY : SWAY),
            y: lerp([button.y, lock.y], u),
          };
      const a = from;
      const ctrl: Point = {
        x: (a.x + to.x) / 2,
        y: Math.min(a.y, to.y) - lerp(LEAP, k / (HOPS - 1)),
      };
      const leaves = clock;
      clock += lerp(hopsMs, k / (HOPS - 1));
      const lands = clock;
      from = to;
      const at: Point = { x: 0, y: 0 };
      return {
        to,
        leaves,
        lands,
        final,
        at: (ms: number): Point =>
          bezier(a, ctrl, to, clamp01((ms - leaves) / (lands - leaves)), at),
      };
    });
    const endAt = hops[HOPS - 1].lands;
    const roo = (ms: number): Point => {
      let h = hops[0];
      for (const hop of hops) if (ms >= hop.leaves) h = hop;
      return h.at(ms);
    };

    const landing = createBeats(
      hops,
      (h) => h.lands,
      (h, k) => {
        if (h.final) {
          cover!.blast(h.to);
          return;
        }
        cover!.burst(h.to, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / (HOPS - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => landing.tick(ms, now),
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(ctx, roo, ms, now, WISP_SIZE * ROO, 0.7, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
