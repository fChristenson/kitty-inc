// the "Fiber Optic" event (beam; free hires): it covers its crit, whose click
// freezes the screen while fibers of light snake out of the clicked floor's
// button one after another, each a blazing beam bending in a long curve to
// an empty spot on a floor in view, a pulse of light racing down it; as each
// pulse arrives it flares with a crack and a jolt and a new worker forms
// there; the last lands in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
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
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "fiberOptic";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const SEGMENTS = 12;
const BEND = 180;
const FIBER = 8;
const FLARE = 40;
const FLARE_MS = 300;
const FADE_MS = 300;
const PULSE = 0.35;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceFiberOpticEvent = registerWispEvent(
  KEY,
  "Fiber Optic",
  () => CONFIG.fiberOpticEvent.chance,
  (floor, context) => {
    const { gapsMs, fiberMs, holdMs, mergeMs } = CONFIG.fiberOpticEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const fibers = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const side = k % 2 === 0 ? 1 : -1;
      const ctrl: Point = {
        x: (button.x + spot.x) / 2 + side * BEND,
        y: (button.y + spot.y) / 2,
      };
      const points = Array.from({ length: SEGMENTS + 1 }, (_, i) =>
        bezier(button, ctrl, spot, i / SEGMENTS, { x: 0, y: 0 }),
      );
      const fires = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const pulseAt: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        points,
        fires,
        lands: fires + fiberMs,
        pulse: (ms: number): Point =>
          bezier(button, ctrl, spot, clamp01((ms - fires) / fiberMs), pulseAt),
      };
    });
    const last = fibers[fibers.length - 1];
    const endAt = last.lands;

    const landing = createBeats(
      fibers,
      (f) => f.lands,
      (f, k) => {
        giveHire(f.hire);
        if (f === last) {
          cover!.blast(f.spot);
          return;
        }
        cover!.burst(f.spot, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, fibers.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + FADE_MS) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / FADE_MS : 1;
          for (const f of fibers) {
            if (ms < f.fires) continue;
            // the fiber shoots out ahead of its pulse, then stays lit
            const grown = clamp01(((ms - f.fires) / fiberMs) * 2) * SEGMENTS;
            for (let i = 1; i <= grown; i++)
              drawBeam(ctx, f.points[i - 1], f.points[i], FIBER, 0.7 * fade);
            drawWispBetween(
              ctx,
              f.pulse,
              ms,
              now,
              WISP_SIZE * PULSE,
              1,
              f.fires,
              f.lands,
            );
            const flare = (ms - f.lands) / FLARE_MS;
            if (flare >= 0 && flare < 1)
              drawBeamFlare(
                ctx,
                f.spot,
                FLARE * (1 - flare * 0.5),
                1 - flare,
                now,
              );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
