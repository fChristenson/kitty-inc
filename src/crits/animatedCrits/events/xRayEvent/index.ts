// the "X-Ray" event (beam; free hires): it covers its crit, whose click
// freezes the screen while two wisps fly out of the clicked floor's button
// to the top corners and stretch a blazing sheet of light between them;
// it sweeps down the screen like an X-ray scanner, ever faster, and every
// empty spot it passes over lights up with a flash, a bang and a jolt as
// a new worker is revealed standing there; at the bottom the scan flares
// out in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "xRay";
const MAX_HIRES = 6;
const FORM_MS = 300;
const EDGE = 16;
const SHEET = 16;
const GLOW = 70;
const EMITTER = 0.55;
const REVEAL_SHAKE: [number, number] = [0.6, 1.3];

export const forceXRayEvent = registerWispEvent(
  KEY,
  "X-Ray",
  () => CONFIG.xRayEvent.chance,
  (floor, context, area) => {
    const { setMs, scanMs, holdMs, mergeMs } = CONFIG.xRayEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const top = area.top + EDGE;
    const bottom = area.bottom - EDGE;
    const lineAt = (ms: number) =>
      lerp([top, bottom], easeIn(clamp01((ms - setMs) / scanMs)));
    const passesAt = (y: number) =>
      setMs + scanMs * Math.sqrt(clamp01((y - top) / (bottom - top)));
    const reveals = hires
      .map((hire) => ({
        hire,
        at: passesAt(hire.y - 20),
        spot: { x: hire.x, y: hire.y - 20 },
      }))
      .sort((a, b) => a.at - b.at);
    const endAt = setMs + scanMs;
    const ends = [area.left + EDGE, area.right - EDGE].map((x) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        if (ms < setMs) {
          const u = easeOut(ms / setMs);
          at.x = lerp([button.x, x], u);
          at.y = lerp([button.y, top], u);
        } else {
          at.x = x;
          at.y = lineAt(ms);
        }
        return at;
      };
    });
    const from: Point = { x: area.left + EDGE, y: 0 };
    const to: Point = { x: area.right - EDGE, y: 0 };

    const revealing = createBeats(
      reveals,
      (r) => r.at,
      (r, k) => {
        giveHire(r.hire);
        cover!.burst(r.spot, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(REVEAL_SHAKE, k / Math.max(1, reveals.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast({ x: (from.x + to.x) / 2, y: bottom }),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          revealing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_200) return;
          if (ms >= setMs && ms <= endAt) {
            from.y = to.y = lineAt(ms);
            drawBeam(ctx, from, to, GLOW, 0.25);
            drawBeam(ctx, from, to, SHEET, 0.9);
          }
          for (const end of ends)
            drawWispBetween(
              ctx,
              end,
              ms,
              now,
              WISP_SIZE * EMITTER,
              0.8,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
