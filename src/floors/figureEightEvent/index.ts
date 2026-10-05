// the "Figure Eight" event (race; free hires): it covers its crit, whose
// click freezes the screen while two racer wisps tear in on a figure-eight
// track: flat out down the long diagonal, braking hard into a hairpin round
// the inner end of the clicked floor's button, crawling round it and
// powering back across the crossover, then round the end of a bar far up
// the screen, a chaser hard on the leader's tail; out of the last bend
// they dive off the track onto empty spots, the leader slamming in with a
// big blast and a new worker, the chaser right after in a huge one. Then
// the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { BTN_H, BTN_W, getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { lerp } from "../../shared/easing";
import { planRace, type RaceCorner } from "../../shared/race";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation } from "../../shared/explosion";
import { measure } from "../cashFlow";
import {
  drawRewardHires,
  findRewardBars,
  findRewardHires,
  giveHire,
} from "../eventRewards";

const KEY = "figureEight";
// px the hairpins keep round what they round, the far bend's least distance
// from the button's (a share of the screen's height) and the run-in's length
const ROOM = 70;
const FAR = 0.3;
const ENTRY = 0.5;
const STRAIGHT_STEP = 24;
const TURN_STEP = 0.12;
const DIVE_STEPS = 40;
const DIVE_RISE = 120;
const STYLE = { corner: 0.3, finish: 1.3, braking: 0.35 };
const RACER = 0.045;
const BRAKE_SHAKE = 0.5;
const FIRST_BLAST = 320;
const FIRST_SHAKE = 1.8;

