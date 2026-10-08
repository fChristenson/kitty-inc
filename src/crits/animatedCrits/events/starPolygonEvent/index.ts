// the "Star Polygon" event (beam; worker perma tiers): it covers its crit,
// whose click freezes the screen while seven points of light ring a worker
// and a beam tip races from point to point, skipping two each time, drawing
// a seven-pointed star of blazing beams round it, every corner a flare; as
// the star closes it flashes white and the worker lights up a perma tier
// with a jolt, then the next worker gets its star, quicker each time, the
// last closing in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "starPolygon";
const MAX_WORKERS = 5;
const POINTS = 7;
const SKIP = 3;
const RADIUS = 80;
const BEAM_W = 8;
const FLASH_MS = 200;
const CORNER_MS = 160;
const CORNER_GAP_MS = 45;
const HIT_SHAKE: [number, number] = [0.5, 1.2];

interface Star {
  worker: RewardWorker;
  corners: Point[];
  edges: number[];
  closes: number;
}

export const forceStarPolygonEvent = registerWispEvent(
  KEY,
  "Star Polygon",
  () => CONFIG.starPolygonEvent.chance,
  (floor, context) => {
    const { edgesMs, overlap, holdMs, mergeMs } = CONFIG.starPolygonEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock = 0;
    const stars: Star[] = workers.map((worker, k) => {
      const turn = -Math.PI / 2 + Math.random() * 0.4;
      // the corners in drawing order, skipping round the ring
      const corners = Array.from({ length: POINTS + 1 }, (_, i) => {
        const a = turn + (((i * SKIP) % POINTS) / POINTS) * Math.PI * 2;
        return {
          x: worker.at.x + Math.cos(a) * RADIUS,
          y: worker.at.y + Math.sin(a) * RADIUS,
        };
      });
      const edgeMs = lerp(edgesMs, k / Math.max(1, workers.length - 1));
      const starts = clock;
      const edges = Array.from(
        { length: POINTS },
        (_, e) => starts + (e + 1) * edgeMs,
      );
      const closes = edges[POINTS - 1];
      clock = starts + (closes - starts) * overlap;
      return { worker, corners, edges, closes };
    });
    const last = stars.reduce((a, b) => (b.closes > a.closes ? b : a));
    const endAt = last.closes + FLASH_MS;
    const corners = stars.flatMap((s) =>
      s.edges.slice(0, -1).map((ms) => ({ s, ms })),
    );
    const tip: Point = { x: 0, y: 0 };

    let pinged = -Infinity;
    const cornering = createBeats(
      corners,
      (c) => c.ms,
      (c) => {
        if (c.ms - pinged < CORNER_GAP_MS || !cover!.isLive()) return;
        pinged = c.ms;
        playBloop();
      },
    );
    const closing = createBeats(
      stars.slice().sort((a, b) => a.closes - b.closes),
      (s) => s.closes,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, stars.length - 1)));
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
          cornering.tick(ms, now);
          closing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const s of stars) {
            const starts = s.edges[0] - (s.edges[1] - s.edges[0]);
            if (ms < starts || ms > s.closes + FLASH_MS) continue;
            const flash = clamp01((ms - s.closes) / FLASH_MS);
            const width = BEAM_W * (1 + 2 * Math.sin(Math.PI * flash));
            const alpha = ms > s.closes ? 1 - flash : 1;
            for (let e = 0; e < POINTS; e++) {
              const ends = s.edges[e];
              const from = e === 0 ? starts : s.edges[e - 1];
              if (ms < from) break;
              const u = clamp01((ms - from) / (ends - from));
              const a = s.corners[e];
              const b = s.corners[e + 1];
              tip.x = lerp([a.x, b.x], u);
              tip.y = lerp([a.y, b.y], u);
              drawBeam(ctx, a, tip, width, alpha);
              const t = (ms - ends) / CORNER_MS;
              if (t >= 0 && t < 1) drawBeamFlare(ctx, b, 16, 1 - t, now);
              if (u < 1) drawBeamFlare(ctx, tip, 10, 1, now);
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
