// the "Footlights" event (beam; worker perma tiers): it covers its crit,
// whose click freezes the screen while a row of footlight wisps lights up
// along the bottom of the screen; the two nearest a worker flicker aim lines
// up at it, then blaze crossing beams onto it that swell until the worker
// climbs a perma tier with a flare, a bang and a jolt; cue after cue down the
// line, quicker each time, and on the last every footlight fires on the
// final worker in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "footlights";
const MAX_WORKERS = 5;
const LIGHTS = 5;
const EDGE = 70;
const FLOOR_GAP = 40;
const AIM = 0.45;
const WIDTH = 18;
const FLARE_MS = 200;
const LIGHT = 0.4;
const CUE_SHAKE: [number, number] = [0.6, 1.3];

interface Cue {
  worker: RewardWorker;
  lights: Point[];
  starts: number;
  fires: number;
  ends: number;
  final: boolean;
}

export const forceFootlightsEvent = registerWispEvent(
  KEY,
  "Footlights",
  () => CONFIG.footlightsEvent.chance,
  (floor, context, area) => {
    const { cuesMs, holdMs, mergeMs } = CONFIG.footlightsEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const lights: Point[] = Array.from({ length: LIGHTS }, (_, i) => ({
      x: lerp([area.left + EDGE, area.right - EDGE], i / (LIGHTS - 1)),
      y: area.bottom - FLOOR_GAP,
    }));
    let clock = 0;
    const cues: Cue[] = workers.map((worker, k) => {
      const span = lerp(cuesMs, k / Math.max(1, workers.length - 1));
      const starts = clock;
      clock += span;
      const final = k === workers.length - 1;
      const nearest = [...lights]
        .sort(
          (a, b) => Math.abs(a.x - worker.at.x) - Math.abs(b.x - worker.at.x),
        )
        .slice(0, 2);
      return {
        worker,
        lights: final ? lights : nearest,
        starts,
        fires: starts + span * AIM,
        ends: clock,
        final,
      };
    });
    const endAt = clock;

    const cueing = createBeats(
      cues,
      (c) => c.ends,
      (c, k) => {
        cover!.promote(c.worker);
        if (c.final) {
          cover!.blast(c.worker.at);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(c.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CUE_SHAKE, k / Math.max(1, cues.length - 1)));
      },
    );

    const lamps = lights.map((spot) => (): Point => spot);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => cueing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLARE_MS) return;
          for (const c of cues) {
            if (ms < c.starts || ms > c.ends + FLARE_MS) continue;
            if (ms < c.fires) {
              for (const light of c.lights)
                drawAimLaser(ctx, light, c.worker.at);
              continue;
            }
            const swell = clamp01((ms - c.fires) / (c.ends - c.fires));
            const fade = 1 - clamp01((ms - c.ends) / FLARE_MS);
            for (const light of c.lights)
              drawBeam(ctx, light, c.worker.at, WIDTH * (0.5 + swell), fade);
            if (ms >= c.ends)
              drawBeamFlare(ctx, c.worker.at, 70 * fade, 1, now);
          }
          for (const lamp of lamps)
            drawWispBetween(
              ctx,
              lamp,
              ms,
              now,
              WISP_SIZE * LIGHT,
              0.8,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
