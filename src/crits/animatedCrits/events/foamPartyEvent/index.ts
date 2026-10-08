// the "Foam Party" event (spray; worker perma tiers): it covers its crit,
// whose click freezes the screen while two foam-cannon wisps swoop in on
// either side of a worker and blast it from both sides with crossing cones
// of glittering gold foam; the worker foams up thicker and brighter, a jolt
// as it's half covered, until it's coated head to toe, flashes white and
// lights up a perma tier; then the cannons swoop on to the next worker,
// quicker each time, the last coat going off in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/spray";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "foamParty";
const MAX_WORKERS = 4;
const SIDE = 250;
const BELOW = 50;
const GLIDE_MS = 160;
const FLIGHT_MS = 300;
const FLASH_MS = 200;
// aimed this share of the reach above the worker, so the foam's droop lands on it
const LOFT = 0.3;
const SPREAD = 0.2;
const COAT_W = 110;
const COAT_H = 170;
const CANNON = 0.45;
const DROPLET = WISP_SIZE * 0.6;
const HALF_SHAKE = 0.35;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Soak {
  worker: RewardWorker;
  // where the left and right cannons park
  spots: [Point, Point];
  arrives: number;
  coats: number;
  sprays: [Spray, Spray];
}

export const forceFoamPartyEvent = registerWispEvent(
  KEY,
  "Foam Party",
  () => CONFIG.foamPartyEvent.chance,
  (floor, context, area) => {
    const { coatsMs, holdMs, mergeMs } = CONFIG.foamPartyEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const parks = (x: number, y: number): Point => ({
      x: Math.max(area.left + 30, Math.min(area.right - 30, x)),
      y: Math.min(area.bottom - 30, y),
    });
    const cannons: ((ms: number) => Point)[] = [];
    let clock = GLIDE_MS;
    const soaks: Soak[] = workers.map((worker, k) => {
      const { x, y } = worker.at;
      const spots: [Point, Point] = [
        parks(x - SIDE, y + BELOW),
        parks(x + SIDE, y + BELOW),
      ];
      const arrives = clock;
      const coats =
        arrives + lerp(coatsMs, k / Math.max(1, workers.length - 1));
      clock = coats + GLIDE_MS;
      const sprays = [0, 1].map((side) => {
        const from = spots[side];
        const reach = Math.hypot(x - from.x, y - from.y);
        return planSpray(
          (ms) => cannons[side](ms),
          Math.atan2(y - reach * LOFT - from.y, x - from.x),
          {
            startMs: arrives,
            endMs: coats,
            reach,
            spread: SPREAD,
            flightMs: FLIGHT_MS,
          },
        );
      }) as [Spray, Spray];
      return { worker, spots, arrives, coats, sprays };
    });
    const last = soaks[soaks.length - 1];
    const endAt = last.coats + FLASH_MS;
    // each cannon swoops up from below the screen, then from soak to soak
    for (const side of [0, 1]) {
      const spot: Point = { x: 0, y: 0 };
      const start: Point = {
        x: side ? area.right + 40 : area.left - 40,
        y: area.bottom + 40,
      };
      cannons.push((ms) => {
        let from = start;
        let leaves = 0;
        for (const s of soaks) {
          const to = s.spots[side];
          if (ms < s.arrives) {
            const u = smoothstep(clamp01((ms - leaves) / (s.arrives - leaves)));
            spot.x = lerp([from.x, to.x], u);
            spot.y = lerp([from.y, to.y], u);
            return spot;
          }
          if (ms < s.coats) return to;
          from = to;
          leaves = s.coats;
        }
        return last.spots[side];
      });
    }

    const halfway = createBeats(
      soaks,
      (s) => (s.arrives + FLIGHT_MS + s.coats) / 2,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(HALF_SHAKE);
      },
    );
    const coating = createBeats(
      soaks,
      (s) => s.coats,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, soaks.length - 1)));
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
          halfway.tick(ms, now);
          coating.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const s of soaks) {
            if (ms < s.arrives || ms > s.coats + FLASH_MS) continue;
            const lands = s.arrives + FLIGHT_MS * 0.6;
            const coverage = clamp01((ms - lands) / (s.coats - lands));
            const flash = ms > s.coats ? 1 - (ms - s.coats) / FLASH_MS : 0;
            drawSprayCoat(ctx, s.worker.at, COAT_W, COAT_H, coverage, flash);
            if (ms > s.coats) continue;
            for (const spray of s.sprays)
              drawSpray(ctx, spray, ms, now, DROPLET);
            drawSprayMist(ctx, s.worker.at, ms - lands, 1, DROPLET * 1.4, now);
          }
          for (const cannon of cannons)
            drawWispBetween(
              ctx,
              cannon,
              ms,
              now,
              WISP_SIZE * CANNON,
              0.8,
              0,
              last.coats,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
