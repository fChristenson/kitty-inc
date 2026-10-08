// the "Torrent" event (money; a free floor and cash): it covers its crit,
// whose click freezes the screen while a torrent of cash bursts out of the
// clicked floor's button and roars up the building in a zigzag, slamming
// from wall to wall a floor at a time, every wall it hits a splash, a bang
// and a jolt, harder as it climbs; it smashes into the building's locked
// floor in a huge blast and shake, and the floor bursts open, unlocked for
// free, as the screen unfreezes. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute } from "../../../../shared/curves";
import {
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "torrent";
const REWARD = 2;
const WALL = 90;
const SEGMENT_STEPS = 16;
const WALL_SHAKE: [number, number] = [0.5, 1.3];

export const forceTorrentEvent = registerWispEvent(
  KEY,
  "Torrent",
  () => CONFIG.torrentEvent.chance,
  (floor, context, area) => {
    const { climbMs, holdMs, mergeMs } = CONFIG.torrentEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const walls = Math.max(
      2,
      Math.round((Math.abs(button.y - lock.y) / FLOOR_H) * 2),
    );
    const route: Point[] = [button];
    for (let j = 1; j < walls; j++)
      route.push({
        x: j % 2 === 1 ? area.left + WALL : area.right - WALL,
        y: lerp([button.y, lock.y], j / walls),
      });
    route.push(lock);
    const steps = (route.length - 1) * SEGMENT_STEPS;
    const point: Point = { x: 0, y: 0 };
    const line = sampleLine((u) => {
      alongRoute(route, u, point);
      return { x: point.x, y: point.y };
    }, steps);
    const along = measure(line);
    const hits = route.slice(1).map((at, j) => ({
      at,
      ms: (climbMs * along[(j + 1) * SEGMENT_STEPS]) / along[steps],
      final: j === route.length - 2,
    }));
    const pour: Pour = {
      coinsAlong: 300,
      width: 56,
      streamMs: climbMs * 0.7,
      travelMs: climbMs,
    };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      climbMs + holdMs + mergeMs,
    );

    const pouring = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, line, pour),
    );
    const hitting = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        if (h.final) {
          cover!.blast(lock);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(h.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(WALL_SHAKE, k / Math.max(1, hits.length - 2)));
      },
    );

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
          hitting.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
