// the "Braid" event: it covers its crit, whose click freezes the screen while
// three rivers of cash gush up out of the clicked floor's button and braid
// round each other all the way up into the total-income readout, twisting
// tighter as they climb, every twist a flash and a jolt; when the last of
// the cash lands, the total goes off in a huge blast and shake. Pays floor
// income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pointAlong,
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "braid";
const REWARD = 4;
// the strands: STRANDS of them twisting TWISTS times, swinging SWING of the
// screen's width either side of the middle line, the line bowed BOW of it
const STRANDS = 3;
const TWISTS = 2.5;
const SWING = 0.2;
const BOW = 0.08;
// each twist the heads pass: a burst, a bloop and a jolt, growing
const TWIST_BURST: [number, number] = [0.5, 1];
const TWIST_SHAKE: [number, number] = [0.8, 1.8];

export const forceBraidEvent = registerWispEvent(
  KEY,
  "Braid",
  () => CONFIG.braidEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.braidEvent;
    const width = area.right - area.left;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const bow = width * BOW * (Math.random() < 0.5 ? 1 : -1);
    const spine = (u: number) => ({
      x: button.x + (total.x - button.x) * u + bow * Math.sin(Math.PI * u),
      y: button.y + (total.y - button.y) * u,
    });
    const strands = Array.from({ length: STRANDS }, (_, k) =>
      sampleLine((u) => {
        const at = spine(u);
        // fading the swing in and out so every strand leaves and lands together
        const swing = width * SWING * Math.sqrt(Math.sin(Math.PI * u));
        at.x += swing * Math.sin(Math.PI * 2 * (TWISTS * u + k / STRANDS));
        return at;
      }, 160),
    );
    const middle = sampleLine(spine, 40);
    const along = measure(middle);
    const pour: Pour = { coinsAlong: 620, width: 20, streamMs, travelMs };
    const twists = Array.from(
      { length: Math.ceil(TWISTS) },
      (_, k) => (k + 0.5) / TWISTS,
    );
    const endAt = streamMs + travelMs;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      endAt + holdMs + mergeMs,
    );

    const twisting = createBeats(
      twists,
      (u) => u * travelMs,
      (u, k) => {
        const t = k / (twists.length - 1);
        cover!.burst(
          pointAlong(middle, along, u, { x: 0, y: 0 }),
          lerp(TWIST_BURST, t),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TWIST_SHAKE, t));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          twisting.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    for (const strand of strands) pourLine(cover, strand, pour);
    playBoostEventStream();
  },
);
