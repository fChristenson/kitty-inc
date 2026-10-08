// the "Le Mans" event (race; free upgrade levels): it covers its crit, whose
// click freezes the screen while two racer wisps launch from a standstill
// off the clicked floor's button in a white-hot burnout, one hard on the
// other's tail; they tear left flat out under the floor's income bar, brake
// hard into a hairpin round its far end, a screech and a jolt, crawl round
// it, then power out flat out along the top of the bar and dive onto it:
// the leader slams in for free levels in a big blast, the chaser right
// after for twice as many in a huge one. Then the crit's tier pays out
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
import { findRewardBars, levelsFor } from "../../eventRewards";
import { BTN_X, getButtonCenter } from "../../../../floors/upgradeButton";

const KEY = "leMans";
// px the hairpin clears the bar by, above and below
const GAP = 50;
const CORNER = 0.3;
const FINISH = 1.3;
const BRAKING = 0.35;
const LAUNCH_STEPS = 16;
const STRAIGHT_STEP = 24;
const TURN_STEPS = 24;
const DIVE_STEPS = 40;
// share of the bar's width it runs along the top before diving
const RUN = 0.3;
const DIVE_RISE = 90;
const WISP = 0.04;
const LAUNCH_SHAKE = 0.7;
const BEAT_SHAKE = [0.5, 1.1];
const FIRST_BLAST = 320;
const FIRST_SHAKE = 1.8;

export const forceLeMansEvent = registerWispEvent(
  KEY,
  "Le Mans",
  () => CONFIG.leMansEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, levelShare, holdMs, mergeMs } = CONFIG.leMansEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const width = area.right - area.left;
    const button = getButtonCenter(context.isGroundFloor);
    // the hairpin round the bar's far (left) end
    const R = bar.box.height / 2 + GAP;
    const c: Point = { x: bar.box.x, y: bar.center.y };
    const line: Point[] = [];
    const straight = (a: Point, b: Point) => {
      const n = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / STRAIGHT_STEP),
      );
      for (let i = line.length ? 1 : 0; i <= n; i++)
        line.push({ x: lerp([a.x, b.x], i / n), y: lerp([a.y, b.y], i / n) });
    };
    // the launch: off the button's inner end, down under the bar's line
    const grid: Point = { x: BTN_X + 30, y: button.y };
    const under: Point = { x: bar.box.x + bar.box.width, y: c.y + R };
    const swing: Point = { x: grid.x - 60, y: under.y };
    for (let i = 0; i <= LAUNCH_STEPS; i++)
      line.push(bezier(grid, swing, under, i / LAUNCH_STEPS, { x: 0, y: 0 }));
    const launchTo = line.length - 1;
    straight(under, { x: c.x, y: c.y + R });
    const turnFrom = line.length - 1;
    for (let i = 1; i <= TURN_STEPS; i++) {
      const a = Math.PI / 2 + (Math.PI * i) / TURN_STEPS;
      line.push({ x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R });
    }
    const turnTo = line.length - 1;
    const out: Point = { x: c.x + bar.box.width * RUN, y: c.y - R };
    straight(line[turnTo], out);
    const landing: Point = {
      x: bar.center.x + bar.box.width * 0.15,
      y: bar.box.y,
    };
    const lead: Point = { x: landing.x + 40, y: out.y - DIVE_RISE };
    for (let i = 1; i <= DIVE_STEPS; i++)
      line.push(bezier(out, lead, landing, i / DIVE_STEPS, { x: 0, y: 0 }));
    const along = measure(line);
    const race = planRace(
      line,
      raceMs,
      [
        // the standing start, crawling off the line before it gets going
        { from: 0, to: along[launchTo] },
        { from: along[turnFrom], to: along[turnTo] },
      ],
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
    const levels = levelsFor(bar.floor, levelShare, 3);

    const launching = createBeats(
      arrivals,
      (_, racer) => racer * gapMs,
      (_, racer) => {
        cover!.burst(grid, 0.5 + 0.2 * racer);
        if (!cover!.isLive()) return;
        if (racer === 0) playSwoosh();
        shakeScreen(LAUNCH_SHAKE);
      },
    );
    const beats: { ms: number; k: number; leader: boolean }[] = [];
    const straightFrom = along[launchTo];
    [
      along[turnFrom] - (along[turnFrom] - straightFrom) * BRAKING,
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
          cover!.levels(bar, levels * 2, lead);
          cover!.slam(bar);
          cover!.blast(landing);
          return;
        }
        cover!.levels(bar, levels, lead);
        cover!.burst(landing, 0.8);
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
        bars: [bar],
        tick: (ms, now) => {
          launching.tick(ms, now);
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
          drawDetonation(ctx, landing, ms - arrivals[0], FIRST_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
