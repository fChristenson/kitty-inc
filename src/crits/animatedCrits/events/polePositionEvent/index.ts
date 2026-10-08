// the "Pole Position" event (race; a free floor): it covers its crit, whose
// click freezes the screen while two racer wisps scream in off the screen's
// left edge on a flying lap, one hard on the other's tail, flat out along
// under the next locked floor's lock; they brake hard into a hairpin round
// its far side, a screech and a jolt, crawl round it, power out flat out
// back along over it, then dive down onto it: the leader slams in with a
// big blast, the chaser with a huge one, and the lock bursts open, the
// floor unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { lerp } from "../../../../shared/easing";
import { planRace } from "../../../../shared/race";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/explosion";
import { measure } from "../../cashFlow";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "polePosition";
// the hairpin's radius round the lock, and how far past it it's centred
const R = 150;
const PAST = 120;
const CORNER = 0.3;
const FINISH = 1.3;
const BRAKING = 0.35;
const ENTRY = 80;
const STRAIGHT_STEP = 24;
const TURN_STEPS = 24;
const DIVE_STEPS = 40;
// px it powers out back over the lock before diving onto it
const EXIT = 60;
const DIVE_RISE = 40;
const WISP = 0.04;
const BEAT_SHAKE = [0.5, 1.1];
const FIRST_BLAST = 320;
const FIRST_SHAKE = 1.8;

export const forcePolePositionEvent = registerWispEvent(
  KEY,
  "Pole Position",
  () => CONFIG.polePositionEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, holdMs, mergeMs } = CONFIG.polePositionEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const width = area.right - area.left;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const c: Point = { x: lock.x + PAST, y: lock.y };
    const line: Point[] = [];
    const straight = (a: Point, b: Point) => {
      const n = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / STRAIGHT_STEP),
      );
      for (let i = line.length ? 1 : 0; i <= n; i++)
        line.push({ x: lerp([a.x, b.x], i / n), y: lerp([a.y, b.y], i / n) });
    };
    // in under the lock, round its far side from below to above
    straight({ x: area.left - ENTRY, y: c.y + R }, { x: c.x, y: c.y + R });
    const turnFrom = line.length - 1;
    for (let i = 1; i <= TURN_STEPS; i++) {
      const a = Math.PI / 2 - (Math.PI * i) / TURN_STEPS;
      line.push({ x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R });
    }
    const turnTo = line.length - 1;
    const out: Point = { x: c.x - EXIT, y: c.y - R };
    straight(line[turnTo], out);
    const lead: Point = { x: lock.x, y: out.y - DIVE_RISE };
    for (let i = 1; i <= DIVE_STEPS; i++)
      line.push(bezier(out, lead, lock, i / DIVE_STEPS, { x: 0, y: 0 }));
    const along = measure(line);
    const race = planRace(
      line,
      raceMs,
      [{ from: along[turnFrom], to: along[turnTo] }],
      { corner: CORNER, finish: FINISH, braking: BRAKING },
    );
    const arrivals = [raceMs, raceMs + gapMs];
    const spots = arrivals.map(() => ({ x: 0, y: 0 }));
    const ats = arrivals.map(
      (arrives, racer) =>
        (ms: number): Point | null =>
          ms < racer * gapMs || ms > arrives
            ? null
            : race.at(ms - racer * gapMs, spots[racer]),
    );
    const size = Math.max(WISP_SIZE, width * WISP);

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
        if (racer === 1) {
          cover!.blast(lock);
          return;
        }
        cover!.burst(lock, 0.8);
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
        onEnd: () => context.unlockFloorFree?.(locked.floor),
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
          drawDetonation(ctx, lock, ms - arrivals[0], FIRST_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
