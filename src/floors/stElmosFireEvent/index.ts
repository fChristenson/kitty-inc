// the "St. Elmo's Fire" event (lightning; worker perma tiers): it covers its
// crit, whose click freezes the screen while a crackling crown of lightning
// flickers up round a worker, little bolts crawling round and round them,
// fizzing ever brighter, until a bolt cracks down out of the sky onto them
// in a blinding flash and a big jolt and they climb a perma tier; the fire
// leaps from worker to worker, each catching quicker, the last strike a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import type { Point } from "../../shared/wisp";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../shared/lightning";
import { findRewardWorkers } from "../eventRewards";

const KEY = "stElmosFire";
const MAX_WORKERS = 6;
// ARCS little bolts crawl round each worker, RING px out, at SPIN turns a ms
const ARCS = 3;
const RING = 42;
const SPIN = 0.003;
const ARC_SCALE = 0.35;
const STRIKE_MS = 220;
const STRIKE_SCALE = 1.3;
const STRIKE_SHAKE: [number, number] = [0.7, 1.4];

export const forceStElmosFireEvent = registerWispEvent(
  KEY,
  "St. Elmo's Fire",
  () => CONFIG.stElmosFireEvent.chance,
  (floor, context, area) => {
    const { coronaMs, gapsMs, holdMs, mergeMs } = CONFIG.stElmosFireEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock = 0;
    const fires = workers.map((worker, k) => {
      const lights = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      const ends = Array.from({ length: ARCS * 2 }, () => ({ x: 0, y: 0 }));
      const arcs: Bolt[] = Array.from({ length: ARCS }, (_, i) =>
        createBolt(ends[i * 2], ends[i * 2 + 1], 0),
      );
      const sky: Point = {
        x: worker.at.x + (Math.random() - 0.5) * 120,
        y: area.top,
      };
      return {
        worker,
        lights,
        strikes: lights + coronaMs,
        ends,
        arcs,
        strike: createBolt(sky, worker.at, 2),
      };
    });
    const last = fires[fires.length - 1];
    const endAt = last.strikes;

    const striking = createBeats(
      fires,
      (f) => f.strikes,
      (f, k) => {
        cover!.promote(f.worker);
        if (f === last) {
          cover!.blast(f.worker.at);
          return;
        }
        cover!.burst(f.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, fires.length - 1)));
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
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + STRIKE_MS) return;
          for (const f of fires) {
            if (ms < f.lights) continue;
            if (ms < f.strikes) {
              const build = clamp01((ms - f.lights) / coronaMs);
              for (let i = 0; i < ARCS; i++) {
                const a = ms * SPIN * Math.PI * 2 + (i / ARCS) * Math.PI * 2;
                const span = 0.8 + build;
                f.ends[i * 2].x = f.worker.at.x + Math.cos(a) * RING;
                f.ends[i * 2].y = f.worker.at.y + Math.sin(a) * RING;
                f.ends[i * 2 + 1].x = f.worker.at.x + Math.cos(a + span) * RING;
                f.ends[i * 2 + 1].y = f.worker.at.y + Math.sin(a + span) * RING;
                drawBolt(ctx, f.arcs[i], 0.4 + 0.6 * build, ARC_SCALE);
              }
              continue;
            }
            const t = (ms - f.strikes) / STRIKE_MS;
            if (t >= 1) continue;
            drawBolt(ctx, f.strike, 1 - t, STRIKE_SCALE);
            drawStrike(ctx, f.worker.at, 1 - t, 1.2, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
