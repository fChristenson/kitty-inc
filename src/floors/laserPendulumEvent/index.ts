// the "Laser Pendulum" event (beam; free upgrade levels and a crit tier):
// it covers its crit, whose click freezes the screen while a blazing beam
// drops down out of the sky and swings like a pendulum across the screen,
// every swing wider and faster; every income bar it slices through jolts
// with a flare, a bang and free levels; at the top of its last swing it
// whips round onto the clicked floor's bar and locks on, blazing twice as
// thick, and the bar jumps a crit tier in a huge blast and shake
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardBars, levelsFor } from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "laserPendulum";
const MAX_BARS = 5;
// it swings out to SWING rad either side of straight down
const SWING: [number, number] = [0.2, 0.85];
const BEAM = 18;
const LOCK = 2;
const FLARE = 30;
const FLASH_MS = 200;
const CUT_SHAKE: [number, number] = [0.5, 1.2];

export const forceLaserPendulumEvent = registerWispEvent(
  KEY,
  "Laser Pendulum",
  () => CONFIG.laserPendulumEvent.chance,
  (floor, context, area) => {
    const { swingMs, periodsMs, lockMs, levelShare, holdMs, mergeMs } =
      CONFIG.laserPendulumEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const bars = [
      ...found.filter((b) => b !== own).slice(0, MAX_BARS - 1),
      own,
    ];
    const pivot: Point = { x: (area.left + area.right) / 2, y: area.top - 60 };
    const reach = area.bottom - pivot.y + 200;
    const lead = Math.random() < 0.5 ? 1 : -1;
    // the swing's phase, quickening from one period to the next
    const phase = (ms: number) => {
      const u = clamp01(ms / swingMs);
      const period = lerp(periodsMs, u);
      return (Math.PI * 2 * ms) / period;
    };
    const swing = (ms: number) =>
      lead * lerp(SWING, easeOut(clamp01(ms / swingMs))) * Math.sin(phase(ms));
    const angleTo = (p: Point) => Math.atan2(p.x - pivot.x, p.y - pivot.y);
    const ownAngle = angleTo(own.center);
    const lockAt = swingMs + lockMs;
    const endAt = lockAt;
    const angle = (ms: number) =>
      ms <= swingMs
        ? swing(ms)
        : lerp(
            [swing(swingMs), ownAngle],
            easeIn(clamp01((ms - swingMs) / lockMs)),
          );
    // every time the beam slices through each bar's middle
    const cuts: { bar: (typeof bars)[number]; at: number }[] = [];
    for (const bar of bars) {
      const a = angleTo(bar.center);
      let before = swing(0) - a;
      for (let ms = 8; ms <= swingMs; ms += 8) {
        const now = swing(ms) - a;
        if (before * now < 0) cuts.push({ bar, at: ms });
        before = now;
      }
    }
    cuts.sort((a, b) => a.at - b.at);
    const tip: Point = { x: 0, y: 0 };
    const beamTo = (a: number) => {
      tip.x = pivot.x + Math.sin(a) * reach;
      tip.y = pivot.y + Math.cos(a) * reach;
      return tip;
    };

    const cutting = createBeats(
      cuts,
      (c) => c.at,
      (c, k) => {
        const t = k / Math.max(1, cuts.length - 1);
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 1), pivot);
        cover!.burst(c.bar.center, 0.4 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CUT_SHAKE, t));
      },
    );
    const whipping = createBeats(
      [swingMs],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const locking = createBeats(
      [lockAt],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare, 3), pivot);
        cover!.tierUp(own, pivot);
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
          cutting.tick(ms, now);
          whipping.tick(ms, now);
          locking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLASH_MS) return;
          if (ms >= lockAt) {
            const fade = 1 - (ms - lockAt) / FLASH_MS;
            drawBeam(ctx, pivot, own.center, BEAM * LOCK, fade);
            drawBeamFlare(ctx, own.center, FLARE * 2, fade, now);
            return;
          }
          const a = angle(ms);
          drawBeam(ctx, pivot, beamTo(a), BEAM);
          if (ms > swingMs) {
            const u = (ms - swingMs) / lockMs;
            drawBeamFlare(ctx, own.center, FLARE * u, u, now);
          }
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
