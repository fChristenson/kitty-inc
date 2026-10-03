// the "Waterspout" event (money; a free floor and cash): it covers its crit,
// whose click freezes the screen while three rivers of cash twist up out of
// the clicked floor's button around each other into a spinning waterspout,
// roaring up the building floor by floor, every floor a jolt, the column
// narrowing as it climbs; it bores into the building's locked floor in a
// huge blast and shake, and the floor bursts open, unlocked for free, as
// the screen unfreezes. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "waterspout";
const REWARD = 2;
const STRANDS = 3;
const TURNS = 4;
const WIDE = 150;
const NARROW = 40;
const FLOOR_SHAKE: [number, number] = [0.4, 1.2];

export const forceWaterspoutEvent = registerWispEvent(
  KEY,
  "Waterspout",
  () => CONFIG.waterspoutEvent.chance,
  (floor, context) => {
    const { climbMs, holdMs, mergeMs } = CONFIG.waterspoutEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const strands = Array.from({ length: STRANDS }, (_, s) =>
      sampleLine((u): Point => {
        const a = u * TURNS * Math.PI * 2 + (s / STRANDS) * Math.PI * 2;
        const r = lerp([WIDE, NARROW], u) * (1 - u * u);
        return {
          x: lerp([button.x, lock.x], u) + Math.sin(a) * r,
          y: lerp([button.y, lock.y], u),
        };
      }, 90),
    );
    const pour: Pour = { coinsAlong: 260, width: 30, streamMs: climbMs * 0.7, travelMs: climbMs };
    const floors = Math.max(1, Math.round(Math.abs(button.y - lock.y) / FLOOR_H));
    const passes = Array.from({ length: floors - 1 }, (_, j) => (climbMs * (j + 1)) / floors);
    const durationMs = Math.max(pourDurationMs(0, pour), climbMs + holdMs + mergeMs);

    const pouring = createBeats([0], (ms) => ms, () => {
      for (const line of strands) pourLine(cover!, line, pour);
    });
    const passing = createBeats(
      passes,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(FLOOR_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const finale = createBeats([climbMs], (ms) => ms, () => cover!.blast(lock));

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          pouring.tick(ms, now);
          passing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
