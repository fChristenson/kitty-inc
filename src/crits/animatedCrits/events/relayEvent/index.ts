// the "Relay" event (wisp; free upgrade levels and a crit tier): it covers
// its crit, whose click freezes the screen while wisp runners line up, one
// at the end of each income bar in view; the clicked floor's button tosses a
// glowing baton to the first, who sprints flat out along its bar, strides
// thumping, and hands off to the next with a flash, a pop and a jolt, the
// bar it ran jolting with free levels; leg after leg, quicker each time, the
// anchor leg runs the clicked floor's bar and breaks the tape at its end,
// the bar jumping a crit tier in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "relay";
const MAX_BARS = 4;
// runners stand RAISE px over their bar, INSET px in from its ends, and
// stride STRIDE px high every STRIDE_MS
const RAISE = 26;
const INSET = 14;
const STRIDE = 10;
const STRIDE_MS = 90;
// the baton arcs LOFT px over the higher end of each toss
const LOFT = 90;
const BATON = 0.45;
const RUNNER = 0.7;
const COAST_MS = 160;
const HANDOFF_SHAKE: [number, number] = [0.5, 1.2];

export const forceRelayEvent = registerWispEvent(
  KEY,
  "Relay",
  () => CONFIG.relayEvent.chance,
  (floor, context) => {
    const { legsMs, tossMs, levelShare, holdMs, mergeMs } = CONFIG.relayEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    // the furthest legs from the clicked bar first, the anchor on it
    const bars = [
      ...found
        .filter((b) => b !== own)
        .sort(
          (a, b) =>
            Math.abs(b.center.y - own.center.y) -
            Math.abs(a.center.y - own.center.y),
        )
        .slice(0, MAX_BARS - 1),
      own,
    ];
    const button = getButtonCenter(context.isGroundFloor);
    let clock: number = tossMs;
    const legs = bars.map((bar, k) => {
      const rightward = k % 2 === 0;
      const y = bar.box.y - RAISE;
      const left = bar.box.x + INSET;
      const right = bar.box.x + bar.box.width - INSET;
      const start: Point = { x: rightward ? left : right, y };
      const finish: Point = { x: rightward ? right : left, y };
      const runAt = clock;
      const runMs = lerp(legsMs, k / Math.max(1, bars.length - 1));
      clock += runMs + tossMs;
      return { bar, start, finish, runAt, endAt: runAt + runMs, runMs };
    });
    const last = legs[legs.length - 1];
    const endAt = last.endAt;
    // the runner's spot at ms: waiting, sprinting with a stride, coasting on
    const runner = (leg: (typeof legs)[number], ms: number, into: Point) => {
      const u = clamp01((ms - leg.runAt) / leg.runMs);
      const sprint = 0.35 * u + 0.65 * u * u;
      into.x = lerp([leg.start.x, leg.finish.x], sprint);
      const striding = ms > leg.runAt && ms < leg.endAt;
      into.y =
        leg.start.y -
        (striding
          ? STRIDE * Math.abs(Math.sin((ms * Math.PI) / STRIDE_MS))
          : 0);
      return into;
    };
    const runners = legs.map((leg, k) => {
      const at: Point = { x: 0, y: 0 };
      const toMs = k === legs.length - 1 ? leg.endAt : leg.endAt + COAST_MS;
      return {
        toMs,
        at: (ms: number): Point | null => {
          if (ms < 0 || ms > toMs) return null;
          runner(leg, ms, at);
          if (ms > leg.endAt) {
            const dir = Math.sign(leg.finish.x - leg.start.x);
            at.x += dir * 60 * clamp01((ms - leg.endAt) / COAST_MS);
          }
          return at;
        },
      };
    });
    // the baton's tosses: from the button to the first runner, then leg to leg
    const tosses = legs.map((leg, k) => {
      const from = k === 0 ? button : legs[k - 1].finish;
      return {
        from,
        to: leg.start,
        bow: {
          x: (from.x + leg.start.x) / 2,
          y: Math.min(from.y, leg.start.y) - LOFT,
        },
        at: leg.runAt - tossMs,
      };
    });
    const batonAt: Point = { x: 0, y: 0 };
    const baton = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      let k = legs.length - 1;
      while (k > 0 && ms < tosses[k].at) k--;
      const toss = tosses[k];
      if (ms < legs[k].runAt)
        return bezier(
          toss.from,
          toss.bow,
          toss.to,
          clamp01((ms - toss.at) / tossMs),
          batonAt,
        );
      runner(legs[k], ms, batonAt);
      batonAt.y -= RAISE * 0.6;
      return batonAt;
    };

    const handing = createBeats(
      legs,
      (leg) => leg.runAt,
      (leg, k) => {
        cover!.burst(leg.start, 0.4 + 0.2 * (k / Math.max(1, legs.length - 1)));
        if (cover!.isLive()) playSwoosh();
      },
    );
    const finishing = createBeats(
      legs,
      (leg) => leg.endAt,
      (leg, k) => {
        const t = k / Math.max(1, legs.length - 1);
        cover!.levels(
          leg.bar,
          levelsFor(leg.bar.floor, levelShare, 2),
          leg.start,
        );
        if (k === legs.length - 1) {
          cover!.tierUp(own, leg.start);
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(leg.finish);
          return;
        }
        cover!.burst(leg.finish, 0.5 + 0.3 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HANDOFF_SHAKE, t));
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
        tick: (ms, now) => {
          handing.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / endAt);
          for (const r of runners)
            drawWispBetween(
              ctx,
              r.at,
              ms,
              now,
              WISP_SIZE * RUNNER,
              heat,
              0,
              r.toMs,
            );
          drawWispBetween(ctx, baton, ms, now, WISP_SIZE * BATON, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
