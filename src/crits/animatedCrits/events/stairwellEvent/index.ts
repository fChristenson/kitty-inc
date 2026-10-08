// the "Stairwell" event (bounce; levels): it covers its crit, whose click
// freezes the screen while a ball wisp drops in off the top of the screen
// and bounces down the bars like a superball down a stairwell, end to end,
// each bounce a splash, a boing and a jolt that lands free levels on the bar
// it hits, quicker and lower as it goes; it finishes with a slam down onto
// the clicked floor's bar in a big blast and every bar slams. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBounceSplash, hops, type Bounce } from "../../../../shared/bounce";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "stairwell";
const MAX_BOUNCES = 8;
// each bounce lands this share along its bar, alternating ends, its arc
// shrinking from LIFT
const ENDS: [number, number] = [0.15, 0.85];
const LIFT: [number, number] = [260, 110];
const DROP = 420;
const BALL = WISP_SIZE * 0.9;
const BOUNCE_SHAKE: [number, number] = [0.4, 0.9];

interface Step {
  bar: RewardBar;
  bounce: Bounce;
}

export const forceStairwellEvent = registerWispEvent(
  KEY,
  "Stairwell",
  () => CONFIG.stairwellEvent.chance,
  (floor, context, area) => {
    const { hopMs, levelShare, holdMs, mergeMs } = CONFIG.stairwellEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    // down the bars above the clicked one to it, a bounce off each end of each
    const down = bars
      .filter((b) => b.box.y <= clicked.box.y)
      .sort((a, b) => a.box.y - b.box.y);
    const route: RewardBar[] = [];
    for (const bar of down) route.push(bar, bar);
    const steps = route.slice(-MAX_BOUNCES);
    const points: Point[] = steps.map((bar, k) => ({
      x: bar.box.x + bar.box.width * (k % 2 === 0 ? ENDS[0] : ENDS[1]),
      y: bar.box.y,
    }));
    const start: Point = {
      x: points[0].x,
      y: Math.min(area.top, points[0].y) - DROP,
    };
    const path = hops([start, ...points], [hopMs * 1.3, hopMs * 0.7], LIFT, 0);
    const stepsAt: Step[] = path.bounces.map((bounce, k) => ({
      bar: steps[k],
      bounce,
    }));
    const last = stepsAt[stepsAt.length - 1];
    const endMs = path.endMs;
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    const dropping = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const bouncing = createBeats(
      stepsAt,
      (s) => s.bounce.ms,
      (s, k) => {
        cover!.levels(s.bar, levels.get(s.bar)!, start);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bounce.at);
          return;
        }
        cover!.burst(s.bounce.at, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BOUNCE_SHAKE, k / Math.max(1, stepsAt.length - 1)));
      },
    );

    const ballAt = (ms: number): Point | null =>
      ms < 0 || ms > endMs ? null : path.at(ms);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          dropping.tick(ms, now);
          bouncing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 400) return;
          for (const s of stepsAt)
            drawBounceSplash(ctx, s.bounce, ms - s.bounce.ms, 120, now);
          drawWispBetween(ctx, ballAt, ms, now, BALL, 0.9, 0, endMs);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
