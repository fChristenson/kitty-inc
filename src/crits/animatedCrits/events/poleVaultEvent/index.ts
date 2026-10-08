// the "Pole Vault" event (mix; a free floor and cash): it covers its crit,
// whose click freezes the screen while a wisp drops out of the clicked
// floor's button to the bottom of the screen and sprints along it at the
// head of a river of cash; at the far side it plants
// with a crack and a jolt and vaults sky high in a huge arc, the river
// sweeping up behind it like a pole, and crashes into the building's locked
// floor in a huge blast and shake; the floor bursts open, unlocked for free,
// as the screen unfreezes. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "poleVault";
const REWARD = 2;
const EDGE = 60;
const BOTTOM = 70;
// the river drops DROP of its steps, runs RUN, then vaults the rest
const STEPS = 140;
const DROP = 0.12;
const RUN = 0.55;
const VAULTER = 0.6;

export const forcePoleVaultEvent = registerWispEvent(
  KEY,
  "Pole Vault",
  () => CONFIG.poleVaultEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.poleVaultEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const door: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const y = area.bottom - BOTTOM;
    const ltr = button.x > (area.left + area.right) / 2;
    const start: Point = { x: ltr ? area.left + EDGE : area.right - EDGE, y };
    const plant: Point = { x: ltr ? area.right - EDGE : area.left + EDGE, y };
    const peak: Point = { x: (plant.x + door.x) / 2, y: door.y - 220 };
    const line = sampleLine((u) => {
      if (u < DROP) {
        const v = u / DROP;
        return { x: lerp([button.x, start.x], v), y: lerp([button.y, y], v) };
      }
      if (u < DROP + RUN) {
        const v = (u - DROP) / RUN;
        return { x: lerp([start.x, plant.x], v), y };
      }
      return bezier(plant, peak, door, (u - DROP - RUN) / (1 - DROP - RUN), {
        x: 0,
        y: 0,
      });
    }, STEPS);
    const along = measure(line);
    const plantAt =
      (along[Math.round((DROP + RUN) * STEPS)] / along[STEPS]) * travelMs;
    const pour: Pour = { coinsAlong: 900, width: 40, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      travelMs + holdMs + mergeMs,
    );
    const vaulter = riverHead(line, travelMs);

    const planting = createBeats(
      [plantAt],
      (ms) => ms,
      () => {
        cover!.burst(plant, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.1);
      },
    );
    const landing = createBeats(
      [travelMs],
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
          planting.tick(ms, now);
          landing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            vaulter,
            ms,
            now,
            WISP_SIZE * VAULTER,
            0.8,
            0,
            travelMs,
          ),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
