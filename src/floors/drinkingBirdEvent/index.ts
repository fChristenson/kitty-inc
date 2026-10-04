// the "Drinking Bird" event (mix; worker perma tiers and cash): it covers
// its crit, whose click freezes the screen while a river of cash pours out
// of the screen's side and winds across just over the workers' heads, and a
// bird wisp perches high over every worker; each bird bobs down to sip from
// the river and springs back up, dipping faster and faster, until it
// plunges all the way down onto its worker in a flash and a jolt that
// lights it up a perma tier, the last in a huge blast and shake. Pays floor
// income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { alongRoute } from "../../shared/curves";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";
import { pourLine, sampleLine, type Pour } from "../cashFlow";

const KEY = "drinkingBird";
const REWARD = 2;
const MAX_WORKERS = 6;
const RIVER = 60;
const PERCH = 170;
const DIPS = 3;
const DIP_MS = 160;
const PLUNGE_MS = 140;
const BIRD = 0.45;
const SIP_SHAKE = 0.25;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Bird {
  worker: RewardWorker;
  perch: Point;
  sip: Point;
  dips: number[];
  hits: number;
  at: (ms: number) => Point;
}

export const forceDrinkingBirdEvent = registerWispEvent(
  KEY,
  "Drinking Bird",
  () => CONFIG.drinkingBirdEvent.chance,
  (floor, context, area) => {
    const { pourMs, dipsMs, staggerMs, holdMs, mergeMs } =
      CONFIG.drinkingBirdEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const sips = workers.map((w) => ({ x: w.at.x, y: w.at.y - RIVER }));
    const route: Point[] = [
      { x: area.left - 40, y: sips[0].y },
      ...sips,
      { x: area.right + 40, y: sips[sips.length - 1].y },
    ];
    const into: Point = { x: 0, y: 0 };
    const river = sampleLine((u) => ({ ...alongRoute(route, u, into) }), 60);
    const birds: Bird[] = workers.map((worker, k) => {
      const perch: Point = { x: worker.at.x, y: worker.at.y - PERCH };
      let clock = pourMs + k * staggerMs;
      const dips = Array.from({ length: DIPS }, (_, j) => {
        clock += lerp(dipsMs, j / (DIPS - 1));
        return clock;
      });
      const hits = clock + PLUNGE_MS + lerp(dipsMs, 1) * 0.5;
      const spot: Point = { x: perch.x, y: perch.y };
      return {
        worker,
        perch,
        sip: sips[k],
        dips,
        hits,
        // a quick dip down to the river at each sip, then the plunge
        at: (ms) => {
          let dip = 0;
          for (const d of dips) {
            const t = Math.abs(ms - d) / DIP_MS;
            if (t < 1) dip = Math.max(dip, 1 - t * t);
          }
          const plunge = easeIn(clamp01((ms - (hits - PLUNGE_MS)) / PLUNGE_MS));
          spot.y =
            lerp([perch.y, sips[k].y], dip) * (1 - plunge) +
            worker.at.y * plunge;
          spot.x = perch.x + Math.sin(ms * 0.01 + k) * 4 * (1 - plunge);
          return spot;
        },
      };
    });
    const last = birds.reduce((a, b) => (b.hits > a.hits ? b : a));
    const endAt = last.hits;
    const pour: Pour = {
      coinsAlong: 170,
      width: 26,
      streamMs: Math.max(300, endAt - 200),
      travelMs: 700,
    };
    const allDips = birds.flatMap((b) => b.dips);

    const pouring = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, river, pour),
    );
    let sipped = -Infinity;
    const sipping = createBeats(
      allDips,
      (ms) => ms,
      (ms) => {
        if (ms - sipped < 60 || !cover!.isLive()) return;
        sipped = ms;
        playBloop();
        shakeScreen(SIP_SHAKE);
      },
    );
    const plunging = createBeats(
      birds.slice().sort((a, b) => a.hits - b.hits),
      (b) => b.hits,
      (b, k) => {
        cover!.promote(b.worker);
        if (b === last) {
          cover!.blast(b.worker.at);
          return;
        }
        cover!.burst(b.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, birds.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(endAt, pour.streamMs + pour.travelMs) + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        workers,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          sipping.tick(ms, now);
          plunging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const b of birds)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BIRD,
              0.8,
              0,
              b.hits,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
