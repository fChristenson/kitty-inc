// the "Sunbeams" event (beam; worker perma tiers): it covers its crit, whose
// click freezes the screen while shafts of sunlight break through the top of
// the screen one after another, slanting down, each flickering in as a thin
// ray, then blazing full onto a worker in view, who lights up in a flash, a
// bang and a jolt and climbs a perma tier, the rays swaying as they stand;
// the last breaks through in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "sunbeams";
const MAX_WORKERS = 6;
// rays slant SLANT px across from above the screen, SWAY px either way
const SLANT = 160;
const SWAY = 18;
const RAY = 46;
const FLARE = 36;
const HIT_SHAKE: [number, number] = [0.5, 1.3];

export const forceSunbeamsEvent = registerWispEvent(
  KEY,
  "Sunbeams",
  () => CONFIG.sunbeamsEvent.chance,
  (floor, context, area) => {
    const { aimMs, gapsMs, holdMs, mergeMs } = CONFIG.sunbeamsEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const slant = Math.random() < 0.5 ? SLANT : -SLANT;
    let clock = 0;
    const rays = workers.map((worker, k) => {
      const appears = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      return {
        worker,
        top: { x: worker.at.x - slant, y: area.top - 20 } as Point,
        appears,
        blazes: appears + aimMs,
        phase: Math.random() * Math.PI * 2,
      };
    });
    const last = rays[rays.length - 1];
    const endAt = last.blazes;
    const top: Point = { x: 0, y: 0 };

    const blazing = createBeats(
      rays,
      (r) => r.blazes,
      (r, k) => {
        cover!.promote(r.worker);
        if (r === last) {
          cover!.blast(r.worker.at);
          return;
        }
        cover!.burst(r.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, rays.length - 1)));
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
        tick: (ms, now) => blazing.tick(ms, now),
        drawUnder: (ctx, ms, now) => {
          if (ms > endAt + 400) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 400 : 1;
          for (const r of rays) {
            if (ms < r.appears) continue;
            top.x = r.top.x + Math.sin(ms / 400 + r.phase) * SWAY;
            top.y = r.top.y;
            if (ms < r.blazes) {
              drawAimLaser(ctx, top, r.worker.at);
              continue;
            }
            const pop = clamp01((ms - r.blazes) / 150);
            drawBeam(
              ctx,
              top,
              r.worker.at,
              RAY * (0.5 + 0.5 * pop),
              0.45 * fade,
            );
            drawBeamFlare(
              ctx,
              r.worker.at,
              FLARE * (1.4 - 0.4 * pop) * fade,
              fade,
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
