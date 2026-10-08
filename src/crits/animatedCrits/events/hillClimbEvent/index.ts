// the "Hill Climb" event (race; a crit tier and free upgrade levels): it
// covers its crit, whose click freezes the screen while two wisps race up
// the stack of income bars like hill-climb racers, one hard on the other's
// tail: flat out along under a bar, braking hard into a hairpin round its
// end with a screech and a jolt, crawling round, powering out along over
// it, then hairpinning up to the next bar and on, switchback after
// switchback; off the top bar's hairpin they sprint and slam into it, the
// leader jumping it a crit tier in a big blast, the chaser right behind with
// free levels in a huge one. Then the crit's tier pays out
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
import { planRace, type RaceCorner } from "../../../../shared/race";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/explosion";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "hillClimb";
const MAX_BARS = 3;
// px the racing line keeps off the bars
const PAD = 46;
// px the hairpins keep in from the screen's sides
const EDGE = 20;
const BRAKING = 0.35;
const ENTRY = 80;
const STRAIGHT_STEP = 24;
const TURN_STEPS = 30;
const FINISH_STEPS = 24;
const WISP = 0.04;
const BRAKE_SHAKE = 0.4;
const APEX_SHAKE: [number, number] = [0.6, 1.1];
const FIRST_BLAST = 320;
const FIRST_SHAKE = 1.8;

interface Hit {
  ms: number;
  k: number;
  leader: boolean;
  apex: boolean;
}

export const forceHillClimbEvent = registerWispEvent(
  KEY,
  "Hill Climb",
  () => CONFIG.hillClimbEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, levelShare, holdMs, mergeMs } =
      CONFIG.hillClimbEvent;
    // bottom up
    const bars = findRewardBars(floor, context).slice(-MAX_BARS).reverse();
    if (bars.length === 0) return;
    const top = bars[bars.length - 1];
    const width = area.right - area.left;
    const first = Math.random() < 0.5 ? -1 : 1;

    const line: Point[] = [];
    const corners: RaceCorner[] = [];
    let length = 0;
    const push = (p: Point) => {
      const prev = line[line.length - 1];
      if (prev) length += Math.hypot(p.x - prev.x, p.y - prev.y);
      line.push(p);
    };
    const straight = (to: Point) => {
      const from = line[line.length - 1];
      const n = Math.max(
        1,
        Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / STRAIGHT_STEP),
      );
      for (let i = 1; i <= n; i++)
        push({
          x: lerp([from.x, to.x], i / n),
          y: lerp([from.y, to.y], i / n),
        });
    };
    // a hairpin up from y0 to y1 round x, on side `side` (1 right, -1 left)
    const hairpin = (x: number, y0: number, y1: number, side: number) => {
      const r = (y0 - y1) / 2;
      const cy = (y0 + y1) / 2;
      const from = length;
      for (let i = 1; i <= TURN_STEPS; i++) {
        const a = Math.PI / 2 - side * Math.PI * (i / TURN_STEPS);
        push({ x: x + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      corners.push({ from, to: length });
    };
    const endOf = (k: number, side: number) =>
      side > 0 ? bars[k].box.x + bars[k].box.width : bars[k].box.x;
    const under = (k: number) => bars[k].box.y + bars[k].box.height + PAD;
    const over = (k: number) => bars[k].box.y - PAD;
    // where a hairpin from y0 up to y1 on `side` turns, kept on the screen
    const turnX = (x: number, y0: number, y1: number, side: number) => {
      const r = (y0 - y1) / 2;
      return side > 0
        ? Math.min(x, area.right - EDGE - r)
        : Math.max(x, area.left + EDGE + r);
    };

    push({
      x: first > 0 ? area.left - ENTRY : area.right + ENTRY,
      y: under(0),
    });
    bars.forEach((_, k) => {
      const side = k % 2 ? -first : first;
      // along under the bar, round its end, back along over it
      const end = turnX(endOf(k, side), under(k), over(k), side);
      straight({ x: end, y: under(k) });
      hairpin(end, under(k), over(k), side);
      if (k === bars.length - 1) return;
      // then up round to under the next bar
      const up = turnX(endOf(k + 1, -side), over(k), under(k + 1), -side);
      straight({ x: up, y: over(k) });
      hairpin(up, over(k), under(k + 1), -side);
    });
    // off the top bar's hairpin, sprinting into it
    const exit = line[line.length - 1];
    const lastSide = (bars.length - 1) % 2 ? -first : first;
    const bend: Point = { x: top.center.x + lastSide * 40, y: exit.y };
    for (let i = 1; i <= FINISH_STEPS; i++)
      push(bezier(exit, bend, top.center, i / FINISH_STEPS, { x: 0, y: 0 }));

    const race = planRace(line, raceMs, corners, { braking: BRAKING });
    const arrivals = [raceMs, raceMs + gapMs];
    const spots = arrivals.map(() => ({ x: 0, y: 0 }));
    const ats = arrivals.map(
      (end, plane) =>
        (ms: number): Point | null =>
          ms < 0 || ms > end ? null : race.at(ms - plane * gapMs, spots[plane]),
    );
    const size = Math.max(WISP_SIZE, width * WISP);

    // braking for each hairpin and its apex, for both
    const hits: Hit[] = [];
    corners.forEach((c, k) => {
      const prev = k > 0 ? corners[k - 1].to : 0;
      const brake = race.msAt(c.from - (c.from - prev) * BRAKING);
      const apex = race.msAt((c.from + c.to) / 2);
      arrivals.forEach((_, plane) => {
        const lag = plane * gapMs;
        hits.push({ ms: brake + lag, k, leader: plane === 0, apex: false });
        hits.push({ ms: apex + lag, k, leader: plane === 0, apex: true });
      });
    });

    const cornering = createBeats(
      hits,
      (h) => h.ms,
      (h) => {
        if (!cover!.isLive()) return;
        if (!h.apex) {
          if (h.leader) playSwoosh();
          shakeScreen(BRAKE_SHAKE);
          return;
        }
        shakeScreen(lerp(APEX_SHAKE, h.k / Math.max(1, corners.length - 1)));
      },
    );
    let firstAt = -Infinity;
    const finishing = createBeats(
      arrivals,
      (ms) => ms,
      (ms, plane) => {
        if (plane === 1) {
          cover!.levels(top, levelsFor(top.floor, levelShare, 3), top.center);
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(top.center);
          return;
        }
        firstAt = ms;
        cover!.tierUp(top, top.center);
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
        bars,
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
          drawDetonation(ctx, top.center, ms - firstAt, FIRST_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
