// the "Tandem Drift" event (race; worker perma tiers): it covers its crit,
// whose click freezes the screen while two racers scream in from below the
// screen nose to tail and drift round the workers one after another: flat
// out down each straight, braking hard, then sliding sideways round a
// worker in a hairpin, tails hung out and glitter smoke pouring off the back,
// the chaser a beat behind on the same line; each worker they slide round
// climbs a perma tier with a screech and a jolt; out of the last bend they
// slam into the last worker, the leader in a big burst and the chaser right
// after in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawGlitterLight,
  drawWispHead,
  drawWispTrail,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { planRace, type RaceCorner } from "../../shared/race";
import { hash01 } from "../../shared/twinkle";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "tandemDrift";
const MAX_CORNERS = 4;
// the hairpin's radius round a worker, and how far apart corners must be
const RADIUS = 120;
const SPACING = RADIUS * 2.6;
const SAMPLE = 10;
// a racer is two wisp heads CAR apart; in a bend its tail swings out by up
// to DRIFT rad, easing in DRIFT_IN ms before the bend and out after it
const CAR = 46;
const HEAD = WISP_SIZE * 0.75;
const TAIL = WISP_SIZE * 0.55;
const DRIFT = 0.9;
const DRIFT_IN = 80;
const DRIFT_OUT = 160;
// glitter smoke off the tail: puffs every SMOKE_MS back over SMOKE puffs
const SMOKE = 14;
const SMOKE_MS = 22;
const SMOKE_RISE = 0.12;
const SMOKE_SIZE = 9;
const CORNER_SHAKE: [number, number] = [0.4, 0.8];
const FINISH_SHAKE = 1.4;

interface Bend {
  worker: RewardWorker;
  turn: number;
  corner: RaceCorner;
  // when each racer brakes into it, and its apex
  brakeMs: number;
  enterMs: number;
  apexMs: number;
  exitMs: number;
}

