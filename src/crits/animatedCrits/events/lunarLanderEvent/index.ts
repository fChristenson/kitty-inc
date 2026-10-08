// the "Lunar Lander" event (wisp; a free floor): it covers its crit, whose
// click freezes the screen while a lander wisp blasts off the clicked
// floor's button, arcs up over the building and starts its descent onto the
// locked floor, firing its thrusters in sharp puffs, each a flash, a whoosh
// and a jolt, drifting and correcting as it slows; it touches down on the
// lock in a huge blast and shake and the floor bursts open, unlocked for
// free, as the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "lunarLander";
// it climbs to HOVER px over the lock, then comes down drifting DRIFT px
const HOVER = 260;
const DRIFT = 50;
const PUFFS = 6;
const FLAME = 34;
const LANDER = 0.65;
const PUFF_SHAKE: [number, number] = [0.3, 0.8];

export const forceLunarLanderEvent = registerWispEvent(
  KEY,
  "Lunar Lander",
  () => CONFIG.lunarLanderEvent.chance,
  (floor, context) => {
    const { launchMs, descentMs, holdMs, mergeMs } = CONFIG.lunarLanderEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const over: Point = { x: lock.x + DRIFT, y: lock.y - HOVER };
    const ctrl: Point = {
      x: (button.x + over.x) / 2,
      y: Math.min(button.y, over.y) - 200,
    };
    const endAt = launchMs + descentMs;
    // the descent slows to a crawl as it nears the lock, nudged side to side
    const descent = (u: number) => 1 - (1 - u) ** 2.2;
    const puffs = Array.from({ length: PUFFS }, (_, i) => ({
      at: launchMs + descentMs * ((i + 1) / (PUFFS + 1)),
    }));
    const landerAt: Point = { x: 0, y: 0 };
    const lander = (ms: number): Point => {
      if (ms < launchMs)
        return bezier(button, ctrl, over, easeOut(ms / launchMs), landerAt);
      const u = clamp01((ms - launchMs) / descentMs);
      landerAt.x =
        lerp([over.x, lock.x], u) +
        Math.sin(u * Math.PI * 3) * DRIFT * 0.4 * (1 - u);
      landerAt.y = lerp([over.y, lock.y], descent(u));
      return landerAt;
    };
    const flame: Point = { x: 0, y: 0 };

    const puffing = createBeats(
      puffs,
      (p) => p.at,
      (p, k) => {
        const at = lander(p.at);
        flame.x = at.x;
        flame.y = at.y + FLAME;
        cover!.burst(flame, 0.3);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(PUFF_SHAKE, k / (PUFFS - 1)));
      },
    );
    const touching = createBeats(
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
          puffing.tick(ms, now);
          touching.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            lander,
            ms,
            now,
            WISP_SIZE * LANDER,
            0.8,
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
