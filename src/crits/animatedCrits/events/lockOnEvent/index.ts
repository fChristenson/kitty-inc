// the "Lock-On" event (beam; perma tiers for workers): it covers its crit,
// whose click freezes the screen while a jittering aim laser stabs down out
// of the sky and hunts across it, snapping onto one worker in view after
// another, ever faster; each lock-on fires a blazing beam down onto that
// worker in a flash, a bang and a jolt that lights it up a perma tier; then
// every beam fires at once onto all of them in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutCubic, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers } from "../../eventRewards";
import { WORKER_HEIGHT } from "../../../../floors/worker";
import type { Point } from "../../../../shared/wisp";

const KEY = "lockOn";
const MAX_WORKERS = 6;
// the laser hunts JITTER px round its target, settling as it locks on
const JITTER = 70;
const SIGHT = 12;
const BLADE = 22;
const FLARE = 28;
const SHOT_SHAKE: [number, number] = [0.9, 1.8];
const SHOT_BURST: [number, number] = [0.5, 0.9];

export const forceLockOnEvent = registerWispEvent(
  KEY,
  "Lock-On",
  () => CONFIG.lockOnEvent.chance,
  (floor, context, area) => {
    const { huntsMs, fireMs, volleyMs, holdMs, mergeMs } = CONFIG.lockOnEvent;
    const workers = findRewardWorkers(floor, context)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const sky = { x: (area.left + area.right) / 2, y: area.top - 60 };
    const marks = workers.map((w) => ({
      x: w.at.x,
      y: w.at.y - WORKER_HEIGHT * 0.15,
    }));
    const start = {
      x: lerp([area.left, area.right], Math.random()),
      y: (area.top + area.bottom) / 2,
    };
    // hunting target k from hunts[k], firing at shots[k]
    const hunts: number[] = [];
    const shots: number[] = [];
    let clock = 0;
    workers.forEach((_, k) => {
      hunts.push(clock);
      clock += lerp(huntsMs, k / Math.max(1, workers.length - 1));
      shots.push(clock);
      clock += fireMs;
    });
    const volleyAt = clock;
    const endAt = volleyAt + volleyMs;
    const aim = { x: 0, y: 0 };
    const aimAt = (k: number, ms: number): Point => {
      const from = k === 0 ? start : marks[k - 1];
      const to = marks[k];
      const u = clamp01((ms - hunts[k]) / (shots[k] - hunts[k]));
      const settle = easeOutCubic(u);
      const shake = JITTER * (1 - settle);
      aim.x =
        from.x + (to.x - from.x) * settle + Math.sin(ms * 0.07 + k) * shake;
      aim.y =
        from.y + (to.y - from.y) * settle + Math.cos(ms * 0.09 + k) * shake;
      return aim;
    };

    const firing = createBeats(
      shots,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, workers.length - 1);
        cover!.promote(workers[k]);
        cover!.burst(marks[k], lerp(SHOT_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SHOT_SHAKE, t));
      },
    );
    const volley = createBeats(
      [volleyAt],
      (ms) => ms,
      () => cover!.blast(marks[marks.length - 1]),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          firing.tick(ms, now);
          volley.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= endAt) return;
          if (ms >= volleyAt) {
            const fade = 1 - clamp01((ms - volleyAt) / volleyMs);
            for (const mark of marks) {
              drawBeam(ctx, sky, mark, BLADE * 1.3 * fade, fade);
              drawBeamFlare(ctx, mark, FLARE * fade, fade, now);
            }
            return;
          }
          let k = 0;
          while (k + 1 < workers.length && ms >= hunts[k + 1]) k++;
          if (ms >= shots[k]) {
            const fade = 1 - clamp01((ms - shots[k]) / fireMs);
            drawBeam(ctx, sky, marks[k], BLADE * (0.6 + 0.4 * fade));
            drawBeamFlare(ctx, marks[k], FLARE, 1, now);
            return;
          }
          const at = aimAt(k, ms);
          drawAimLaser(ctx, sky, at);
          drawBeamFlare(ctx, at, SIGHT, 0.8, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
