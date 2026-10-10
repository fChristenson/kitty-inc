// the "Sunrise" event (beam; free upgrade levels): it covers its crit, whose
// click freezes the screen while a sun wisp rises from below the screen's
// bottom, throwing a crown of blazing rays that fan out and wheel slowly as
// it climbs, longer and brighter the higher it gets; every income bar the
// sun rises past lights up with a flare, a bang and free levels; at the top
// it blazes out in a huge blast and shake as every bar slams. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "sunrise";
const MAX_BARS = 5;
const RAYS = 10;
// the rays reach REACH of the screen's height, wheeling WHEEL rad a second
const REACH: [number, number] = [0.15, 0.8];
const WHEEL = 0.4;
const RAY: [number, number] = [6, 16];
const SUN = 1.6;
const CORONA: [number, number] = [30, 80];
const RISE_SHAKE: [number, number] = [0.5, 1.3];

export const forceSunriseEvent = registerWispEvent(
  KEY,
  "Sunrise",
  () => CONFIG.sunriseEvent.chance,
  (floor, context, area) => {
    const { riseMs, blazeMs, levelShare, holdMs, mergeMs } =
      CONFIG.sunriseEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const height = area.bottom - area.top;
    const x = (area.left + area.right) / 2;
    const from = area.bottom + 80;
    const to = area.top + height * 0.15;
    const sunY = (ms: number) =>
      lerp([from, to], easeOut(clamp01(ms / riseMs)));
    const endAt = riseMs + blazeMs;
    // the sun passes y when easeOut(ms / riseMs) reaches its share
    const passes = bars
      .map((bar) => {
        const share = clamp01((from - bar.center.y) / (from - to));
        return { bar, at: riseMs * (1 - Math.sqrt(1 - share)) };
      })
      .sort((a, b) => a.at - b.at);
    const sunAt: Point = { x, y: 0 };
    const sun = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      sunAt.y = sunY(Math.min(ms, riseMs));
      return sunAt;
    };
    const tip: Point = { x: 0, y: 0 };
    const core: Point = { x, y: 0 };

    const lighting = createBeats(
      passes,
      (p) => p.at,
      (p, k) => {
        const t = k / Math.max(1, passes.length - 1);
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2), sunAt);
        cover!.burst(p.bar.center, 0.4 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(RISE_SHAKE, t));
      },
    );
    const blazing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast({ x, y: to });
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
          lighting.tick(ms, now);
          blazing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const u = clamp01(ms / endAt);
          core.y = sunY(Math.min(ms, riseMs));
          const reach = height * lerp(REACH, u);
          for (let i = 0; i < RAYS; i++) {
            const a = (i / RAYS) * Math.PI * 2 + (ms / 1000) * WHEEL;
            tip.x = x + Math.cos(a) * reach;
            tip.y = core.y + Math.sin(a) * reach;
            drawBeam(ctx, core, tip, lerp(RAY, u), 0.4 + 0.5 * u);
          }
          drawBeamFlare(ctx, core, lerp(CORONA, u), 1, now);
          drawWispBetween(ctx, sun, ms, now, WISP_SIZE * SUN, u, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
