// the "Overcharge" event (lightning; a free floor): it covers its crit,
// whose click freezes the screen while the income bars start to crackle
// and, bottom bar first, each one throws a bolt of lightning up into the
// building's locked floor, kicking back with a crack, a flash and a jolt as
// the lock swells with charge, the bolts coming ever faster; then every bar
// fires at once into the lock, which bursts open in a huge blast and shake,
// unlocked for free, as the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "overcharge";
const MAX_BARS = 6;
const BOLT_MS = 180;
const VOLLEY_MS = 320;
const CHARGE_R: [number, number] = [10, 46];
const FIRE_SHAKE: [number, number] = [0.5, 1.3];

export const forceOverchargeEvent = registerWispEvent(
  KEY,
  "Overcharge",
  () => CONFIG.overchargeEvent.chance,
  (floor, context) => {
    const { firesMs, holdMs, mergeMs } = CONFIG.overchargeEvent;
    const locked = findRewardLocked(floor, context);
    const found = findRewardBars(floor, context).slice(-MAX_BARS);
    if (!locked || found.length === 0) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const bars = [...found].reverse();
    let clock = 0;
    const shots = bars.map((bar, k) => {
      clock += lerp(firesMs, k / Math.max(1, bars.length - 1));
      return { bar, ms: clock, bolt: createBolt(bar.center, lock, 2) };
    });
    const volleyAt = clock + lerp(firesMs, 1);
    const endAt = volleyAt;
    const volley = bars.map((bar) => createBolt(bar.center, lock, 1));

    const firing = createBeats(
      shots,
      (s) => s.ms,
      (s, k) => {
        cover!.levels(s.bar, 0, lock);
        cover!.burst(s.bar.center, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(FIRE_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );
    const finale = createBeats(
      [volleyAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.levels(bar, 0, lock);
        cover!.blast(lock);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + VOLLEY_MS + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          firing.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + VOLLEY_MS) return;
          let fired = 0;
          for (const s of shots) {
            if (ms < s.ms) break;
            fired++;
            const t = (ms - s.ms) / BOLT_MS;
            if (t < 1) {
              drawBolt(ctx, s.bolt, 1 - t, 0.9);
              drawStrike(ctx, s.bar.center, 1 - t, 0.5, now);
            }
          }
          if (ms < endAt) {
            const charge = fired / shots.length;
            drawBeamFlare(
              ctx,
              lock,
              lerp(CHARGE_R, charge),
              0.4 + 0.6 * charge,
              now,
            );
            return;
          }
          const fade = 1 - clamp01((ms - endAt) / VOLLEY_MS);
          for (const bolt of volley) drawBolt(ctx, bolt, fade, 1.1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardLocked(floor, context) !== null &&
    findRewardBars(floor, context).length > 0,
);
