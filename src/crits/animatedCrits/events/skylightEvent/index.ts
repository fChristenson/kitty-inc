// the "Skylight" event (drill; worker perma tiers): it covers its crit,
// whose click freezes the screen while a drill-headed wisp rises off the
// clicked floor and bites up into its ceiling with a bang; it stalls,
// grinding and juddering in a gush of white-hot sparks along the ceiling,
// then bores up shove by shove and punches through in a big blast; light
// pours down through the hole in blazing shafts onto every worker on the
// floor, one after another, each lighting up a perma tier, the last in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGrind, planDrill, planGrind } from "../../../../shared/drill";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";
import type { Floor } from "../../../../gameState";
import type { EventProcContext } from "../../eventProcs";

const KEY = "skylight";
const MAX_WORKERS = 4;
const CEILING = 14;
const FROM = 320;
const PUSHES = 8;
const SIZE = WISP_SIZE * 1.2;
const SPRAY = WISP_SIZE * 1.3;
const SHAFT_GAP_MS = 140;
const SHAFT_GROW_MS = 160;
const SHAFT = 46;
const CORE = 14;
const FADE_MS = 400;
const POOL = 70;
const BITE_SHAKE = 0.9;
const RUMBLE_SHAKE = 0.25;
const PUSH_SHAKE: [number, number] = [0.35, 0.8];
const THROUGH_SHAKE = 1.4;
const LIGHT_SHAKE: [number, number] = [0.6, 1.1];

function floorWorkers(floor: Floor, context: EventProcContext): RewardWorker[] {
  return findRewardWorkers(floor, context)
    .filter((w) => w.worker.floor === floor)
    .slice(0, MAX_WORKERS);
}

export const forceSkylightEvent = registerWispEvent(
  KEY,
  "Skylight",
  () => CONFIG.skylightEvent.chance,
  (floor, context) => {
    const { approachMs, stallMs, boreMs, holdMs, mergeMs } =
      CONFIG.skylightEvent;
    const workers = floorWorkers(floor, context).sort(
      (a, b) => a.at.x - b.at.x,
    );
    if (workers.length === 0) return;
    const x = workers.reduce((sum, w) => sum + w.at.x, 0) / workers.length;
    const hole: Point = { x, y: CEILING };
    const grind = planGrind(
      planDrill({ x, y: CEILING + FROM }, hole, {
        approachMs,
        boreMs,
        pushes: PUSHES,
      }),
      stallMs,
    );
    const { bites, rumbles, pushes, through } = grind;
    // shafts reach the nearest workers first
    const lights = workers
      .map((worker) => ({ worker, d: Math.abs(worker.at.x - x) }))
      .sort((a, b) => a.d - b.d)
      .map(({ worker }, k) => ({
        worker,
        ms: through + SHAFT_GROW_MS + k * SHAFT_GAP_MS,
      }));
    const last = lights[lights.length - 1];
    const endAt = last.ms + FADE_MS;
    const tip: Point = { x: 0, y: 0 };

    const biting = createBeats(
      [bites],
      (ms) => ms,
      () => {
        cover!.burst(hole, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BITE_SHAKE);
      },
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUMBLE_SHAKE);
      },
    );
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PUSH_SHAKE, k / Math.max(1, pushes.length - 1)));
      },
    );
    const punching = createBeats(
      [through],
      (ms) => ms,
      () => {
        cover!.burst(hole, 1.1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(THROUGH_SHAKE);
      },
    );
    const lighting = createBeats(
      lights,
      (l) => l.ms,
      (l, k) => {
        cover!.promote(l.worker);
        if (l === last) {
          cover!.blast(l.worker.at);
          return;
        }
        cover!.burst(l.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LIGHT_SHAKE, k / Math.max(1, lights.length - 1)));
      },
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
          biting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          punching.tick(ms, now);
          lighting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - last.ms) / FADE_MS);
          for (const l of lights) {
            const g = easeOut(
              clamp01((ms - (l.ms - SHAFT_GROW_MS)) / SHAFT_GROW_MS),
            );
            if (g <= 0) continue;
            tip.x = lerp([hole.x, l.worker.at.x], g);
            tip.y = lerp([hole.y, l.worker.at.y], g);
            drawBeam(ctx, hole, tip, SHAFT, 0.45 * fade);
            drawBeam(ctx, hole, tip, CORE, fade);
            if (ms >= l.ms) drawBeamFlare(ctx, l.worker.at, POOL, fade, now);
          }
          if (ms >= through) drawBeamFlare(ctx, hole, POOL * 0.8, fade, now);
          drawGrind(ctx, grind, ms, now, SIZE, SPRAY);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => floorWorkers(floor, context).length > 0,
);
