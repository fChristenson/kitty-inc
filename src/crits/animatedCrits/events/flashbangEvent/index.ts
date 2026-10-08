// the "Flashbang" event (explosion; a free floor): it covers its crit,
// whose click freezes the screen while the clicked floor's button tosses
// flashbang wisps up at the building's locked floor, one after another,
// fuses fizzing; each goes off on it in a blinding white-out that floods
// the whole screen, a bang and a big jolt, the screen swimming back out of
// the glare a little slower each time; the third blows the floor open in a
// huge blast and shake, unlocked for free as the screen unfreezes. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
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
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "flashbang";
const BANGS = 3;
// each white-out fades over FADE ms, FADE_STEP longer each time
const FADE = 260;
const FADE_STEP = 120;
const LOFT = 140;
const BANG = 0.4;
const FUSE = 22;
const BLAST = 180;
const BANG_SHAKE: [number, number] = [1, 1.6];

export const forceFlashbangEvent = registerWispEvent(
  KEY,
  "Flashbang",
  () => CONFIG.flashbangEvent.chance,
  (floor, context, area) => {
    const { gapsMs, flyMs, holdMs, mergeMs } = CONFIG.flashbangEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const bangs = Array.from({ length: BANGS }, (_, k) => {
      const thrown = clock;
      clock += lerp(gapsMs, k / (BANGS - 1));
      const hit: Point = {
        x: FLOOR_W * (0.3 + 0.4 * Math.random()),
        y: locked.offsetY + FLOOR_H * (0.35 + 0.3 * Math.random()),
      };
      const ctrl: Point = {
        x: (button.x + hit.x) / 2,
        y: Math.min(button.y, hit.y) - LOFT,
      };
      const at: Point = { x: 0, y: 0 };
      const pops = thrown + flyMs;
      return {
        hit,
        thrown,
        pops,
        fade: FADE + FADE_STEP * k,
        at: (ms: number): Point | null =>
          ms < thrown || ms >= pops
            ? null
            : bezier(button, ctrl, hit, (ms - thrown) / flyMs, at),
      };
    });
    const last = bangs[BANGS - 1];
    const endAt = last.pops;

    const throwing = createBeats(
      bangs,
      (b) => b.thrown,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const popping = createBeats(
      bangs,
      (b) => b.pops,
      (b, k) => {
        if (b === last) {
          cover!.blast(b.hit);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BANG_SHAKE, k / (BANGS - 1)));
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
          throwing.tick(ms, now);
          popping.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + Math.max(DETONATION_MS, last.fade)) return;
          let white = 0;
          for (const b of bangs) {
            const p = b.at(ms);
            if (p)
              drawLitFuse(ctx, p, clamp01((ms - b.thrown) / flyMs), FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BANG,
              0.7,
              b.thrown,
              b.pops,
            );
            drawDetonation(ctx, b.hit, ms - b.pops, BLAST, now);
            const t = (ms - b.pops) / b.fade;
            if (t >= 0 && t < 1) white = Math.max(white, (1 - t) ** 1.5);
          }
          if (white > 0) {
            ctx.globalAlpha = white * 0.9;
            ctx.fillStyle = COLOR.white;
            ctx.fillRect(
              area.left,
              area.top,
              area.right - area.left,
              area.bottom - area.top,
            );
            ctx.globalAlpha = 1;
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
