// the "Siphon" event: it covers its crit, whose click freezes the screen while
// a wisp lights up just under the total-income readout and siphons cash up
// out of the clicked floor's button: a fat river of it spirals up a twisting
// straw of cash into the wisp, which swells and burns hotter as it drinks and
// the screen rumbles, then bursts into the total in a huge blast and shake,
// and the coins sweep into the total. Pays floor income × floor number ×
// REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "siphon";
const REWARD = 4;
// the straw: TURNS twists up from the button to the wisp, swinging SWING of
// the screen's width either side, narrowing as it rises
const TURNS = 2.5;
const SWING = 0.2;
// the wisp: BELOW of the screen's height under the total, swelling over WISP
// of its width
const BELOW = 0.12;
const WISP: [number, number] = [0.06, 0.15];
const POP_MS = 200;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.2, 1];

export const forceSiphonEvent = registerWispEvent(
  KEY,
  "Siphon",
  () => CONFIG.siphonEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.siphonEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const mouth: Point = { x: total.x, y: total.y + height * BELOW };
    const way = Math.random() < 0.5 ? 1 : -1;
    const straw = sampleLine(
      (u) => ({
        x:
          button.x +
          (mouth.x - button.x) * u +
          way *
            width *
            SWING *
            Math.sqrt(1 - u) *
            Math.sin(Math.PI * 2 * TURNS * u),
        y: button.y + (mouth.y - button.y) * u,
      }),
      160,
    );
    const pour: Pour = { coinsAlong: 1_700, width: 60, streamMs, travelMs };
    const burstAt = streamMs + travelMs;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      burstAt + holdMs + mergeMs,
    );
    const wispAt = (ms: number): Point | null =>
      ms < 0 || ms >= burstAt ? null : mouth;

    let lastRumble = -Infinity;
    const finale = createBeats(
      [burstAt],
      (ms) => ms,
      () => cover!.blast(mouth),
    );
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          finale.tick(ms, now);
          if (
            ms < burstAt &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, clamp01(ms / burstAt)));
          }
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / burstAt);
          const size =
            Math.max(WISP_SIZE, width * lerp(WISP, heat)) *
            easeOutBack(clamp01(ms / POP_MS));
          drawWispBetween(ctx, wispAt, ms, now, size, heat, 0, burstAt);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, straw, pour);
    playBoostEventStream();
  },
);
