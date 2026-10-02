// the "Beam Clash" event (beam): it covers its crit, whose click freezes the
// screen while two aim lasers flicker in from its sides and two blazing
// beams fire from either edge and slam together in the middle, the clash
// point shoving back and forth, harder and harder, spraying cash off it
// with every shove as the screen rumbles; then both beams overload in a
// blinding flash and blast, and a roaring geyser of cash bursts up out of
// the clash into the total-income readout, which goes off in a huge blast
// and shake. Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutCubic, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../shared/beam";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";
import type { Point } from "../../shared/wisp";

const KEY = "beamClash";
const REWARD = 4;
// the beams cross the screen DROP of its height under its middle, BEAM px
// across, swelling to SURGE times that as they overload
const DROP = 0.08;
const BEAM = 30;
const SURGE = 2.2;
// the shoves: SHOVES of them, pushing the clash up to PUSH of the screen's
// width off the middle, alternating sides, harder each time
const SHOVES = 7;
const PUSH: [number, number] = [0.06, 0.24];
const FLARE: [number, number] = [36, 70];
const SHOVE_COINS = 22;
const SHOVE_REACH: [number, number] = [40, 140];
const SHOVE_SHAKE: [number, number] = [0.9, 2];

export const forceBeamClashEvent = registerWispEvent(
  KEY,
  "Beam Clash",
  () => CONFIG.beamClashEvent.chance,
  (floor, context, area) => {
    const {
      aimMs,
      fireMs,
      clashMs,
      overloadMs,
      streamMs,
      travelMs,
      holdMs,
      mergeMs,
    } = CONFIG.beamClashEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const y = (area.top + area.bottom) / 2 + height * DROP;
    const mid = (area.left + area.right) / 2;
    const sides: [Point, Point] = [
      { x: area.left - 10, y },
      { x: area.right + 10, y },
    ];
    const meetAt = aimMs + fireMs;
    const shoveGap = clashMs / SHOVES;
    const shoves = Array.from({ length: SHOVES }, (_, k) => ({
      at: meetAt + k * shoveGap,
      to: mid + (k % 2 === 0 ? 1 : -1) * width * lerp(PUSH, k / (SHOVES - 1)),
    }));
    const blowAt = meetAt + clashMs + overloadMs;
    // the clash point: shoved one way then the other, snapping back to the
    // middle as they overload
    const clashX = (ms: number) => {
      let from = mid;
      let x = mid;
      for (const s of shoves) {
        if (ms < s.at) break;
        x =
          from +
          (s.to - from) * easeOutCubic(clamp01((ms - s.at) / (shoveGap * 0.6)));
        from = s.to;
      }
      const back = clamp01((ms - meetAt - clashMs) / overloadMs);
      return x + (mid - x) * back;
    };
    const clash: Point = { x: mid, y };
    const geyser = sampleLine(
      (u) =>
        bezier(clash, { x: mid, y: fallback.y + height * 0.2 }, fallback, u, {
          x: 0,
          y: 0,
        }),
      30,
    );
    const pour: Pour = { coinsAlong: 1_400, width: 90, streamMs, travelMs };
    const topAt = blowAt + travelMs;
    const durationMs = Math.max(
      pourDurationMs(blowAt, pour),
      topAt + holdMs + mergeMs,
    );

    const shoving = createBeats(
      shoves,
      (s) => s.at,
      (s, k) => {
        const at = { x: s.to, y };
        const t = k / (SHOVES - 1);
        cover!.launchFrom(
          at,
          sprayTargets(
            at,
            SHOVE_COINS,
            SHOVE_REACH,
            -Math.PI / 2,
            Math.PI * 1.4,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SHOVE_SHAKE, t));
      },
    );
    const blow = createBeats(
      [blowAt],
      (ms) => ms,
      () => {
        cover!.blast(clash);
        pourLine(cover!, geyser, pour);
      },
    );
    const finale = createBeats(
      [topAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );
    const meet = { x: 0, y };
    const tips = [
      { x: 0, y },
      { x: 0, y },
    ];

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          shoving.tick(ms, now);
          blow.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms >= blowAt) return;
          if (ms < aimMs) {
            drawAimLaser(ctx, sides[0], { x: mid, y });
            drawAimLaser(ctx, sides[1], { x: mid, y });
            return;
          }
          const reach = easeOutCubic(clamp01((ms - aimMs) / fireMs));
          const strain = clamp01((ms - meetAt) / (clashMs + overloadMs));
          const surge = 1 + (SURGE - 1) * strain * strain;
          const wobble = BEAM * surge * (0.88 + 0.12 * Math.random());
          meet.x = clashX(ms);
          sides.forEach((side, k) => {
            tips[k].x = side.x + (meet.x - side.x) * reach;
            drawBeam(ctx, side, tips[k], wobble);
          });
          if (ms >= meetAt)
            drawBeamFlare(
              ctx,
              meet,
              lerp(FLARE, strain) * (0.85 + 0.15 * Math.random()),
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
