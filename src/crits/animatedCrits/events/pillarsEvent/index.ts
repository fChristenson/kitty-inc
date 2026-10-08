// the "Pillars" event (beam; worker perma tiers): it covers its crit, whose
// click freezes the screen while pillars of light slam down out of the sky
// onto the workers one after another, each first a flickering aim line,
// then a wide blazing beam thumping down onto its worker with a flare at its
// base, a bang and a jolt as the worker climbs a perma tier, each quicker;
// then every pillar widens together into a blinding blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "pillars";
const MAX_WORKERS = 5;
// the sky the pillars fall from, above the screen's top
const SKY = 60;
const WIDTH = 54;
const WIDEN = 4;
const FLARE = 44;
const STAY_ALPHA = 0.75;
const SLAM_SHAKE: [number, number] = [0.7, 1.3];

export const forcePillarsEvent = registerWispEvent(
  KEY,
  "Pillars",
  () => CONFIG.pillarsEvent.chance,
  (floor, context, area) => {
    const { aimsMs, dropMs, blazeMs, holdMs, mergeMs } = CONFIG.pillarsEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const n = workers.length;
    let clock = 0;
    const pillars = workers.map((worker, k) => {
      const t = k / Math.max(1, n - 1);
      const aims = clock;
      const drops = aims + lerp(aimsMs, t);
      const lands = drops + dropMs;
      clock = drops;
      return {
        worker,
        t,
        aims,
        drops,
        lands,
        sky: { x: worker.at.x, y: area.top - SKY } as Point,
        base: worker.at,
        tip: { x: worker.at.x, y: 0 } as Point,
      };
    });
    const blazes = pillars[n - 1].lands + 120;
    const endAt = blazes + blazeMs;

    const landing = createBeats(
      pillars,
      (p) => p.lands,
      (p) => {
        cover!.promote(p.worker);
        cover!.burst(p.base, 0.5 + 0.3 * p.t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SLAM_SHAKE, p.t));
      },
    );
    const blazing = createBeats(
      [blazes],
      (ms) => ms,
      () => {
        for (const p of pillars) cover!.burst(p.base, 1);
        cover!.blast(pillars[Math.floor(n / 2)].base);
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
          landing.tick(ms, now);
          blazing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const blaze = clamp01((ms - blazes) / blazeMs);
          const wide = 1 + WIDEN * easeOut(blaze);
          const fade = 1 - easeIn(blaze);
          for (const p of pillars) {
            if (ms < p.aims) continue;
            if (ms < p.drops) {
              drawAimLaser(ctx, p.sky, p.base);
              continue;
            }
            const drop = easeIn(clamp01((ms - p.drops) / dropMs));
            p.tip.y = lerp([p.sky.y, p.base.y], drop);
            // a fresh pillar blazes, then settles to a steady glow
            const fresh = 1 - clamp01((ms - p.lands) / 200);
            const alpha =
              ms < blazes ? STAY_ALPHA + (1 - STAY_ALPHA) * fresh : fade;
            const width = WIDTH * (1 + 0.4 * fresh) * wide;
            drawBeam(ctx, p.sky, p.tip, width, alpha);
            if (ms >= p.lands)
              drawBeamFlare(
                ctx,
                p.base,
                FLARE * (1 + 0.6 * fresh) * wide,
                alpha,
                now,
              );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