export const forceTandemDriftEvent = registerWispEvent(
  KEY,
  "Tandem Drift",
  () => CONFIG.tandemDriftEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, holdMs, mergeMs } = CONFIG.tandemDriftEvent;
    const workers = findRewardWorkers(floor, context);
    if (workers.length < 2) return;
    const button = getButtonCenter(context.isGroundFloor);

    // the course: from the button, the nearest worker clear of the last
    // each time; the last one picked is the finish
    const course: RewardWorker[] = [];
    let from: Point = button;
    const left = [...workers];
    while (left.length > 0 && course.length <= MAX_CORNERS) {
      left.sort(
        (a, b) =>
          Math.hypot(a.at.x - from.x, a.at.y - from.y) -
          Math.hypot(b.at.x - from.x, b.at.y - from.y),
      );
      const k = left.findIndex(
        (w) => Math.hypot(w.at.x - from.x, w.at.y - from.y) > SPACING,
      );
      if (k < 0) break;
      const [next] = left.splice(k, 1);
      course.push(next);
      from = next.at;
    }
    if (course.length < 2) return;
    const finish = course[course.length - 1];
    const turns = course.slice(0, -1);

    // the line: straights tangent to a hairpin round each corner's worker
    const line: Point[] = [];
    const corners: RaceCorner[] = [];
    let length = 0;
    const push = (p: Point) => {
      const prev = line[line.length - 1];
      if (prev) length += Math.hypot(p.x - prev.x, p.y - prev.y);
      line.push(p);
    };
    const straight = (a: Point, b: Point) => {
      const n = Math.max(
        1,
        Math.round(Math.hypot(b.x - a.x, b.y - a.y) / SAMPLE),
      );
      for (let i = 1; i <= n; i++)
        push({ x: lerp([a.x, b.x], i / n), y: lerp([a.y, b.y], i / n) });
    };
    const onCircle = (c: Point, a: number): Point => ({
      x: c.x + Math.cos(a) * RADIUS,
      y: c.y + Math.sin(a) * RADIUS,
    });
    // the tangent point on c's circle from p, for going round it `turn`-wise
    const tangent = (c: Point, p: Point, turn: number, leaving: boolean) => {
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      const base = Math.atan2(p.y - c.y, p.x - c.x);
      const off = Math.acos(Math.min(1, RADIUS / d));
      for (const a of [base + off, base - off]) {
        const q = onCircle(c, a);
        const tx = -Math.sin(a) * turn;
        const ty = Math.cos(a) * turn;
        const dot = leaving
          ? tx * (p.x - q.x) + ty * (p.y - q.y)
          : tx * (q.x - p.x) + ty * (q.y - p.y);
        if (dot > 0) return a;
      }
      return base;
    };
    const start: Point = { x: button.x, y: area.bottom + 150 };
    push(start);
    let at = start;
    const turnOf: number[] = [];
    turns.forEach((w, k) => {
      const next = k + 1 < turns.length ? turns[k + 1].at : finish.at;
      const cross =
        (w.at.x - at.x) * (next.y - w.at.y) -
        (w.at.y - at.y) * (next.x - w.at.x);
      const turn = cross >= 0 ? 1 : -1;
      const a0 = tangent(w.at, at, turn, false);
      const a1 = tangent(w.at, next, turn, true);
      let sweep = a1 - a0;
      if (turn > 0) while (sweep <= 0) sweep += Math.PI * 2;
      else while (sweep >= 0) sweep -= Math.PI * 2;
      straight(at, onCircle(w.at, a0));
      const enter = length;
      const steps = Math.max(
        2,
        Math.round((Math.abs(sweep) * RADIUS) / SAMPLE),
      );
      for (let i = 1; i <= steps; i++)
        push(onCircle(w.at, a0 + (sweep * i) / steps));
      corners.push({ from: enter, to: length });
      turnOf.push(turn);
      at = line[line.length - 1];
    });
    straight(at, finish.at);
    const race = planRace(line, raceMs, corners);
    const bends: Bend[] = turns.map((worker, k) => {
      const corner = corners[k];
      const enterMs = race.msAt(corner.from);
      const exitMs = race.msAt(corner.to);
      return {
        worker,
        turn: turnOf[k],
        corner,
        brakeMs: race.msAt(Math.max(0, corner.from - RADIUS)),
        enterMs,
        apexMs: race.msAt((corner.from + corner.to) / 2),
        exitMs,
      };
    });
    const finishMs = raceMs;
    const endMs = finishMs + gapMs;

    // a racer `lag` ms behind the leader: its middle and the way its nose points
    const mid: Point = { x: 0, y: 0 };
    const back: Point = { x: 0, y: 0 };
    const pose = (ms: number) => {
      race.at(ms, mid);
      race.at(ms - 12, back);
      let heading = Math.atan2(mid.y - back.y, mid.x - back.x);
      for (const b of bends) {
        const k =
          smoothstep(clamp01((ms - b.enterMs + DRIFT_IN) / DRIFT_IN)) *
          (1 - smoothstep(clamp01((ms - b.exitMs) / DRIFT_OUT)));
        heading += b.turn * DRIFT * k;
      }
      return heading;
    };
    const nose: Point = { x: 0, y: 0 };
    const tail: Point = { x: 0, y: 0 };
    const noseAt = () => nose;
    const tailAt = () => tail;
    const centerOf = (lag: number) => (ms: number) =>
      ms - lag < 0 || ms - lag > finishMs ? null : race.at(ms - lag, mid);
    const leaderAt = centerOf(0);
    const chaserAt = centerOf(gapMs);
    const smoke: Point = { x: 0, y: 0 };
    const drifting = (ms: number) =>
      bends.some(
        (b) => ms >= b.enterMs - DRIFT_IN && ms <= b.exitMs + DRIFT_OUT,
      );

    const braking = createBeats(
      bends,
      (b) => b.brakeMs,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(
          lerp(CORNER_SHAKE, k / Math.max(1, bends.length - 1)) * 0.6,
        );
      },
    );
    const sliding = createBeats(
      bends,
      (b) => b.apexMs,
      (b, k) => {
        cover!.promote(b.worker);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(CORNER_SHAKE, k / Math.max(1, bends.length - 1)));
      },
    );
    const finishing = createBeats(
      [finishMs, endMs],
      (ms) => ms,
      (ms) => {
        if (ms >= endMs) {
          cover!.promote(finish);
          cover!.blast(finish.at);
          return;
        }
        cover!.burst(finish.at, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FINISH_SHAKE);
      },
    );

    const drawRacer = (
      ctx: CanvasRenderingContext2D,
      lag: number,
      at: (ms: number) => Point | null,
      ms: number,
      now: number,
    ) => {
      const t = ms - lag;
      if (t < 0 || t > finishMs) return;
      // smoke puffs off the tail through every slide
      for (let j = 1; j <= SMOKE; j++) {
        const s = t - j * SMOKE_MS;
        if (s < 0 || !drifting(s)) continue;
        const h = pose(s);
        const age = (t - s) / (SMOKE * SMOKE_MS);
        smoke.x =
          mid.x -
          Math.cos(h) * CAR * 0.5 +
          (hash01(j, Math.floor(s / SMOKE_MS)) - 0.5) * 40 * age;
        smoke.y = mid.y - Math.sin(h) * CAR * 0.5 - SMOKE_RISE * (t - s);
        drawGlitterLight(
          ctx,
          smoke.x,
          smoke.y,
          SMOKE_SIZE * (1 + 2 * age),
          j + lag,
          1 - age,
          now,
        );
      }
      drawWispTrail(ctx, at, ms, now, HEAD);
      const h = pose(t);
      nose.x = mid.x + Math.cos(h) * CAR * 0.5;
      nose.y = mid.y + Math.sin(h) * CAR * 0.5;
      tail.x = mid.x - Math.cos(h) * CAR * 0.5;
      tail.y = mid.y - Math.sin(h) * CAR * 0.5;
      drawWispHead(ctx, tailAt, ms, now, TAIL, 0.4);
      drawWispHead(ctx, noseAt, ms, now, HEAD, 0.9);
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          braking.tick(ms, now);
          sliding.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          drawRacer(ctx, gapMs, chaserAt, ms, now);
          drawRacer(ctx, 0, leaderAt, ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 1,
);
