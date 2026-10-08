// the "Demolition" event (explosion; a free floor): it covers its crit,
// whose click freezes the screen while four bomb wisps fly up out of the
// clicked floor's button and stick to the corners of the building's locked
// floor, fuses fizzing and blinking red ever faster as the screen rumbles;
// they go off one after another round the floor in fireballs and bangs,
// each a big jolt, then a colossal charge in its middle blows in a huge
// blast and shake, and as the screen unfreezes the floor bursts open:
// unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
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
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "demolition";
const INSET = 50;
// the charges arc LOFT px over their flight, STAGGER ms apart
const LOFT = 160;
const STAGGER = 70;
const CHARGE = 0.55;
const FUSE = 34;
const BLAST = 110;
const FINAL = 220;
const RUMBLE_MS = 150;
const BLAST_SHAKE: [number, number] = [1, 1.8];

export const forceDemolitionEvent = registerWispEvent(
  KEY,
  "Demolition",
  () => CONFIG.demolitionEvent.chance,
  (floor, context) => {
    const { flyMs, fuseMs, gapMs, finalGapMs, holdMs, mergeMs } =
      CONFIG.demolitionEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const top = locked.offsetY + INSET;
    const bottom = locked.offsetY + FLOOR_H - INSET;
    const corners: Point[] = [
      { x: INSET, y: top },
      { x: FLOOR_W - INSET, y: top },
      { x: FLOOR_W - INSET, y: bottom },
      { x: INSET, y: bottom },
    ];
    const centre: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const litAt = flyMs + STAGGER * (corners.length - 1);
    const blowAt = litAt + fuseMs;
    const charges = corners.map((at, k) => {
      const leaves = k * STAGGER;
      const arc: Point = {
        x: (button.x + at.x) / 2,
        y: Math.min(button.y, at.y) - LOFT,
      };
      const point: Point = { x: 0, y: 0 };
      const boom = blowAt + k * gapMs;
      return {
        at,
        boom,
        wisp: (ms: number): Point | null => {
          if (ms < leaves || ms >= boom) return null;
          return ms < leaves + flyMs
            ? bezier(button, arc, at, easeOut((ms - leaves) / flyMs), point)
            : at;
        },
        fromMs: leaves,
      };
    });
    const finalAt = charges[charges.length - 1].boom + finalGapMs;
    const endAt = finalAt;

    const rumbles = Array.from(
      { length: Math.floor(fuseMs / RUMBLE_MS) },
      (_, i) => litAt + i * RUMBLE_MS,
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive())
          shakeScreen(lerp([0.3, 1], k / Math.max(1, rumbles.length - 1)));
      },
    );
    const booming = createBeats(
      charges,
      (c) => c.boom,
      (_, k) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLAST_SHAKE, k / Math.max(1, charges.length - 1)));
      },
    );
    const finishing = createBeats(
      [finalAt],
      (ms) => ms,
      () => cover!.blast(centre),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          rumbling.tick(ms, now);
          booming.tick(ms, now);
          finishing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > finalAt + DETONATION_MS) return;
          for (const c of charges) {
            if (ms >= litAt && ms < c.boom)
              drawLitFuse(
                ctx,
                c.at,
                clamp01((ms - litAt) / (c.boom - litAt)),
                FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              c.wisp,
              ms,
              now,
              WISP_SIZE * CHARGE,
              0.8,
              c.fromMs,
              c.boom,
            );
            drawDetonation(ctx, c.at, ms - c.boom, BLAST, now);
          }
          drawDetonation(ctx, centre, ms - finalAt, FINAL, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
