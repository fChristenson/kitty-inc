// the "Ribbon Dancer" event (mix; cash): it covers its crit, whose click
// freezes the screen while a wisp twirls a long ribbon of flowing cash round
// the middle of the screen in loops and figure-eights, the ribbon trailing
// and rippling behind it; at every flourish the ribbon cracks with a flick
// of coins, a bloop and a jolt, harder each time, until the dancer whips the
// whole ribbon up into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";
import {
  measure,
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "ribbonDancer";
const REWARD = 4;
const STEPS = 160;
const TWIRL = 0.8;
const REACH_X = 0.36;
const REACH_Y = 0.22;
const FLOURISHES = 7;
const COINS = 8;
const COIN_REACH: [number, number] = [30, 110];
const DANCER = 0.5;
const FLICK_SHAKE: [number, number] = [0.4, 1.1];

export const forceRibbonDancerEvent = registerWispEvent(
  KEY,
  "Ribbon Dancer",
  () => CONFIG.ribbonDancerEvent.chance,
  (floor, context, area) => {
    const { danceMs, holdMs, mergeMs } = CONFIG.ribbonDancerEvent;
    const total = totalSpot(area);
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2 + 60;
    const a = (area.right - area.left) * REACH_X;
    const b = (area.bottom - area.top) * REACH_Y;
    const twirl = (v: number): Point => ({
      x:
        cx +
        a * Math.sin(Math.PI * 4 * v) * (0.6 + 0.4 * Math.sin(Math.PI * 2 * v)),
      y: cy + b * Math.sin(Math.PI * 6 * v),
    });
    const whipFrom = twirl(1);
    const line = sampleLine(
      (u) =>
        u < TWIRL
          ? twirl(u / TWIRL)
          : {
              x: lerp([whipFrom.x, total.x], (u - TWIRL) / (1 - TWIRL)),
              y: lerp([whipFrom.y, total.y], (u - TWIRL) / (1 - TWIRL)),
            },
      STEPS,
    );
    const along = measure(line);
    const flourishes = Array.from({ length: FLOURISHES }, (_, k) => {
      const i = Math.round(((k + 1) / (FLOURISHES + 1)) * TWIRL * STEPS);
      return { at: line[i], ms: (danceMs * along[i]) / along[STEPS] };
    });
    const pour: Pour = {
      coinsAlong: 240,
      width: 30,
      streamMs: danceMs * 0.5,
      travelMs: danceMs,
    };
    const head = riverHead(line, danceMs);
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      danceMs + holdMs + mergeMs,
    );

    const twirling = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, line, pour),
    );
    const flicking = createBeats(
      flourishes,
      (f) => f.ms,
      (f, k) => {
        cover!.burst(f.at, 0.4);
        cover!.launchFrom(f.at, ringTargets(f.at, COINS, COIN_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(FLICK_SHAKE, k / (FLOURISHES - 1)));
      },
    );
    const finale = createBeats(
      [danceMs],
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
          twirling.tick(ms, now);
          flicking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            head,
            ms,
            now,
            WISP_SIZE * DANCER,
            0.6,
            0,
            danceMs,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
