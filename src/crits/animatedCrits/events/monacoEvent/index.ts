// the "Monaco" event (race; a crit tier): it covers its crit, whose click
// freezes the screen while two racer wisps scream in off the right edge
// along the very top of the screen, one hard on the other's tail; they brake
// hard into a hairpin round the total readout's far end, a screech and a
// jolt, crawl round it, then power out flat out beneath it and dive down
// onto the clicked floor's bar: the leader slams into it in a big blast,
// the chaser in a huge one, and the bar jumps a crit tier. Then the crit's
// tier pays out
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
import { measure, totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "monaco";
// half the total readout's width, and the hairpin's radius round its end
const TOTAL_HALF = 110;
const R = 70;
const CORNER = 0.3;
const FINISH = 1.3;
const BRAKING = 0.35;
const ENTRY = 80;
const STRAIGHT_STEP = 24;
const TURN_STEPS = 24;
const DIVE_STEPS = 40;
// px it powers out under the total before diving
const EXIT = 260;
const DIVE_LEAD = 200;
const WISP = 0.04;
const BEAT_SHAKE = [0.5, 1.1];
const FIRST_BLAST = 320;
const FIRST_SHAKE = 1.8;

export const forceMonacoEvent = registerWispEvent(
  KEY,
  "Monaco",
  () => CONFIG.monacoEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, holdMs, mergeMs } = CONFIG.monacoEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const width = area.right - area.left;
    const total = totalSpot(area);
    // round the readout's left end: left along its top, back right under it
    const c: Point = { x: total.x - TOTAL_HALF, y: total.y };
    const line: Point[] = [];
    const straight = (a: Point, b: Point) => {
      const n = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / STRAIGHT_STEP),
      );
      for (let i = line.length ? 1 : 0; i <= n; i++)
        line.push({ x: lerp([a.x, b.x], i / n), y: lerp([a.y, b.y], i / n) });
    };
    straight({ x: area.right + ENTRY, y: c.y - R }, { x: c.x, y: c.y - R });
    const turnFrom = line.length - 1;
    for (let i = 1; i <= TURN_STEPS; i++) {
      const a = -Math.PI / 2 - (Math.PI * i) / TURN_STEPS;
      line.push({ x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R });
    }
    const turnTo = line.length - 1;
    const out: Point = {
      x: Math.min(area.right - 60, c.x + EXIT),
      y: c.y + R,
    };
    straight(line[turnTo], out);
    const lead: Point = { x: out.x + DIVE_LEAD, y: out.y + 40 };
    const landing: Point = { x: bar.center.x, y: bar.box.y };
    for (let i = 1; i <= DIVE_STEPS; i++)
      line.push(bezier(out, lead, landing, i / DIVE_STEPS, { x: 0, y: 0 }));
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
          ms < 0 || ms > arrives
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
          cover!.tierUp(bar, out);
          cover!.slam(bar);
          cover!.blast(landing);
          return;
        }
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
