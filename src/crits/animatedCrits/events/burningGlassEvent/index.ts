// the "Burning Glass" event (beam; free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while a wide shaft of
// light pours down out of the sky as if through a giant magnifying glass and
// narrows to a blazing point; the point hunts across the income bars in
// view, ever faster, scorching each with a flare, a bang and a jolt that
// lands free levels; then it settles on the clicked floor's bar and focuses
// down to a white-hot pinprick as the screen rumbles, until the bar ignites:
// it jumps a crit tier and every bar slams in a huge blast and shake
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, levelsFor } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "burningGlass";
const MAX_BARS = 5;
// the shaft narrows from WIDE px to HUNT while hunting, then to PIN
const WIDE = 260;
const HUNT = 46;
const PIN = 10;
const FLARE: [number, number] = [24, 70];
const RUMBLE_MS = 70;
const SCORCH_SHAKE: [number, number] = [0.7, 1.4];

export const forceBurningGlassEvent = registerWispEvent(
  KEY,
  "Burning Glass",
  () => CONFIG.burningGlassEvent.chance,
  (floor, context, area) => {
    const { focusMs, legsMs, igniteMs, levelShare, holdMs, mergeMs } =
      CONFIG.burningGlassEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const others = found.filter((b) => b !== own).slice(0, MAX_BARS - 1);
    const bars = [...others, own];
    const sky: Point = { x: (area.left + area.right) / 2, y: area.top - 220 };
    const first: Point = {
      x: sky.x,
      y: area.top + (area.bottom - area.top) * 0.45,
    };
    const stops: Point[] = [first, ...bars.map((b) => b.center)];
    const arrives: number[] = [focusMs];
    for (let k = 1; k < stops.length; k++)
      arrives.push(
        arrives[k - 1] + lerp(legsMs, (k - 1) / Math.max(1, stops.length - 2)),
      );
    const settledAt = arrives[arrives.length - 1];
    const endAt = settledAt + igniteMs;
    const spot: Point = { x: 0, y: 0 };
    const focus = (ms: number): Point => {
      let k = 1;
      while (k < stops.length - 1 && ms > arrives[k]) k++;
      const u = smoothstep(
        clamp01((ms - arrives[k - 1]) / (arrives[k] - arrives[k - 1])),
      );
      spot.x = stops[k - 1].x + (stops[k].x - stops[k - 1].x) * u;
      spot.y = stops[k - 1].y + (stops[k].y - stops[k - 1].y) * u;
      return spot;
    };
    const width = (ms: number) =>
      ms < focusMs
        ? lerp([WIDE, HUNT], easeIn(ms / focusMs))
        : ms < settledAt
          ? HUNT
          : lerp([HUNT, PIN], clamp01((ms - settledAt) / igniteMs));

    let lastRumble = -Infinity;
    const scorching = createBeats(
      others,
      (_, k) => arrives[k + 1],
      (bar, k) => {
        const t = k / Math.max(1, others.length - 1);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), sky);
        cover!.burst(bar.center, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SCORCH_SHAKE, t));
      },
    );
    const igniting = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare, 3), sky);
        cover!.tierUp(own, sky);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
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
          scorching.tick(ms, now);
          igniting.tick(ms, now);
          if (
            ms > settledAt &&
            ms < endAt &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp([0.4, 1.2], (ms - settledAt) / igniteMs));
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= endAt) return;
          const at = focus(ms);
          const w = width(ms);
          // the soft shaft, then its hot core
          drawBeam(ctx, sky, at, w * 2.2, 0.25);
          drawBeam(ctx, sky, at, w, 0.7);
          const heat = ms < settledAt ? 0 : (ms - settledAt) / igniteMs;
          drawBeamFlare(ctx, at, lerp(FLARE, heat), 1, now);
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
