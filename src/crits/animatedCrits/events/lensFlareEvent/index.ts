// the "Lens Flare" event (beam; crit tiers): it covers its crit, whose
// click freezes the screen while a blinding sun flares up at its top-left
// corner, a long streak of light slashing sideways through it and a chain
// of glowing lens ghosts strung across the screen from it; the sun slides
// down the screen's edge, ever faster, the ghosts swinging the other way
// up the far side, and every income bar the big ghost crosses blazes with
// a flash and a jolt and jumps a crit tier; the last flares out in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { findRewardBars } from "../../eventRewards";

const KEY = "lensFlare";
const MAX_BARS = 3;
// ghosts sit these shares along the line from the sun through the middle
// and on, each this big
const GHOSTS: [number, number][] = [
  [0.45, 14],
  [0.8, 30],
  [1.15, 18],
  [1.5, 44],
  [2, 70],
];
const EDGE = 26;
const SUN = 46;
const STREAK = 10;
const GHOST_GLOW = fadeStops(COLOR.heavenlyGold, 0.5);
const RIM_GLOW = fadeStops(COLOR.white, 0.85);
const CROSS_SHAKE: [number, number] = [0.8, 1.5];

export const forceLensFlareEvent = registerWispEvent(
  KEY,
  "Lens Flare",
  () => CONFIG.lensFlareEvent.chance,
  (floor, context, area) => {
    const { riseMs, slideMs, holdMs, mergeMs } = CONFIG.lensFlareEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const top = area.top + EDGE;
    const bottom = area.bottom - EDGE;
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const sun: Point = { x: area.left + EDGE, y: top };
    const slideU = (ms: number) => easeIn(clamp01((ms - riseMs) / slideMs));
    const placeSun = (ms: number) => {
      sun.y = lerp([top, bottom], slideU(ms));
      return sun;
    };
    // the big ghost mirrors the sun through the middle: it crosses a bar at
    // y when the sun is at 2 × middle - y
    const crosses = bars
      .map((bar) => {
        const sunY = 2 * center.y - bar.center.y;
        const u = clamp01((sunY - top) / (bottom - top));
        return { bar, at: riseMs + slideMs * Math.sqrt(u) };
      })
      .sort((a, b) => a.at - b.at);
    const last = crosses[crosses.length - 1];
    const endAt = Math.max(riseMs + slideMs, last.at);
    const streakFrom: Point = { x: 0, y: 0 };
    const streakTo: Point = { x: 0, y: 0 };

    const crossing = createBeats(
      crosses,
      (c) => c.at,
      (c, k) => {
        cover!.tierUp(c.bar, sun);
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          return;
        }
        cover!.burst(c.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CROSS_SHAKE, k / Math.max(1, crosses.length - 1)));
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
        tick: (ms, now) => crossing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 300) return;
          const fade =
            Math.min(1, ms / riseMs) *
            (ms > endAt ? 1 - (ms - endAt) / 300 : 1);
          const s = placeSun(ms);
          streakFrom.x = area.left;
          streakTo.x = area.right;
          streakFrom.y = streakTo.y = s.y;
          drawBeam(ctx, streakFrom, streakTo, STREAK, 0.6 * fade);
          drawBeamFlare(ctx, s, SUN * fade, fade, now);
          ctx.globalCompositeOperation = "lighter";
          for (const [share, size] of GHOSTS) {
            const x = s.x + (center.x - s.x) * share;
            const y = s.y + (center.y - s.y) * share;
            ctx.globalAlpha = 0.35 * fade;
            drawGlow(ctx, GHOST_GLOW, x, y, size);
            ctx.globalAlpha = 0.25 * fade;
            drawGlow(ctx, RIM_GLOW, x, y, size * 1.1);
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
