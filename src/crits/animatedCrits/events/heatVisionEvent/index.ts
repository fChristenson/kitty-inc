// the "Heat Vision" event (beam; worker perma tiers): it covers its crit,
// whose click freezes the screen while a pair of eye wisps rises out of the
// clicked floor's button and glares round the screen; locking onto a worker
// they flicker twin aim lasers at it, then blaze two searing beams onto it
// that cross in a flare, a bang and a jolt as the worker climbs a perma
// tier; worker after worker, ever quicker, the last scorched in a huge blast
// and shake. Then the crit's tier pays out
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
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "heatVision";
const MAX_WORKERS = 6;
const TOP = 200;
const EYES = 36;
const RISE_MS = 260;
const WIDTH = 30;
const FLARE = 46;
const EYE = 0.45;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceHeatVisionEvent = registerWispEvent(
  KEY,
  "Heat Vision",
  () => CONFIG.heatVisionEvent.chance,
  (floor, context, area) => {
    const { aimMs, fireMs, gapsMs, holdMs, mergeMs } = CONFIG.heatVisionEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const perch: Point = { x: (area.left + area.right) / 2, y: area.top + TOP };
    let clock: number = RISE_MS;
    const glares = workers.map((worker, k) => {
      const aims = clock;
      const fires = aims + aimMs;
      const hits = fires + fireMs;
      clock = hits + lerp(gapsMs, k / Math.max(1, workers.length - 1));
      return { worker, aims, fires, hits };
    });
    const last = glares[glares.length - 1];
    const endAt = last.hits;
    // the pair glances toward whichever worker it's glaring at
    const head: Point = { x: 0, y: 0 };
    const headAt = (ms: number): Point => {
      const u = easeOut(clamp01(ms / RISE_MS));
      let g = glares[0];
      for (const glare of glares) if (ms >= glare.aims) g = glare;
      const lean = clamp01((ms - g.aims) / aimMs) * 0.12;
      head.x = lerp([button.x, perch.x], u) + (g.worker.at.x - perch.x) * lean;
      head.y =
        lerp([button.y, perch.y], u) + (g.worker.at.y - perch.y) * lean * 0.3;
      return head;
    };
    const leftAt: Point = { x: 0, y: 0 };
    const rightAt: Point = { x: 0, y: 0 };
    const leftEye = (ms: number): Point => {
      headAt(ms);
      leftAt.x = head.x - EYES / 2;
      leftAt.y = head.y;
      return leftAt;
    };
    const rightEye = (ms: number): Point => {
      headAt(ms);
      rightAt.x = head.x + EYES / 2;
      rightAt.y = head.y;
      return rightAt;
    };

    const searing = createBeats(
      glares,
      (g) => g.fires,
      () => {
        if (cover?.isLive()) shakeScreen(0.4);
      },
    );
    const hitting = createBeats(
      glares,
      (g) => g.hits,
      (g, k) => {
        cover!.promote(g.worker);
        if (g === last) {
          cover!.blast(g.worker.at);
          return;
        }
        cover!.burst(g.worker.at, 0.55);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, glares.length - 1)));
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
          searing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const g of glares) {
            if (ms < g.aims || ms >= g.hits) continue;
            const l = leftEye(ms);
            const r = rightEye(ms);
            if (ms < g.fires) {
              drawAimLaser(ctx, l, g.worker.at);
              drawAimLaser(ctx, r, g.worker.at);
              continue;
            }
            const t = (ms - g.fires) / (g.hits - g.fires);
            const width = WIDTH * (0.5 + t);
            drawBeam(ctx, l, g.worker.at, width);
            drawBeam(ctx, r, g.worker.at, width);
            drawBeamFlare(ctx, g.worker.at, FLARE * (0.6 + t), 1, now);
          }
          drawWispBetween(ctx, leftEye, ms, now, WISP_SIZE * EYE, 1, 0, endAt);
          drawWispBetween(ctx, rightEye, ms, now, WISP_SIZE * EYE, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
