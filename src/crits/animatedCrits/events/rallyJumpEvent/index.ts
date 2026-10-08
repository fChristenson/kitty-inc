// the "Rally Jump" event (race; worker perma tiers): it covers its crit,
// whose click freezes the screen while two rally racers scream up from below
// the screen nose to tail, brake hard into a hairpin round the end of the top
// bar in view and power back down; halfway down the straight they hit a
// jump and fly, swelling as they soar, landing hard with a jolt; they brake
// into a hairpin round a worker, who climbs a perma tier, then power out
// and dive onto another worker, the leader in a big burst and the chaser
// right after in a huge blast, a perma tier each. Then the crit's tier pays
// out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { planRace, type RaceCorner } from "../../../../shared/race";
import { findRewardBars, findRewardWorkers } from "../../eventRewards";

const KEY = "rallyJump";
const RADIUS = 90;
const SAMPLE = 10;
// the jump spans this share of the straight, flying LIFT px high
const JUMP: [number, number] = [0.3, 0.7];
const LIFT = 150;
const SOAR = 0.6;
const RACER = WISP_SIZE;
const CHASER = WISP_SIZE * 0.85;
const BRAKE_SHAKE = 0.35;
const APEX_SHAKE = 0.6;
const LAND_SHAKE = 1.1;
const FINISH_SHAKE = 1.3;

export const forceRallyJumpEvent = registerWispEvent(
  KEY,
  "Rally Jump",
  () => CONFIG.rallyJumpEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, holdMs, mergeMs } = CONFIG.rallyJumpEvent;
    const bars = findRewardBars(floor, context);
    const top = bars[0];
    const workers = findRewardWorkers(floor, context);
    if (!top || workers.length < 2) return;
    // round the worker farthest below the bar, finishing on the next one over
    const sorted = [...workers].sort((a, b) => b.at.y - a.at.y);
    const corner = sorted[0];
    const finish = [...workers]
      .filter((w) => w !== corner)
      .sort(
        (a, b) =>
          Math.hypot(a.at.x - corner.at.x, a.at.y - corner.at.y) -
          Math.hypot(b.at.x - corner.at.x, b.at.y - corner.at.y),
      )[0];
    const centreX = (area.left + area.right) / 2;
    // round the end of the top bar nearer the middle
    const leftEnd =
      Math.abs(top.box.x - centreX) <
      Math.abs(top.box.x + top.box.width - centreX);
    const turn: Point = {
      x: leftEnd ? top.box.x : top.box.x + top.box.width,
      y: top.center.y,
    };
    const s = leftEnd ? 1 : -1;

    const line: Point[] = [];
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
    const arc = (c: Point, from: number, sweep: number): RaceCorner => {
      const enter = length;
      const n = Math.max(2, Math.round((Math.abs(sweep) * RADIUS) / SAMPLE));
      for (let i = 1; i <= n; i++) {
        const a = from + (sweep * i) / n;
        push({ x: c.x + Math.cos(a) * RADIUS, y: c.y + Math.sin(a) * RADIUS });
      }
      return { from: enter, to: length };
    };
    const start: Point = { x: turn.x - s * RADIUS, y: area.bottom + 150 };
    push(start);
    straight(start, { x: turn.x - s * RADIUS, y: turn.y });
    const first = arc(turn, s > 0 ? Math.PI : 0, s * Math.PI);
    const downFrom = length;
    straight(line[line.length - 1], {
      x: corner.at.x + s * RADIUS,
      y: corner.at.y,
    });
    const downTo = length;
    const second = arc(corner.at, s > 0 ? 0 : Math.PI, s * Math.PI);
    straight(line[line.length - 1], finish.at);
    const race = planRace(line, raceMs, [first, second]);
    const takeoff = race.msAt(lerp([downFrom, downTo], JUMP[0]));
    const touchdown = race.msAt(lerp([downFrom, downTo], JUMP[1]));
    const apex = race.msAt((second.from + second.to) / 2);
    const brakes = [first, second].map((c) =>
      race.msAt(Math.max(0, c.from - RADIUS)),
    );
    const endMs = raceMs + gapMs;

    const braking = createBeats(
      [...brakes, ...brakes.map((ms) => ms + gapMs)],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(BRAKE_SHAKE);
      },
    );
    const jumping = createBeats(
      [takeoff, touchdown, takeoff + gapMs, touchdown + gapMs],
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        if (k % 2 === 0) {
          playSwoosh();
          return;
        }
        playBloop();
        shakeScreen(LAND_SHAKE);
      },
    );
    const cornering = createBeats(
      [apex, apex + gapMs],
      (ms) => ms,
      (_, k) => {
        if (k === 0) cover!.promote(corner);
        if (cover!.isLive()) shakeScreen(APEX_SHAKE);
      },
    );
    const finishing = createBeats(
      [raceMs, endMs],
      (ms) => ms,
      (ms) => {
        cover!.promote(finish);
        if (ms >= endMs) {
          cover!.blast(finish.at);
          return;
        }
        cover!.burst(finish.at, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FINISH_SHAKE);
      },
    );

    // a racer lag ms behind, lifted off the line while it's in the air
    const racer = (lag: number) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        const t = ms - lag;
        if (t < 0 || t > raceMs) return null;
        race.at(t, spot);
        const air = clamp01((t - takeoff) / (touchdown - takeoff));
        if (air > 0 && air < 1) spot.y -= LIFT * Math.sin(Math.PI * air);
        return spot;
      };
    };
    const soar = (lag: number, ms: number) => {
      const air = clamp01((ms - lag - takeoff) / (touchdown - takeoff));
      return 1 + SOAR * Math.sin(Math.PI * air);
    };
    const leaderAt = racer(0);
    const chaserAt = racer(gapMs);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers: [corner, finish],
        tick: (ms, now) => {
          braking.tick(ms, now);
          jumping.tick(ms, now);
          cornering.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          drawWisp(ctx, chaserAt, ms, now, CHASER * soar(gapMs, ms), 0.7);
          drawWisp(ctx, leaderAt, ms, now, RACER * soar(0, ms), 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardBars(floor, context).length > 0 &&
    findRewardWorkers(floor, context).length > 1,
);
