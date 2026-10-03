// the "Gyre" event (wisp; worker perma tiers): it covers its crit, whose
// click freezes the screen while three wisps drop from the top of the
// screen in a tight spiral, a corkscrew of glitter narrowing as it falls,
// and screw down onto a worker with a bang and a jolt as it climbs a perma
// tier; the next gyre drops onto the next worker, faster each time, the
// last landing in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardWorkers } from "../eventRewards";

const KEY = "gyre";
const MAX_WORKERS = 5;
const STRANDS = 3;
const TURNS = 3;
const WIDE = 150;
const SQUASH = 0.35;
const WISP = 0.4;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceGyreEvent = registerWispEvent(
  KEY,
  "Gyre",
  () => CONFIG.gyreEvent.chance,
  (floor, context, area) => {
    const { dropsMs, overlap, holdMs, mergeMs } = CONFIG.gyreEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    let clock = 0;
    const gyres = workers.map((worker, k) => {
      const span = lerp(dropsMs, k / Math.max(1, workers.length - 1));
      const starts = clock;
      clock += span * overlap;
      const lands = starts + span;
      const wisps = Array.from({ length: STRANDS }, (_, s) => {
        const at: Point = { x: 0, y: 0 };
        return (ms: number): Point => {
          const u = easeIn(clamp01((ms - starts) / span));
          const a = u * TURNS * Math.PI * 2 + (s / STRANDS) * Math.PI * 2;
          const r = WIDE * (1 - u);
          at.x = worker.at.x + Math.cos(a) * r;
          at.y = lerp([area.top, worker.at.y], u) + Math.sin(a) * r * SQUASH;
          return at;
        };
      });
      return { worker, starts, lands, wisps };
    });
    const last = gyres[gyres.length - 1];
    const endAt = Math.max(...gyres.map((g) => g.lands));

    const landing = createBeats(
      gyres,
      (g) => g.lands,
      (g, k) => {
        cover!.promote(g.worker);
        if (g === last) {
          cover!.blast(g.worker.at);
          return;
        }
        cover!.burst(g.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, gyres.length - 1)));
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
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          for (const g of gyres)
            for (const w of g.wisps)
              drawWispBetween(
                ctx,
                w,
                ms,
                now,
                WISP_SIZE * WISP,
                0.6,
                g.starts,
                g.lands,
              );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