export const forceFigureEightEvent = registerWispEvent(
  KEY,
  "Figure Eight",
  () => CONFIG.figureEightEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, holdMs, mergeMs } = CONFIG.figureEightEvent;
    const hires = findRewardHires(floor, context).slice(0, 2);
    if (hires.length === 0) return;
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const r = BTN_H / 2 + ROOM;
    const a: Point = { x: button.x - BTN_W / 2, y: button.y };
    // the far bend: round the left end of the bar farthest up the screen
    // from the button, or high on the left with none far enough
    const far = findRewardBars(floor, context)
      .filter((bar) => a.y - bar.center.y > FAR * h)
      .sort((p, q) => p.center.y - q.center.y)[0];
    const b: Point = far
      ? { x: Math.max(far.box.x, area.left + r + 20), y: far.center.y }
      : {
          x: area.left + r + 40,
          y: Math.max(area.top + r + 40, a.y - FAR * h * 1.5),
        };
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const phi = Math.atan2(b.y - a.y, b.x - a.x);
    // the crossing straights are the two circles' inner tangents
    const alpha = Math.acos(Math.min(0.95, (2 * r) / d));
    const on = (c: Point, angle: number): Point => ({
      x: c.x + Math.cos(angle) * r,
      y: c.y + Math.sin(angle) * r,
    });
    const a1 = on(a, phi + alpha);
    const a2 = on(a, phi - alpha);
    const b1 = on(b, phi + Math.PI + alpha);
    const b2 = on(b, phi + Math.PI - alpha);

    const line: Point[] = [];
    const straight = (to: Point) => {
      const from = line[line.length - 1];
      const n = Math.max(
        1,
        Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / STRAIGHT_STEP),
      );
      for (let i = 1; i <= n; i++)
        line.push({
          x: lerp([from.x, to.x], i / n),
          y: lerp([from.y, to.y], i / n),
        });
    };
    const corners: RaceCorner[] = [];
    const lengthOf = (l: Point[]) => {
      const m = measure(l);
      return m[m.length - 1];
    };
    const lengthSoFar = () => lengthOf(line);
    // round centre c from the line's end to `to`, turning the way it's heading
    const hairpin = (c: Point, to: Point) => {
      const from = line[line.length - 1];
      const prev = line[line.length - 2];
      const t0 = Math.atan2(from.y - c.y, from.x - c.x);
      const t1 = Math.atan2(to.y - c.y, to.x - c.x);
      const hx = from.x - prev.x;
      const hy = from.y - prev.y;
      const ccw = -Math.sin(t0) * hx + Math.cos(t0) * hy > 0;
      let sweep = t1 - t0;
      if (ccw) while (sweep <= 0) sweep += Math.PI * 2;
      else while (sweep >= 0) sweep -= Math.PI * 2;
      const along = lengthSoFar();
      const n = Math.ceil(Math.abs(sweep) / TURN_STEP);
      for (let i = 1; i <= n; i++) line.push(on(c, t0 + (sweep * i) / n));
      corners.push({ from: along, to: lengthSoFar() });
    };
    // in along the first diagonal, round the button, back across, round the
    // far bar's end
    const ux = (a1.x - b1.x) / (Math.hypot(a1.x - b1.x, a1.y - b1.y) || 1);
    const uy = (a1.y - b1.y) / (Math.hypot(a1.x - b1.x, a1.y - b1.y) || 1);
    line.push({ x: b1.x - ux * ENTRY * h, y: b1.y - uy * ENTRY * h });
    straight(a1);
    hairpin(a, a2);
    straight(b2);
    hairpin(b, b1);
    const track = line.length;
    // then off the track, each racer diving onto its own spot
    const lineTo = (hire: (typeof hires)[number]): Point[] => {
      const exit = line[track - 1];
      const spot: Point = { x: hire.x, y: hire.y - 40 };
      const lift: Point = {
        x: lerp([exit.x, spot.x], 0.5) + ux * 200,
        y: Math.min(exit.y, spot.y) - DIVE_RISE,
      };
      const out = line.slice(0, track);
      for (let i = 1; i <= DIVE_STEPS; i++)
        out.push(bezier(exit, lift, spot, i / DIVE_STEPS, { x: 0, y: 0 }));
      return out;
    };
    const leadLine = lineTo(hires[0]);
    const chaseLine = lineTo(hires[hires.length - 1]);
    const lead = planRace(leadLine, raceMs, corners, STYLE);
    // matched pace on the shared track: scaled by the lines' lengths
    const chaseMs = (raceMs * lengthOf(chaseLine)) / lengthOf(leadLine);
    const chase = planRace(chaseLine, chaseMs, corners, STYLE);
    const leadIn = raceMs;
    const chaseIn = gapMs + chaseMs;
    const spots = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const leadAt = (ms: number): Point | null =>
      ms > leadIn ? null : lead.at(ms, spots[0]);
    const chaseAt = (ms: number): Point | null =>
      ms < gapMs || ms > chaseIn ? null : chase.at(ms - gapMs, spots[1]);
    const size = Math.max(WISP_SIZE, w * RACER);
    const leadSpot = leadLine[leadLine.length - 1];
    const chaseSpot = chaseLine[chaseLine.length - 1];
    const brakes = corners.flatMap((c, k) => {
      const start = k > 0 ? corners[k - 1].to : 0;
      const s = c.from - (c.from - start) * STYLE.braking;
      return [lead.msAt(s), gapMs + chase.msAt(s)];
    });

    const braking = createBeats(
      brakes,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playSwoosh();
        shakeScreen(BRAKE_SHAKE);
      },
    );
    const finishing = createBeats(
      [leadIn, chaseIn],
      (ms) => ms,
      (_, k) => {
        giveHire(hires[k === 0 ? 0 : hires.length - 1]);
        if (k === 1) {
          cover!.blast(chaseSpot);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FIRST_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: chaseIn + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          braking.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          drawWispBetween(ctx, chaseAt, ms, now, size, 0.6, gapMs, chaseIn);
          drawWispBetween(ctx, leadAt, ms, now, size, 0.8, 0, leadIn);
          drawDetonation(ctx, leadSpot, ms - leadIn, FIRST_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
