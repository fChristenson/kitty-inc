// the "Wet Dog" event (mix; cash): it covers its crit, whose click freezes
// the screen while a downpour of cash crashes onto a wisp in the middle of
// the screen and clings to it in a sopping ball; then it shakes itself off
// like a wet dog, wiggling wildly from side to side, each shake flinging a
// spray of cash flying every way with a jolt, harder each time, the last
// shake flinging off the lot in a huge blast and shake as the cash pours
// into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOut,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "wetDog";
const REWARD = 4;
const COINS = 650;
const COIN = 0.5;
const BALL = 120;
const HEIGHT = 0.5;
const SHAKES = 4;
// each shake wiggles this many times, this far each way
const WIGGLES = 5;
const WIGGLE = 40;
const FLING: [number, number] = [220, 520];
const FLING_MS = 420;
const WISP = 0.8;
const SHAKE_SHAKE: [number, number] = [0.6, 1.3];

export const forceWetDogEvent = registerWispEvent(
  KEY,
  "Wet Dog",
  () => CONFIG.wetDogEvent.chance,
  (floor, context, area) => {
    const { soakMs, firstMs, shakesMs, shakeMs, holdMs, mergeMs } =
      CONFIG.wetDogEvent;
    const width = area.right - area.left;
    const dog: Point = {
      x: area.left + width / 2,
      y: area.top + (area.bottom - area.top) * HEIGHT,
    };
    let clock: number = soakMs + firstMs;
    const shakes = Array.from({ length: SHAKES }, (_, k) => {
      const at = clock;
      clock += lerp(shakesMs, k / (SHAKES - 1));
      return at;
    });
    const lastShake = shakes[SHAKES - 1];
    const endAt = lastShake + shakeMs;
    const travel = endAt + FLING_MS;
    // wiggling side to side through each shake
    const wiggle = (ms: number) => {
      for (const s of shakes) {
        const t = ms - s;
        if (t >= 0 && t < shakeMs)
          return (
            Math.sin((t / shakeMs) * Math.PI * 2 * WIGGLES) *
            WIGGLE *
            Math.sin((Math.PI * t) / shakeMs)
          );
      }
      return 0;
    };
    const at: Point = { x: 0, y: dog.y };
    const dogAt = (ms: number): Point => {
      at.x = dog.x + wiggle(ms);
      return at;
    };
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * BALL;
      const sky: Point = {
        x: area.left + Math.random() * width,
        y: area.top - 60,
      };
      const lands = Math.random() * soakMs;
      // a quarter more of the ball flies off at each shake, the rest on the last
      const k = Math.min(SHAKES - 1, Math.floor((i / COINS) * SHAKES * 1.3));
      const flies = shakes[k] + Math.random() * shakeMs * 0.8;
      const out = a + (Math.random() - 0.5) * 0.8;
      const reach = between(FLING);
      const from: Point = { x: 0, y: 0 };
      return (f: number) => {
        const ms = f * travel;
        const fall = 260;
        if (ms < lands) return { x: sky.x, y: sky.y, scale: 0 };
        const restX = dog.x + Math.cos(a) * r;
        const restY = dog.y + Math.sin(a) * r;
        if (ms < lands + fall) {
          const u = easeIn((ms - lands) / fall);
          return {
            x: lerp([sky.x, restX], u),
            y: lerp([sky.y, restY], u),
            scale: COIN,
          };
        }
        if (ms < flies) return { x: restX + wiggle(ms), y: restY, scale: COIN };
        from.x = restX + wiggle(flies);
        from.y = restY;
        const u = easeOut(clamp01((ms - flies) / FLING_MS));
        return {
          x: from.x + Math.cos(out) * reach * u,
          y: from.y + Math.sin(out) * reach * u,
          scale: COIN,
        };
      };
    });

    const shaking = createBeats(
      shakes,
      (ms) => ms,
      (_, k) => {
        if (k === SHAKES - 1) {
          cover!.blast(dog);
          return;
        }
        cover!.burst(dog, 0.6);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SHAKE_SHAKE, k / (SHAKES - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => shaking.tick(ms, now),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, dogAt, ms, now, WISP_SIZE * WISP, 0.8, 0, endAt),
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
