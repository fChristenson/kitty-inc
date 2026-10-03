// the "Hockey Stop" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while a skater wisp shoots out of the
// clicked floor's button and glides in long curving strides across the
// floors in view; at every empty spot it digs in a hard hockey stop,
// spraying a fan of cash out ahead of it with a scrape, a bloop and a jolt,
// and a new worker forms there; it skates on ever faster, the last stop a
// huge blast and shake as the coins sweep into the total. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "hockeyStop";
const REWARD = 2;
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const CURVE = 120;
// each stop sprays FAN streams SPRAY px out over SPREAD rad
const FAN = 3;
const SPRAY = 140;
const SPREAD = 0.9;
const SKATER = 0.5;
const STOP_SHAKE: [number, number] = [0.5, 1.3];

export const forceHockeyStopEvent = registerWispEvent(
  KEY,
  "Hockey Stop",
  () => CONFIG.hockeyStopEvent.chance,
  (floor, context) => {
    const { glidesMs, holdMs, mergeMs } = CONFIG.hockeyStopEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.y - b.y || a.x - b.x);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const spray: Pour = {
      coinsAlong: 500,
      width: 16,
      streamMs: 160,
      travelMs: 300,
    };
    let clock = 0;
    let from: Point = button;
    const stops = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const side = k % 2 === 0 ? 1 : -1;
      const ctrl: Point = {
        x: (from.x + spot.x) / 2 + side * CURVE,
        y: (from.y + spot.y) / 2 - CURVE * 0.5,
      };
      const leaves = clock;
      clock += lerp(glidesMs, k / Math.max(1, hires.length - 1));
      // the fan sprays on the way it was going
      const heading = Math.atan2(spot.y - ctrl.y, spot.x - ctrl.x);
      const fans = Array.from({ length: FAN }, (_, i) => {
        const a = heading + (i / (FAN - 1) - 0.5) * SPREAD;
        const end: Point = {
          x: spot.x + Math.cos(a) * SPRAY,
          y: spot.y + Math.sin(a) * SPRAY,
        };
        return sampleLine(
          (u) => ({
            x: lerp([spot.x, end.x], u),
            y: lerp([spot.y, end.y], u) - Math.sin(Math.PI * u) * 30,
          }),
          16,
        );
      });
      const stop = { hire, spot, from, ctrl, leaves, stops: clock, fans };
      from = spot;
      return stop;
    });
    const last = stops[stops.length - 1];
    const endAt = last.stops;
    const durationMs = Math.max(
      pourDurationMs(endAt, spray),
      endAt + holdMs + mergeMs,
    );
    const skaterAt: Point = { x: 0, y: 0 };
    const skater = (ms: number): Point => {
      let s = stops[0];
      for (const stop of stops) if (ms >= stop.leaves) s = stop;
      return bezier(
        s.from,
        s.ctrl,
        s.spot,
        easeOut(clamp01((ms - s.leaves) / (s.stops - s.leaves))),
        skaterAt,
      );
    };

    const stopping = createBeats(
      stops,
      (s) => s.stops,
      (s, k) => {
        for (const fan of s.fans) pourLine(cover!, fan, spray);
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.spot);
          return;
        }
        cover!.burst(s.spot, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STOP_SHAKE, k / Math.max(1, stops.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => stopping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              skater,
              ms,
              now,
              WISP_SIZE * SKATER,
              0.7,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
