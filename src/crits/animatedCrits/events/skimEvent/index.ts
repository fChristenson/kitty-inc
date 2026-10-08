// the "Skim" event: it covers its crit, whose click freezes the screen while
// a river of cash shoots out of the clicked floor's button and skims across
// the screen like a skipped stone, in hop after hop, each lower and shorter,
// every touchdown a splash of coins, a bloop and a jolt; off the last skip it
// leaps high up into the total-income readout in a huge blast and shake, and
// the coins sweep into the total. Pays floor income × floor number × REWARD
// (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "skim";
const REWARD = 4;
// the hops: each HOP of the screen's width (or height, if less) high, along
// a waterline DROP of the screen's height up from its bottom, spanning SPAN
// of its width from side to side
const HOPS = [0.34, 0.24, 0.17, 0.12, 0.08];
const DROP = 0.14;
const SPAN = 0.84;
// each splash: a ring of coins, a burst, a bloop and a jolt, growing
const SPLASH_COINS = 10;
const SPLASH_REACH: [number, number] = [20, 55];
const SPLASH_BURST: [number, number] = [0.5, 1];
const SPLASH_SHAKE: [number, number] = [0.8, 1.9];

export const forceSkimEvent = registerWispEvent(
  KEY,
  "Skim",
  () => CONFIG.skimEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.skimEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const way = button.x < (area.left + area.right) / 2 ? 1 : -1;
    const water = area.bottom - height * DROP;
    const start =
      area.left + width * (way === 1 ? (1 - SPAN) / 2 : (1 + SPAN) / 2);
    // each hop a little shorter than the last
    const weights = HOPS.map((h) => Math.sqrt(h));
    const sum = weights.reduce((a, b) => a + b, 0);
    const touches: Point[] = [];
    let x = start;
    for (const w of weights) {
      x += (way * width * SPAN * w) / sum;
      touches.push({ x, y: water });
    }
    const arc = (a: Point, b: Point, h: number) => (u: number) => ({
      x: a.x + (b.x - a.x) * u,
      y: a.y + (b.y - a.y) * u - 4 * h * u * (1 - u),
    });
    const launch: Point = { x: start, y: water };
    const line = [
      ...sampleLine(
        (u) =>
          bezier(button, { x: button.x, y: water }, launch, u, { x: 0, y: 0 }),
        16,
      ),
      ...touches.flatMap((to, k) =>
        sampleLine(
          arc(k === 0 ? launch : touches[k - 1], to, span * HOPS[k]),
          24,
        ).slice(1),
      ),
      ...sampleLine(
        (u) =>
          bezier(
            touches[touches.length - 1],
            { x: touches[touches.length - 1].x, y: total.y },
            total,
            u,
            { x: 0, y: 0 },
          ),
        30,
      ).slice(1),
    ];
    // when the head lands on each skip, by its share of the line's length
    const along = measure(line);
    const length = along[along.length - 1];
    const splashes = touches.map(
      (_, k) => (travelMs * along[16 + 24 * (k + 1)]) / length,
    );
    const pour: Pour = { coinsAlong: 1_400, width: 46, streamMs, travelMs };
    const topAt = travelMs;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      topAt + holdMs + mergeMs,
    );

    const splashing = createBeats(
      splashes,
      (ms) => ms,
      (_, k) => {
        const t = k / (touches.length - 1);
        const at = touches[k];
        cover!.burst(at, lerp(SPLASH_BURST, t));
        cover!.launchFrom(at, ringTargets(at, SPLASH_COINS, SPLASH_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPLASH_SHAKE, t));
      },
    );
    const finale = createBeats(
      [topAt],
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
          splashing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
