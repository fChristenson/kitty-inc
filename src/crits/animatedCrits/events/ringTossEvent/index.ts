// the "Ring Toss" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while wisps are tossed one after another out of the
// clicked floor's button in sky-high arcs, wobbling as they fly like rings
// at a fairground stall, each dropping dead onto an empty spot on a floor in
// view with a flash, a bloop and a jolt as a new worker forms there, ever
// quicker; the last lands in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "ringToss";
const MAX_HIRES = 6;
const FORM_MS = 300;
// each toss arcs LOB px over the higher end, wobbling WOBBLE px
const LOB = 260;
const WOBBLE = 14;
const RING = 0.36;
const LAND_SHAKE: [number, number] = [0.5, 1.2];

export const forceRingTossEvent = registerWispEvent(
  KEY,
  "Ring Toss",
  () => CONFIG.ringTossEvent.chance,
  (floor, context) => {
    const { gapsMs, flightMs, holdMs, mergeMs } = CONFIG.ringTossEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const tosses = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const tossed = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const lands = tossed + flightMs;
      const peak = Math.min(button.y, spot.y) - LOB;
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        tossed,
        lands,
        at: (ms: number): Point | null => {
          if (ms < tossed || ms >= lands) return null;
          const u = (ms - tossed) / flightMs;
          // a parabola through the button, the peak and the spot
          const a = button.y;
          const c = spot.y;
          const b = 4 * peak - 3 * a - c;
          const d = 2 * a + 2 * c - 4 * peak;
          at.x =
            lerp([button.x, spot.x], u) + Math.sin(u * 18) * WOBBLE * (1 - u);
          at.y = a + b * u + d * u * u;
          return at;
        },
      };
    });
    const last = tosses[tosses.length - 1];
    const endAt = last.lands;

    const tossing = createBeats(
      tosses,
      (t) => t.tossed,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      tosses,
      (t) => t.lands,
      (t, k) => {
        giveHire(t.hire);
        if (t === last) {
          cover!.blast(t.spot);
          return;
        }
        cover!.burst(t.spot, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, tosses.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          tossing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (const t of tosses)
            drawWispBetween(
              ctx,
              t.at,
              ms,
              now,
              WISP_SIZE * RING,
              0.5,
              t.tossed,
              t.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
