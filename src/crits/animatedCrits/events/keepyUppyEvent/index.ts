// the "Keepy Uppy" event (experiment: keepy-uppy; cash): it covers its crit,
// whose click freezes the screen while a ball wisp pops out of the clicked
// floor's button onto a juggler wisp's foot and it starts keeping it up:
// every touch a pop, a jolt, a burst of coins and the count slamming up,
// "1!", "2!", "3!" …, the kicks ever higher and quicker, until "10!" and a
// mighty volley blasts the ball up to the top of the screen in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { COLOR } from "../../../../palette";

const KEY = "keepyUppy";
const REWARD = 4;
const TOUCHES = 10;
const BOTTOM = 130;
const TOP = 200;
const HEIGHT: [number, number] = [90, 320];
const SETUP_MS = 220;
const VOLLEY_MS = 260;
const CALL_MS = 260;
const STYLE = { fontSize: 50, strokeWidth: 8 };
const BALL = 0.38;
const FOOT = 0.45;
const COINS = 16;
const COIN_REACH: [number, number] = [30, 120];
const TOUCH_SHAKE: [number, number] = [0.3, 0.9];

export const forceKeepyUppyEvent = registerWispEvent(
  KEY,
  "Keepy Uppy",
  () => CONFIG.keepyUppyEvent.chance,
  (floor, context, area) => {
    const { touchesMs, holdMs, mergeMs } = CONFIG.keepyUppyEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const foot: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - BOTTOM,
    };
    const sky: Point = { x: foot.x, y: area.top + TOP };
    const counts = Array.from({ length: TOUCHES }, (_, i) =>
      createCritTextSprite(`${i + 1}!`, COLOR.heavenlyGold, STYLE),
    );
    let clock: number = SETUP_MS;
    const touches = Array.from({ length: TOUCHES }, (_, i) => {
      const u = i / (TOUCHES - 1);
      const ms = clock;
      clock += lerp(touchesMs, u);
      // each touch sends it up this high, landing back on the foot at the next
      return {
        i,
        ms,
        next: clock,
        height: lerp(HEIGHT, u),
        x: foot.x + (i % 2 === 0 ? -20 : 20),
      };
    });
    const last = touches[TOUCHES - 1];
    const volleys = last.ms;
    const endAt = volleys + VOLLEY_MS;
    const ballAt: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point => {
      if (ms < SETUP_MS) {
        const u = easeOut(clamp01(ms / SETUP_MS));
        ballAt.x = lerp([button.x, foot.x], u);
        ballAt.y = lerp([button.y, foot.y], u);
        return ballAt;
      }
      if (ms >= volleys) {
        const u = easeOut(clamp01((ms - volleys) / VOLLEY_MS));
        ballAt.x = lerp([foot.x, sky.x], u);
        ballAt.y = lerp([foot.y, sky.y], u);
        return ballAt;
      }
      let t = touches[0];
      for (const touch of touches) if (ms >= touch.ms) t = touch;
      const u = clamp01((ms - t.ms) / (t.next - t.ms));
      ballAt.x = lerp([t.x, foot.x], u);
      ballAt.y = foot.y - 4 * u * (1 - u) * t.height;
      return ballAt;
    };
    const kickerAt: Point = { x: 0, y: 0 };
    const kicker = (ms: number): Point => {
      let t = touches[0];
      for (const touch of touches) if (ms >= touch.ms) t = touch;
      const kick = Math.max(0, 1 - Math.abs(ms - t.ms) / 80);
      kickerAt.x = foot.x;
      kickerAt.y = foot.y + 24 - kick * 14;
      return kickerAt;
    };

    const touching = createBeats(
      touches,
      (t) => t.ms,
      (t) => {
        cover!.launchFrom(foot, ringTargets(foot, COINS + t.i * 2, COIN_REACH));
        cover!.burst(foot, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TOUCH_SHAKE, t.i / (TOUCHES - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.launchFrom(sky, ringTargets(sky, COINS * 4, COIN_REACH));
        cover!.blast(sky);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          touching.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const t of touches) {
            const c = (ms - t.ms) / CALL_MS;
            if (c < 0 || c >= 1) continue;
            ctx.globalAlpha = 1 - c * c;
            drawCritTextSprite(
              ctx,
              counts[t.i],
              foot.x + 120,
              foot.y - 80,
              (t === last ? 1.5 : 1) * (1 + 0.4 * (1 - clamp01(c * 3))),
            );
            ctx.globalAlpha = 1;
          }
          drawWispBetween(
            ctx,
            kicker,
            ms,
            now,
            WISP_SIZE * FOOT,
            0.4,
            SETUP_MS,
            volleys + 100,
          );
          drawWispBetween(ctx, ball, ms, now, WISP_SIZE * BALL, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
