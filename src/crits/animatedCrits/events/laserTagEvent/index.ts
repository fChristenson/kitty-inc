// the "Laser Tag" event (beam; perma tiers for workers): it covers its crit,
// whose click freezes the screen while the workers in view open up on each
// other in a game of laser tag: a flickering aim line snaps from one worker
// onto another, then a blazing beam fires across, the one tagged lit up a
// perma tier in a flash, a bang and a jolt, ever faster, criss-crossing the
// screen until every worker's been tagged; then they all fire into one point
// at once in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers } from "../../eventRewards";
import { WORKER_HEIGHT } from "../../../../floors/worker";
import type { Point } from "../../../../shared/wisp";

const KEY = "laserTag";
const MAX_WORKERS = 6;
const BLADE = 18;
const FLARE = 26;
const TAG_SHAKE: [number, number] = [0.8, 1.7];
const TAG_BURST: [number, number] = [0.5, 0.9];

export const forceLaserTagEvent = registerWispEvent(
  KEY,
  "Laser Tag",
  () => CONFIG.laserTagEvent.chance,
  (floor, context) => {
    const { gapsMs, aimMs, fireMs, volleyMs, holdMs, mergeMs } =
      CONFIG.laserTagEvent;
    const workers = findRewardWorkers(floor, context)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const chests: Point[] = workers.map((w) => ({
      x: w.at.x,
      y: w.at.y - WORKER_HEIGHT * 0.15,
    }));
    const button = getButtonCenter(context.isGroundFloor);
    // each worker is tagged by the one after it (a lone worker by the button)
    const shots = workers.map((_, k) => ({
      from: workers.length > 1 ? chests[(k + 1) % workers.length] : button,
      to: chests[k],
      at: 0,
    }));
    let clock = 0;
    shots.forEach((shot, k) => {
      clock += aimMs;
      shot.at = clock;
      clock += lerp(gapsMs, k / Math.max(1, shots.length - 1));
    });
    const volleyAt = clock;
    const endAt = volleyAt + volleyMs;
    const focus: Point = {
      x: chests.reduce((s, c) => s + c.x, 0) / chests.length,
      y: chests.reduce((s, c) => s + c.y, 0) / chests.length - 120,
    };

    const tagging = createBeats(
      shots,
      (s) => s.at,
      (s, k) => {
        const t = k / Math.max(1, shots.length - 1);
        cover!.promote(workers[k]);
        cover!.burst(s.to, lerp(TAG_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(TAG_SHAKE, t));
      },
    );
    const volley = createBeats(
      [volleyAt],
      (ms) => ms,
      () => cover!.blast(focus),
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
          tagging.tick(ms, now);
          volley.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= endAt) return;
          if (ms >= volleyAt - aimMs) {
            const firing = ms >= volleyAt;
            const fade = firing ? 1 - clamp01((ms - volleyAt) / volleyMs) : 1;
            for (const chest of chests)
              if (firing) drawBeam(ctx, chest, focus, BLADE * fade, fade);
              else drawAimLaser(ctx, chest, focus);
            if (firing) drawBeamFlare(ctx, focus, FLARE * 2 * fade, fade, now);
            return;
          }
          for (const shot of shots) {
            const since = ms - shot.at;
            if (since >= -aimMs && since < 0)
              drawAimLaser(ctx, shot.from, shot.to);
            else if (since >= 0 && since < fireMs) {
              const fade = 1 - since / fireMs;
              drawBeam(
                ctx,
                shot.from,
                shot.to,
                BLADE * (0.5 + 0.5 * fade),
                fade,
              );
              drawBeamFlare(ctx, shot.to, FLARE * fade, 1, now);
              drawBeamFlare(ctx, shot.from, FLARE * 0.5 * fade, 1, now);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
