// the "Spot Weld" event (beam; a crit tier and free upgrade levels): it
// covers its crit, whose click freezes the screen while two aim lasers
// flicker down out of the sky onto the ends of the clicked floor's income
// bar; then both fire blazing beams and weld their way in along it from
// either end in fits and starts, sparks spraying and a white-hot seam
// glowing behind them, every quarter a flash, a bang, a jolt and free
// upgrade levels tallied over the bar; they meet in its middle in a huge
// blast and shake and the bar jumps one crit tier. Then the crit's tier pays
// out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardBars, levelsFor } from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "spotWeld";
const BLADE = 18;
const SEAM = 10;
const FLARE = 26;
const QUARTERS = [0.25, 0.5, 0.75];
const QUARTER_SHAKE: [number, number] = [0.9, 1.6];

export const forceSpotWeldEvent = registerWispEvent(
  KEY,
  "Spot Weld",
  () => CONFIG.spotWeldEvent.chance,
  (floor, context, area) => {
    const { aimMs, weldMs, levelShare, holdMs, mergeMs } = CONFIG.spotWeldEvent;
    const bar = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!bar) return;
    const skies: [Point, Point] = [
      { x: area.left - 40, y: area.top - 40 },
      { x: area.right + 40, y: area.top - 40 },
    ];
    const ends: [Point, Point] = [
      { x: bar.box.x, y: bar.center.y },
      { x: bar.box.x + bar.box.width, y: bar.center.y },
    ];
    const metAt = aimMs + weldMs;
    const levels = levelsFor(floor, levelShare);
    // how far in each beam has welded, in fits and starts
    const welded = (ms: number) => {
      const u = clamp01((ms - aimMs) / weldMs);
      return clamp01(u + 0.015 * Math.sin(u * 60));
    };
    const tips: [Point, Point] = [
      { x: 0, y: bar.center.y },
      { x: 0, y: bar.center.y },
    ];
    const place = (ms: number) => {
      const p = welded(ms) * (bar.box.width / 2);
      tips[0].x = ends[0].x + p;
      tips[1].x = ends[1].x - p;
      return tips;
    };

    const quartering = createBeats(
      QUARTERS,
      (q) => aimMs + weldMs * q,
      (q, k) => {
        cover!.levels(bar, levels);
        for (const tip of place(aimMs + weldMs * q))
          cover!.burst({ ...tip }, 0.5 + 0.2 * k);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(QUARTER_SHAKE, k / (QUARTERS.length - 1)));
      },
    );
    const meeting = createBeats(
      [metAt],
      (ms) => ms,
      () => {
        cover!.levels(bar, levels);
        cover!.tierUp(bar);
        cover!.slam(bar);
        cover!.blast(bar.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: metAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          quartering.tick(ms, now);
          meeting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= metAt) return;
          if (ms < aimMs) {
            drawAimLaser(ctx, skies[0], ends[0]);
            drawAimLaser(ctx, skies[1], ends[1]);
            return;
          }
          const heat = welded(ms);
          place(ms).forEach((tip, k) => {
            drawBeam(ctx, ends[k], tip, SEAM, 0.5 + 0.5 * heat);
            drawBeam(ctx, skies[k], tip, BLADE * (0.85 + 0.15 * Math.random()));
            drawBeamFlare(ctx, tip, FLARE, 1, now);
          });
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
