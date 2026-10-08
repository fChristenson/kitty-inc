// the "Peloton" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while a tight pack of wisps races in like
// a cycling peloton and snakes down the income bars, end to end and back,
// each rider drafting in the wheel of the one ahead; every bar it finishes
// jolts with free levels, the pack picking up speed all the way, and the
// sprint over the last bar ends in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "peloton";
const MAX_BARS = 4;
const RIDERS = 7;
const LAG_MS = 45;
const SPREAD = 14;
const ABOVE = 26;
const RIDER = 0.35;
// px per ms, from the start to the sprint
const SPEED: [number, number] = [0.9, 3.2];
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Finish {
  bar: RewardBar;
  at: Point;
  ms: number;
}

export const forcePelotonEvent = registerWispEvent(
  KEY,
  "Peloton",
  () => CONFIG.pelotonEvent.chance,
  (floor, context, area) => {
    const { levelShare, holdMs, mergeMs } = CONFIG.pelotonEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    // in from the side, then end to end along every bar, alternating
    const route: Point[] = [{ x: area.left - 60, y: bars[0].box.y - ABOVE }];
    const ends: number[] = [];
    bars.forEach((bar, k) => {
      const y = bar.box.y - ABOVE;
      const [a, b] =
        k % 2
          ? [bar.box.x + bar.box.width, bar.box.x]
          : [bar.box.x, bar.box.x + bar.box.width];
      route.push({ x: a, y }, { x: b, y });
      ends.push(route.length - 1);
    });
    const along = [0];
    for (let i = 1; i < route.length; i++)
      along.push(
        along[i - 1] +
          Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y),
      );
    const length = along[along.length - 1];
    // distance d covered by ms t, speeding up evenly from SPEED[0] to SPEED[1]
    const duration = (2 * length) / (SPEED[0] + SPEED[1]);
    const accel = (SPEED[1] - SPEED[0]) / duration;
    const distAt = (ms: number) => {
      const t = Math.min(Math.max(0, ms), duration);
      return SPEED[0] * t + (accel * t * t) / 2;
    };
    const msAt = (d: number) =>
      (-SPEED[0] + Math.sqrt(SPEED[0] * SPEED[0] + 2 * accel * d)) / accel;
    const pointAt = (d: number, into: Point) => {
      let i = 1;
      while (i < along.length - 1 && along[i] < d) i++;
      const u = (d - along[i - 1]) / (along[i] - along[i - 1] || 1);
      into.x = lerp([route[i - 1].x, route[i].x], Math.min(1, Math.max(0, u)));
      into.y = lerp([route[i - 1].y, route[i].y], Math.min(1, Math.max(0, u)));
      return into;
    };
    const finishes: Finish[] = bars.map((bar, k) => ({
      bar,
      at: route[ends[k]],
      ms: msAt(along[ends[k]]),
    }));
    const last = finishes[finishes.length - 1];
    const endAt = last.ms;
    const riders = Array.from({ length: RIDERS }, (_, j) => {
      const spot: Point = { x: 0, y: 0 };
      const side = (j % 2 ? 1 : -1) * Math.ceil(j / 2) * SPREAD * 0.5;
      return (ms: number): Point => {
        const lagged = ms - j * LAG_MS;
        pointAt(distAt(lagged), spot);
        spot.y += side + Math.sin(ms * 0.02 + j) * 3;
        return spot;
      };
    });

    const finishing = createBeats(
      finishes,
      (f) => f.ms,
      (f, k) => {
        cover!.levels(f.bar, levelsFor(f.bar.floor, levelShare, 2), f.at);
        if (f === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(f.at);
          return;
        }
        cover!.burst(f.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, finishes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => finishing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (let j = 0; j < RIDERS; j++)
            drawWispBetween(
              ctx,
              riders[j],
              ms,
              now,
              WISP_SIZE * RIDER * (j === 0 ? 1.3 : 1),
              j === 0 ? 1 : 0.7,
              j * LAG_MS,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
