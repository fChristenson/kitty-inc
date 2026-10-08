// the "Superlaser" event (beam): it covers its crit, whose click freezes the
// screen while emitters round its edges flicker aim lasers in on one point
// in its middle, then fire one after another, every beam converging on the
// focus with a flash, a bang and a jolt as it swells into a blazing ball and
// the screen rumbles; then the beams cut and the focus fires one colossal
// beam up into the total-income readout, a torrent of cash roaring up inside
// it, in a huge blast and shake, and the coins sweep into the total. Pays
// floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutCubic, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "superlaser";
const REWARD = 4;
// the emitters, as shares of the screen across and down, fired in order
const EMITTERS: Point[] = [
  { x: 0, y: 0.95 },
  { x: 1, y: 0.95 },
  { x: 0, y: 0.45 },
  { x: 1, y: 0.45 },
  { x: 0.2, y: 1 },
  { x: 0.8, y: 1 },
];
// the focus DROP of the screen's height under its middle, swelling up to
// FOCUS px; each beam BEAM px across, the last one MAIN
const DROP = 0.12;
const FOCUS: [number, number] = [16, 52];
const BEAM = 16;
const MAIN = 80;
const FIRE_MS = 90;
const MAIN_FADE_MS = 500;
const JOIN_BURST: [number, number] = [0.5, 1];
const JOIN_SHAKE: [number, number] = [1, 1.8];
const RUMBLE_MS = 70;
const RUMBLE = 1.2;

export const forceSuperlaserEvent = registerWispEvent(
  KEY,
  "Superlaser",
  () => CONFIG.superlaserEvent.chance,
  (floor, context, area) => {
    const { aimMs, gapMs, chargeMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.superlaserEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const focus: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const emitters = EMITTERS.map((e, k) => ({
      at: { x: area.left + width * e.x, y: area.top + height * e.y },
      fireAt: aimMs + k * gapMs,
    }));
    const joinAt = emitters.map((e) => e.fireAt + FIRE_MS);
    const allIn = joinAt[joinAt.length - 1];
    const shotAt = allIn + chargeMs;
    const column = sampleLine(
      (u) => ({
        x: focus.x + (fallback.x - focus.x) * u,
        y: focus.y + (fallback.y - focus.y) * u,
      }),
      30,
    );
    const pour: Pour = { coinsAlong: 1_500, width: 60, streamMs, travelMs };
    const topAt = shotAt + travelMs;
    const durationMs = Math.max(
      pourDurationMs(shotAt, pour),
      topAt + holdMs + mergeMs,
    );
    const tip = { x: 0, y: 0 };

    let lastRumble = -Infinity;
    const joins = createBeats(
      joinAt,
      (ms) => ms,
      (_, k) => {
        const t = k / (joinAt.length - 1);
        cover!.burst(focus, lerp(JOIN_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(JOIN_SHAKE, t));
      },
    );
    const shot = createBeats(
      [shotAt],
      (ms) => ms,
      () => {
        cover!.blast(focus);
        pourLine(cover!, column, pour);
      },
    );
    const finale = createBeats(
      [topAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          joins.tick(ms, now);
          shot.tick(ms, now);
          finale.tick(ms, now);
          if (
            ms > allIn &&
            ms < shotAt &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(RUMBLE);
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms < shotAt) {
            const charge = clamp01((ms - aimMs) / (shotAt - aimMs));
            for (const e of emitters) {
              if (ms < e.fireAt) {
                drawAimLaser(ctx, e.at, focus);
                continue;
              }
              const u = easeOutCubic(clamp01((ms - e.fireAt) / FIRE_MS));
              tip.x = e.at.x + (focus.x - e.at.x) * u;
              tip.y = e.at.y + (focus.y - e.at.y) * u;
              drawBeam(
                ctx,
                e.at,
                tip,
                BEAM * (1 + charge) * (0.9 + 0.1 * Math.random()),
              );
              drawBeamFlare(ctx, e.at, BEAM * 0.7, 1, now);
            }
            if (ms >= joinAt[0])
              drawBeamFlare(
                ctx,
                focus,
                lerp(FOCUS, charge) * (0.9 + 0.1 * Math.random()),
                1,
                now,
              );
            return;
          }
          // the colossal shot, thinning out
          const fade = 1 - clamp01((ms - shotAt) / (travelMs + MAIN_FADE_MS));
          if (fade <= 0) return;
          const total = cover?.total() ?? fallback;
          drawBeam(ctx, focus, total, MAIN * fade);
          drawBeamFlare(ctx, total, MAIN * 0.5 * fade, 1, now);
          drawBeamFlare(ctx, focus, MAIN * 0.4 * fade, 1, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
