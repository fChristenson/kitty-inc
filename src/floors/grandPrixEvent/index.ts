// the "Grand Prix" event (race; worker perma tiers): it covers its crit,
// whose click freezes the screen while two racer wisps scream in off the
// right edge, one hard on the other's tail, flat out over the clicked
// floor's workers' heads; they brake hard into a hairpin round the leftmost
// worker, a screech and a jolt, crawl round it and power out flat out under
// the workers, then swoop onto two workers: the leader slams into one in a
// big blast, the chaser into the next in a huge one, each lighting up a
// perma tier. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, lerp } from "../../shared/easing";
import { planRace } from "../../shared/race";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation } from "../../shared/explosion";
import { measure } from "../cashFlow";
import {
  findRewardWorkers,
  type RewardWorker,
} from "../eventRewards";
import type { Floor } from "../../gameState";
import type { EventProcContext } from "../eventProcs";

const KEY = "grandPrix";
// the hairpin's radius round the worker, a little wider than a worker
const R = 95;
const CORNER = 0.3;
const FINISH = 1.3;
const BRAKING = 0.35;
const ENTRY = 80;
const STRAIGHT_STEP = 24;
const TURN_STEPS = 24;
const DIVE_STEPS = 36;
// share of the screen's width it powers out under the workers before diving
const EXIT = 0.35;
const DIVE_LEAD = 180;
const WISP = 0.04;
const BEAT_SHAKE = [0.5, 1.1];
const FIRST_BLAST = 320;
const FIRST_SHAKE = 1.8;

// the clicked floor's workers, left to right, to race round
function landmarks(floor: Floor, context: EventProcContext): RewardWorker[] {
  return findRewardWorkers(floor, context, true)
    .filter((w) => w.worker.floor === floor)
    .sort((a, b) => a.at.x - b.at.x);
}

export const forceGrandPrixEvent = registerWispEvent(
  KEY,
  "Grand Prix",
  () => CONFIG.grandPrixEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, holdMs, mergeMs } = CONFIG.grandPrixEvent;
    const corner = landmarks(floor, context)[0];
    const rewards = findRewardWorkers(floor, context);
    if (!corner || rewards.length === 0) return;
    const width = area.right - area.left;
    const c = corner.at;

    const line: Point[] = [];
    const straight = (a: Point, b: Point) => {
      const n = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / STRAIGHT_STEP),
      );
      for (let i = line.length ? 1 : 0; i <= n; i++)
        line.push({ x: lerp([a.x, b.x], i / n), y: lerp([a.y, b.y], i / n) });
    };
    // over their heads leftwards, down round the worker's far side...
    straight({ x: area.right + ENTRY, y: c.y - R }, { x: c.x, y: c.y - R });
    const turnFrom = line.length - 1;
    for (let i = 1; i <= TURN_STEPS; i++) {
      const a = -Math.PI / 2 - (Math.PI * i) / TURN_STEPS;
      line.push({ x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R });
    }
    const turnTo = line.length - 1;
    // ...and flat out back under them, then onto the nearest workers
    const out: Point = {
      x: Math.min(area.right - 60, c.x + width * EXIT),
      y: c.y + R,
    };
    straight(line[turnTo], out);
    const diveFrom = line.length - 1;
    const near = [...rewards].sort(
      (a, b) =>
        Math.hypot(a.at.x - out.x, a.at.y - out.y) -
        Math.hypot(b.at.x - out.x, b.at.y - out.y),
    );
    const targets = [near[0], near[1] ?? near[0]];
    const lead: Point = { x: out.x + DIVE_LEAD, y: out.y };
    for (let i = 1; i <= DIVE_STEPS; i++)
      line.push(bezier(out, lead, targets[0].at, i / DIVE_STEPS, { x: 0, y: 0 }));
    const along = measure(line);
    const race = planRace(
      line,
      raceMs,
      [{ from: along[turnFrom], to: along[turnTo] }],
      { corner: CORNER, finish: FINISH, braking: BRAKING },
    );
    // the chaser peels off from the same dive point for its own worker
    const diveMs = race.msAt(along[diveFrom]);
    const arrivals = [raceMs, raceMs + gapMs];
    const spots = arrivals.map(() => ({ x: 0, y: 0 }));
    const ats = arrivals.map((arrives, racer) => (ms: number): Point | null => {
      if (ms < 0 || ms > arrives) return null;
      const t = ms - racer * gapMs;
      if (racer === 0 || t < diveMs) return race.at(t, spots[racer]);
      const u = clamp01((t - diveMs) / (raceMs - diveMs));
      return bezier(out, lead, targets[1].at, u * (0.6 + 0.4 * u), spots[racer]);
    });
    const size = Math.max(WISP_SIZE, width * WISP);

    // braking into the hairpin and its apex, for both
    const beats: { ms: number; k: number; leader: boolean }[] = [];
    [
      along[turnFrom] * (1 - BRAKING),
      (along[turnFrom] + along[turnTo]) / 2,
    ].forEach((s, k) => {
      const ms = race.msAt(s);
      arrivals.forEach((_, racer) =>
        beats.push({ ms: ms + racer * gapMs, k, leader: racer === 0 }),
      );
    });
    const cornering = createBeats(
      beats,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive()) return;
        if (b.leader && b.k === 0) playSwoosh();
        shakeScreen(BEAT_SHAKE[b.k]);
      },
    );
    const finishing = createBeats(
      arrivals,
      (ms) => ms,
      (_, racer) => {
        const target = targets[racer];
        cover!.promote(target);
        if (racer === 1) {
          cover!.blast(target.at, 0);
          return;
        }
        cover!.burst(target.at, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FIRST_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: arrivals[1] + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers: [...new Set(targets)],
        tick: (ms, now) => {
          cornering.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (let racer = 0; racer < ats.length; racer++)
            drawWispBetween(
              ctx,
              ats[racer],
              ms,
              now,
              size,
              0.6,
              racer * gapMs,
              arrivals[racer],
            );
          drawDetonation(ctx, targets[0].at, ms - arrivals[0], FIRST_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    landmarks(floor, context).length > 0 &&
    findRewardWorkers(floor, context).length > 0,
);
