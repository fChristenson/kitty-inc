// the "Cash Bridge" event (money; free hires and cash): it covers its crit,
// whose click freezes the screen while a river of cash leaps out of the
// clicked floor's button in a tall arch and comes down on an empty spot,
// where a new worker forms with a splash and a jolt; from there the next
// arch springs to the next spot, span after span like a bridge across the
// screen, ever faster, the last span landing in a huge blast and shake as
// the cash sweeps into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "cashBridge";
const REWARD = 2;
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const ARCH = 180;
const STEPS = 40;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceCashBridgeEvent = registerWispEvent(
  KEY,
  "Cash Bridge",
  () => CONFIG.cashBridgeEvent.chance,
  (floor, context) => {
    const { spansMs, holdMs, mergeMs } = CONFIG.cashBridgeEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => Math.abs(a.x - button.x) - Math.abs(b.x - button.x));
    if (hires.length === 0) return;
    const into: Point = { x: 0, y: 0 };
    let clock = 0;
    let from: Point = button;
    const spans = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const a = from;
      const ctrl: Point = {
        x: (a.x + spot.x) / 2,
        y: Math.min(a.y, spot.y) - ARCH - Math.abs(spot.x - a.x) * 0.15,
      };
      const line = sampleLine(
        (u) => ({ ...bezier(a, ctrl, spot, u, into) }),
        STEPS,
      );
      const travelMs = lerp(spansMs, k / Math.max(1, hires.length - 1));
      const pour: Pour = {
        coinsAlong: 340,
        width: 28,
        streamMs: travelMs * 0.7,
        travelMs,
      };
      const starts = clock;
      clock += travelMs;
      from = spot;
      return { hire, spot, line, pour, starts, lands: clock };
    });
    const last = spans[spans.length - 1];
    const endAt = last.lands;
    const durationMs = Math.max(
      pourDurationMs(last.starts, last.pour),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      spans,
      (s) => s.starts,
      (s) => pourLine(cover!, s.line, s.pour),
    );
    const landing = createBeats(
      spans,
      (s) => s.lands,
      (s, k) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.spot);
          return;
        }
        cover!.burst(s.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, spans.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, _ms, now) => drawRewardHires(ctx, hires, now, FORM_MS),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
