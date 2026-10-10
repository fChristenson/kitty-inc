// the "Jet Stream" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a wide current of cash shoots
// up out of the clicked floor's button and roars across the top of the
// screen; as it passes, eddies of cash peel off it and curl down onto the
// income bars one after another, each landing with a splash and a jolt and
// free levels; the last lands in a huge blast and shake and the coins sweep
// into the total. Pays floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
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
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "jetStream";
const REWARD = 2;
const MAX_BARS = 4;
const EDGE = 30;
const HIGH = 130;
const CURL = 140;
const LAND_SHAKE: [number, number] = [0.5, 1.3];

export const forceJetStreamEvent = registerWispEvent(
  KEY,
  "Jet Stream",
  () => CONFIG.jetStreamEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, eddyMs, holdMs, mergeMs } =
      CONFIG.jetStreamEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const y = area.top + HIGH;
    const ltr = Math.random() < 0.5;
    const from: Point = { x: ltr ? area.left + EDGE : area.right - EDGE, y };
    const to: Point = { x: ltr ? area.right - EDGE : area.left + EDGE, y };
    const rise = 0.2;
    const jet = sampleLine(
      (u) =>
        u < rise
          ? {
              x: lerp([button.x, from.x], u / rise),
              y: lerp([button.y, y], u / rise),
            }
          : { x: lerp([from.x, to.x], (u - rise) / (1 - rise)), y },
      120,
    );
    const jetPour: Pour = { coinsAlong: 800, width: 50, streamMs, travelMs };
    const eddyPour: Pour = {
      coinsAlong: 300,
      width: 20,
      streamMs: streamMs * 0.5,
      travelMs: eddyMs,
    };
    const eddies = bars.map((bar, k) => {
      const u = (k + 0.5) / bars.length;
      const start: Point = { x: lerp([from.x, to.x], u), y };
      const ctrl: Point = {
        x: start.x + (ltr ? CURL : -CURL),
        y: (start.y + bar.center.y) / 2,
      };
      const line = sampleLine(
        (v) => bezier(start, ctrl, bar.center, v, { x: 0, y: 0 }),
        40,
      );
      const peels = travelMs * (rise + (1 - rise) * u);
      return { bar, start, line, peels, lands: peels + eddyMs };
    });
    const last = eddies[eddies.length - 1];
    const durationMs = Math.max(
      pourDurationMs(last.peels, eddyPour),
      pourDurationMs(0, jetPour),
      last.lands + holdMs + mergeMs,
    );

    const peeling = createBeats(
      eddies,
      (e) => e.peels,
      (e) => pourLine(cover!, e.line, eddyPour),
    );
    const landing = createBeats(
      eddies,
      (e) => e.lands,
      (e, k) => {
        cover!.levels(e.bar, levelsFor(e.bar.floor), e.start);
        if (e === last) {
          cover!.slam(e.bar);
          cover!.blast(e.bar.center);
          return;
        }
        cover!.burst(e.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, eddies.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          peeling.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, jet, jetPour);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
