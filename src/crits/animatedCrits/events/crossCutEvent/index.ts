// the "Cross-Cut" event (beam; crit tiers): it covers its crit, whose click
// freezes the screen while two beams slice in from the edges of the screen,
// one sweeping across and one sweeping down, closing on an income bar from
// two sides; where they cross on it the light burns white-hot in a flare,
// a bang and a big jolt, and the bar jumps a crit tier; they sweep on to
// cross on the next bar, ever faster, the last crossing burning out in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "crossCut";
const MAX_BARS = 3;
const TOP = 120;
const WIDTH = 16;
const BURN_MS = 160;
const FLARE = 70;
const HIT_SHAKE: [number, number] = [0.9, 1.5];

export const forceCrossCutEvent = registerWispEvent(
  KEY,
  "Cross-Cut",
  () => CONFIG.crossCutEvent.chance,
  (floor, context, area) => {
    const { sweepsMs, holdMs, mergeMs } = CONFIG.crossCutEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const top = area.top + TOP;
    let clock = 0;
    let fromX = area.left;
    let fromY = top;
    const cuts = bars.map((bar, k) => {
      const starts = clock;
      const crosses = starts + lerp(sweepsMs, k / Math.max(1, bars.length - 1));
      clock = crosses + BURN_MS;
      const cut = { bar, fromX, fromY, starts, crosses, burns: clock };
      fromX = bar.center.x;
      fromY = bar.center.y;
      return cut;
    });
    const last = cuts[cuts.length - 1];
    const endAt = last.burns;
    // the two beams: one vertical at x, one horizontal at y
    const vTop: Point = { x: 0, y: top };
    const vBottom: Point = { x: 0, y: area.bottom };
    const hLeft: Point = { x: area.left, y: 0 };
    const hRight: Point = { x: area.right, y: 0 };
    const crossing: Point = { x: 0, y: 0 };

    const sweeping = createBeats(
      cuts,
      (c) => c.starts,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const burning = createBeats(
      cuts,
      (c) => c.burns,
      (c, k) => {
        cover!.tierUp(c.bar, c.bar.center);
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          return;
        }
        cover!.burst(c.bar.center, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, cuts.length - 1)));
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
          sweeping.tick(ms, now);
          burning.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          let c = cuts[0];
          for (const cut of cuts) if (ms >= cut.starts) c = cut;
          const u = smoothstep(
            clamp01((ms - c.starts) / (c.crosses - c.starts)),
          );
          const x = lerp([c.fromX, c.bar.center.x], u);
          const y = lerp([c.fromY, c.bar.center.y], u);
          vTop.x = x;
          vBottom.x = x;
          hLeft.y = y;
          hRight.y = y;
          const burn = clamp01((ms - c.crosses) / BURN_MS);
          const width = WIDTH * (1 + burn);
          drawBeam(ctx, vTop, vBottom, width, 0.7 + 0.3 * burn);
          drawBeam(ctx, hLeft, hRight, width, 0.7 + 0.3 * burn);
          crossing.x = x;
          crossing.y = y;
          drawBeamFlare(ctx, crossing, FLARE * (0.3 + easeOut(burn)), 1, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
