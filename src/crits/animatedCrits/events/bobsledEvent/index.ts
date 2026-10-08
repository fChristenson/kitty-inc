// the "Bobsled" event (money; cash): it covers its crit, whose click freezes
// the screen while a river of cash races down a winding bobsled run snaking
// from the top of the screen to the bottom in wide banked S-curves, each
// curve tighter and faster; at every bend it rides up the outer wall with a
// splash of coins, a bang and a jolt; at the bottom it hits a ramp and
// launches in a huge soaring arc up into the total in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "bobsled";
const REWARD = 4;
const CURVES = 5;
const TOP = 170;
const BOTTOM = 230;
const EDGE = 90;
// each curve swings SWING px out, tightening, over a share DROP of the run
const SWING: [number, number] = [330, 210];
const DROP: [number, number] = [1.35, 0.65];
// how far up the outer wall the river rides at each bend
const BANK = 60;
const STEPS = 36;
const SPLASH = 14;
const SPLASH_REACH: [number, number] = [30, 130];
const BEND_SHAKE: [number, number] = [0.5, 1.3];
const RAMP = 160;

export const forceBobsledEvent = registerWispEvent(
  KEY,
  "Bobsled",
  () => CONFIG.bobsledEvent.chance,
  (floor, context, area) => {
    const { runMs, launchMs, holdMs, mergeMs } = CONFIG.bobsledEvent;
    const cx = (area.left + area.right) / 2;
    const top = area.top + TOP;
    const bottom = area.bottom - BOTTOM;
    const weights = Array.from({ length: CURVES }, (_, k) =>
      lerp(DROP, k / (CURVES - 1)),
    );
    const sum = weights.reduce((a, b) => a + b, 0);
    let y = top;
    let clock = 0;
    const curves = weights.map((weight, k) => {
      const u = k / (CURVES - 1);
      const side = k % 2 === 0 ? 1 : -1;
      const swing = Math.min(
        lerp(SWING, u),
        (area.right - area.left) / 2 - EDGE - BANK,
      );
      const from = y;
      const to = y + ((bottom - top) * weight) / sum;
      y = to;
      const line = sampleLine((v) => {
        const s = Math.sin(Math.PI * v);
        return {
          x: cx + side * (swing * s + BANK * s ** 8),
          y: lerp([from, to], v),
        };
      }, STEPS);
      const travelMs = lerp(runMs, u);
      const pour: Pour = {
        coinsAlong: 600,
        width: 32,
        streamMs: travelMs * 0.55,
        travelMs,
      };
      const starts = clock;
      clock += travelMs;
      return {
        line,
        pour,
        starts,
        bends: starts + travelMs / 2,
        wall: { x: cx + side * (swing + BANK), y: (from + to) / 2 } as Point,
      };
    });
    const end: Point = { x: cx, y: bottom };
    const side = CURVES % 2 === 0 ? 1 : -1;
    const tip: Point = { x: cx + side * RAMP, y: bottom - 40 };
    const dip: Point = { x: cx + side * RAMP * 0.55, y: bottom + 60 };
    const total = totalSpot(area);
    const arc: Point = {
      x: Math.max(
        area.left + EDGE,
        Math.min(area.right - EDGE, tip.x + side * 260),
      ),
      y: total.y - 120,
    };
    const p: Point = { x: 0, y: 0 };
    const launch = [
      ...sampleLine((v) => ({ ...bezier(end, dip, tip, v, p) }), 10),
      ...sampleLine((v) => ({ ...bezier(tip, arc, total, v, p) }), 40).slice(1),
    ];
    const flight: Pour = {
      coinsAlong: 700,
      width: 36,
      streamMs: launchMs * 0.6,
      travelMs: launchMs,
    };
    const launches = clock;
    const endAt = launches + launchMs;
    const durationMs = Math.max(
      pourDurationMs(launches, flight),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      curves,
      (c) => c.starts,
      (c) => pourLine(cover!, c.line, c.pour),
    );
    const banking = createBeats(
      curves,
      (c) => c.bends,
      (c, k) => {
        cover!.burst(c.wall, 0.55);
        cover!.launchFrom(c.wall, ringTargets(c.wall, SPLASH, SPLASH_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BEND_SHAKE, k / (CURVES - 1)));
      },
    );
    const launching = createBeats(
      [launches],
      (ms) => ms,
      () => {
        pourLine(cover!, launch, flight);
        cover!.burst(tip, 0.7);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(1.2);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          banking.tick(ms, now);
          launching.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
