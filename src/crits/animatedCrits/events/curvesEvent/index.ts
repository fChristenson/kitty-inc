// the "Curves" event (wisp; cash): it covers its crit, whose click freezes the
// screen while two wisps scream in from the far side like racers, one hard
// on the other's tail, flat out along a straight under the clicked button,
// brake into a tight hairpin round its end with a screech and a jolt, and
// power out along its top, the chaser a beat behind. Then they dash for the
// total-income readout and slam into it one after the other: a big blast,
// then a huge one. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
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
import { ringTargets } from "../../../../shared/coinTargets";
import { drawDetonation } from "../../../../shared/explosion";
import { measure, totalSpot } from "../../cashFlow";
import {
  BTN_H,
  BTN_W,
  getButtonCenter,
} from "../../../../floors/upgradeButton";

const KEY = "curves";
const REWARD = 4;
// px the racing line keeps off the button
const PAD = 50;
// speeds, as shares of its top speed: through the hairpin, and hitting the
// total after powering out of it
const CORNER = 0.3;
const FINISH = 1.3;
// share of the straight in it spends braking for the hairpin
const BRAKING = 0.35;
const ENTRY = 80;
const STRAIGHT_STEP = 24;
const TURN_STEPS = 36;
const DASH_STEPS = 40;
// share of the screen's width it powers out along the top before the dash
const EXIT = 0.2;
const WISP = 0.04;
// the hairpin's beats: braking, apex, exit
const BEAT_SHAKE = [0.5, 1.2, 0.7];
const FIRST_BLAST = 320;
const FIRST_SHAKE = 1.8;
const FIRST_COINS = 16;
const FIRST_RING: [number, number] = [80, 260];

interface Hit {
  ms: number;
  k: number;
  leader: boolean;
}

export const forceCurvesEvent = registerWispEvent(
  KEY,
  "Curves",
  () => CONFIG.curvesEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, holdMs, mergeMs } = CONFIG.curvesEvent;
    const width = area.right - area.left;
    const mid = (area.left + area.right) / 2;
    const total = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    // the hairpin swings round the button's outer end
    const side = button.x >= mid ? 1 : -1;
    const r = BTN_H / 2 + PAD;
    const centre: Point = {
      x: button.x + side * (BTN_W / 2 - r * 0.3),
      y: button.y,
    };

    const line: Point[] = [];
    const straight = (a: Point, b: Point) => {
      const n = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / STRAIGHT_STEP),
      );
      for (let i = line.length ? 1 : 0; i <= n; i++)
        line.push({ x: lerp([a.x, b.x], i / n), y: lerp([a.y, b.y], i / n) });
    };
    // flat out under the button
    const turnIn: Point = { x: centre.x, y: centre.y + r };
    straight(
      { x: side > 0 ? area.left - ENTRY : area.right + ENTRY, y: turnIn.y },
      turnIn,
    );
    const turnFrom = line.length - 1;
    // the hairpin, from underneath round the end to the top
    for (let i = 1; i <= TURN_STEPS; i++) {
      const a = Math.PI / 2 - side * Math.PI * (i / TURN_STEPS);
      line.push({
        x: centre.x + Math.cos(a) * r,
        y: centre.y + Math.sin(a) * r,
      });
    }
    const turnTo = line.length - 1;
    // powering out along the top, then bending up into the total
    const out: Point = { x: centre.x - side * width * EXIT, y: centre.y - r };
    straight(line[turnTo], out);
    const bend = { x: out.x - side * width * 0.12, y: out.y };
    for (let i = 1; i <= DASH_STEPS; i++)
      line.push(bezier(out, bend, total, i / DASH_STEPS, { x: 0, y: 0 }));
    const along = measure(line);
    const inLength = along[turnFrom];
    const outFrom = along[turnTo];
    const hairpin = planRace(line, raceMs, [{ from: inLength, to: outFrom }], {
      corner: CORNER,
      finish: FINISH,
      braking: BRAKING,
    });
    const arrivals = [raceMs, raceMs + gapMs];
    const spots = arrivals.map(() => ({ x: 0, y: 0 }));
    const ats = arrivals.map(
      (end, plane) =>
        (ms: number): Point | null =>
          ms < 0 || ms > end
            ? null
            : hairpin.at(ms - plane * gapMs, spots[plane]),
    );
    const size = Math.max(WISP_SIZE, width * WISP);

    // braking, apex and exit of the hairpin, for both
    const hits: Hit[] = [];
    [inLength * (1 - BRAKING), (inLength + outFrom) / 2, outFrom].forEach(
      (s, k) => {
        const ms = hairpin.msAt(s);
        arrivals.forEach((_, plane) =>
          hits.push({ ms: ms + plane * gapMs, k, leader: plane === 0 }),
        );
      },
    );

    const cornering = createBeats(
      hits,
      (h) => h.ms,
      (h) => {
        if (!cover!.isLive()) return;
        if (h.leader && h.k === 0) playSwoosh();
        shakeScreen(BEAT_SHAKE[h.k]);
      },
    );
    let firstAt: Point | null = null;
    const finishing = createBeats(
      arrivals,
      (ms) => ms,
      (_, plane) => {
        const at = cover!.total() ?? total;
        if (plane === 1) {
          cover!.blast(at);
          return;
        }
        firstAt = at;
        cover!.launchFrom(at, ringTargets(at, FIRST_COINS, FIRST_RING));
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
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          cornering.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (let plane = 0; plane < ats.length; plane++)
            drawWispBetween(
              ctx,
              ats[plane],
              ms,
              now,
              size,
              0.6,
              plane * gapMs,
              arrivals[plane],
            );
          if (firstAt)
            drawDetonation(ctx, firstAt, ms - arrivals[0], FIRST_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
