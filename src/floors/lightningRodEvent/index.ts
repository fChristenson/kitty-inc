// the "Lightning Rod" event (lightning; a free floor): it covers its crit,
// whose click freezes the screen while bolt after bolt cracks down out of
// the sky onto the building's locked floor, each strike a blinding flash, a
// crack and a jolt, faster and faster; every strike leaves a crackling arc
// feeding a charge that swells in the floor's middle, until one colossal
// bolt slams into the charge in a huge blast and shake, and as the screen
// unfreezes the floor bursts open: unlocked for free. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeamFlare } from "../../shared/beam";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../shared/lightning";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";
import type { Point } from "../../shared/wisp";

const KEY = "lightningRod";
const STRIKES = 6;
const INSET = 40;
const BOLT_MS = 180;
const ARC_ALPHA = 0.55;
const ARC_SCALE = 0.35;
// the charge swells to CHARGE px round
const CHARGE = 70;
const FINAL_SCALE = 2.2;
const STRIKE_SHAKE: [number, number] = [0.8, 1.6];

export const forceLightningRodEvent = registerWispEvent(
  KEY,
  "Lightning Rod",
  () => CONFIG.lightningRodEvent.chance,
  (floor, context, area) => {
    const { gapsMs, finalGapMs, holdMs, mergeMs } = CONFIG.lightningRodEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const centre: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const sky = Math.min(area.top - 40, locked.offsetY - 260);
    const strikes: { at: number; bolt: Bolt; arc: Bolt }[] = [];
    let clock = 0;
    for (let k = 0; k < STRIKES; k++) {
      clock += lerp(gapsMs, k / (STRIKES - 1));
      const hit: Point = {
        x: INSET + Math.random() * (FLOOR_W - 2 * INSET),
        y: locked.offsetY + INSET + Math.random() * (FLOOR_H - 2 * INSET),
      };
      const from: Point = {
        x: area.left + Math.random() * (area.right - area.left),
        y: sky,
      };
      strikes.push({
        at: clock,
        bolt: createBolt(from, hit, 2),
        arc: createBolt(hit, centre, 1),
      });
    }
    const finalAt = clock + finalGapMs;
    const finalBolt = createBolt({ x: centre.x, y: sky }, centre, 4);

    const striking = createBeats(
      strikes,
      (s) => s.at,
      (s, k) => {
        const t = k / (STRIKES - 1);
        cover!.burst(s.bolt.to, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, t));
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
      { durationMs: finalAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          striking.tick(ms, now);
          finishing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms >= finalAt + BOLT_MS * 2) return;
          let charged = 0;
          for (const s of strikes) {
            if (ms < s.at) break;
            charged++;
            if (ms < finalAt) drawBolt(ctx, s.arc, ARC_ALPHA, ARC_SCALE);
            const t = (ms - s.at) / BOLT_MS;
            if (t < 1) {
              drawBolt(ctx, s.bolt, 1 - t);
              drawStrike(ctx, s.bolt.to, 1 - t, 1.2, now);
            }
          }
          if (ms < finalAt) {
            const r =
              CHARGE *
              clamp01(charged / STRIKES) *
              (0.85 + 0.15 * Math.random());
            drawBeamFlare(ctx, centre, r, 1, now);
            return;
          }
          const t = (ms - finalAt) / (BOLT_MS * 2);
          drawBolt(ctx, finalBolt, 1 - t, FINAL_SCALE);
          drawStrike(ctx, centre, 1 - t, FINAL_SCALE * 1.5, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
