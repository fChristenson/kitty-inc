// the "Courier" event (mix; a free floor and cash): it covers its crit, whose
// click freezes the screen while a courier wisp bolts out of the clicked
// floor's button towing a river of cash behind it, weaving from side to
// side up through the building, every swerve a whoosh and a jolt, until it
// delivers the whole river into the building's locked floor in a huge blast
// and shake; the floor bursts open, unlocked for free, as the screen
// unfreezes. Pays floor income × floor number × REWARD, plus the floor
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
import { lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "courier";
const REWARD = 2;
const SWERVES = 4;
const EDGE = 60;
const COURIER = 0.55;
const SWERVE_SHAKE: [number, number] = [0.3, 0.9];

export const forceCourierEvent = registerWispEvent(
  KEY,
  "Courier",
  () => CONFIG.courierEvent.chance,
  (floor, context) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.courierEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const door: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const route: Point[] = [button];
    for (let k = 1; k <= SWERVES; k++)
      route.push({
        x: k % 2 === 0 ? EDGE : FLOOR_W - EDGE,
        y: lerp([button.y, door.y], k / (SWERVES + 1)),
      });
    route.push(door);
    const line = sampleLine((u) => alongRoute(route, u, { x: 0, y: 0 }), 160);
    const pour: Pour = { coinsAlong: 900, width: 36, streamMs, travelMs };
    const head = riverHead(line, travelMs);
    const swerves = Array.from(
      { length: SWERVES },
      (_, k) => (travelMs * (k + 1)) / (SWERVES + 1),
    );
    const endAt = travelMs;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      endAt + holdMs + mergeMs,
    );

    const swerving = createBeats(
      swerves,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SWERVE_SHAKE, k / (SWERVES - 1)));
      },
    );
    const delivery = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(door),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          swerving.tick(ms, now);
          delivery.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            head,
            ms,
            now,
            WISP_SIZE * COURIER,
            0.7,
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
