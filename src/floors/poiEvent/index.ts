// the "Poi" event (mix; cash): it covers its crit, whose click freezes the
// screen while two wisps fly out of the clicked floor's button and start
// spinning like a fire dancer's poi either side of the screen's middle, each
// trailing a river of cash that loops out into great four-petalled flowers,
// one whirling each way, every petal tip a whoosh and a jolt; then both
// flowers close and the poi slam together in the middle in a huge blast and
// shake as the coins sweep into the total. Pays floor income × floor number
// × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../cashFlow";

const KEY = "poi";
const REWARD = 4;
// each poi swings on an arm ARM px long round its hand, its head spinning
// back SPINS times a turn round SPIN px, making SPINS + 1 petals
const ARM = 110;
const SPIN = 60;
const SPINS = 3;
const SPREAD = 0.24;
const LEAD = 0.08;
const POI = 0.5;
const TIP_SHAKE: [number, number] = [0.3, 1.1];

export const forcePoiEvent = registerWispEvent(
  KEY,
  "Poi",
  () => CONFIG.poiEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.poiEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const width = area.right - area.left;
    const pour: Pour = { coinsAlong: 1_000, width: 24, streamMs, travelMs };
    const poi = [-1, 1].map((side) => {
      const hand: Point = { x: center.x + side * width * SPREAD, y: center.y };
      const first: Point = { x: hand.x + ARM + SPIN, y: hand.y };
      const line = sampleLine((u) => {
        if (u < LEAD) {
          const v = u / LEAD;
          return {
            x: lerp([button.x, first.x], v),
            y: lerp([button.y, first.y], v),
          };
        }
        const a = ((u - LEAD) / (1 - LEAD)) * Math.PI * 2 * side;
        return {
          x: hand.x + Math.cos(a) * ARM + Math.cos(-SPINS * a) * SPIN,
          y: hand.y + Math.sin(a) * ARM + Math.sin(-SPINS * a) * SPIN,
        };
      }, 160);
      return { line, head: riverHead(line, travelMs) };
    });
    // the petal tips, where arm and head line up, the last at the finale
    const tips = Array.from(
      { length: SPINS + 1 },
      (_, k) => travelMs * (LEAD + ((1 - LEAD) * k) / (SPINS + 1)),
    ).slice(1);
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      travelMs + holdMs + mergeMs,
    );

    const tipping = createBeats(
      tips,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(TIP_SHAKE, k / (tips.length - 1)));
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          tipping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > travelMs) return;
          for (const p of poi)
            drawWispBetween(
              ctx,
              p.head,
              ms,
              now,
              WISP_SIZE * POI,
              0.8,
              0,
              travelMs,
            );
        },
      },
    );
    if (!cover) return;
    for (const p of poi) pourLine(cover, p.line, pour);
    playBoostEventStream();
  },
);
