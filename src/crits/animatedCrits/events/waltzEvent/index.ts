// the "Waltz" event (wisp; cash): it covers its crit, whose click freezes the
// screen while pairs of wisps whirl out of the clicked floor's button and
// waltz round the screen's middle as couples, each pair spinning round
// each other as they sweep round the ballroom, ever faster; on every beat
// of the music every couple flings out a ring of coins with a bloop and a
// jolt; then all the couples spiral into the middle and collide in a huge
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "waltz";
const REWARD = 4;
const PAIRS = 4;
const BEATS = 9;
// couples sweep RADIUS of the screen's smaller side out, LAPS laps over the
// dance; partners twirl PARTNER px apart, SPIN_HZ twirls a second
const RADIUS = 0.3;
const LAPS = 1.5;
const PARTNER = 30;
const SPIN_HZ = 1.6;
const DANCER = 0.38;
const FLING = 6;
const FLING_REACH: [number, number] = [30, 90];
const BEAT_SHAKE: [number, number] = [0.3, 1];

export const forceWaltzEvent = registerWispEvent(
  KEY,
  "Waltz",
  () => CONFIG.waltzEvent.chance,
  (floor, context, area) => {
    const { enterMs, danceMs, gatherMs, holdMs, mergeMs } = CONFIG.waltzEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const radius =
      Math.min(area.right - area.left, area.bottom - area.top) * RADIUS;
    const gatherAt = enterMs + danceMs;
    const endAt = gatherAt + gatherMs;
    const couple = (p: number, ms: number, into: Point) => {
      const u = clamp01((ms - enterMs) / danceMs);
      const a = (p / PAIRS) * Math.PI * 2 + LAPS * Math.PI * 2 * easeIn(u);
      const r =
        radius *
        (ms < enterMs
          ? easeOut(ms / enterMs)
          : 1 - easeIn(clamp01((ms - gatherAt) / gatherMs)));
      into.x = center.x + Math.cos(a) * r;
      into.y = center.y + Math.sin(a) * r;
      return into;
    };
    const dancers = Array.from({ length: PAIRS * 2 }, (_, i) => {
      const p = Math.floor(i / 2);
      const side = i % 2 === 0 ? 0 : Math.PI;
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        couple(p, ms, at);
        const twirl =
          side + (ms / 1000) * SPIN_HZ * Math.PI * 2 * (1 + ms / endAt);
        const near =
          ms > gatherAt ? 1 - clamp01((ms - gatherAt) / gatherMs) : 1;
        at.x += Math.cos(twirl) * PARTNER * near;
        at.y += Math.sin(twirl) * PARTNER * near;
        if (ms < enterMs) {
          const u = easeOut(ms / enterMs);
          at.x = lerp([button.x, at.x], u);
          at.y = lerp([button.y, at.y], u);
        }
        return at;
      };
    });
    const beats = Array.from(
      { length: BEATS },
      (_, j) => enterMs + danceMs * Math.sqrt((j + 1) / BEATS),
    );
    const spot: Point = { x: 0, y: 0 };

    const dancing = createBeats(
      beats,
      (ms) => ms,
      (ms, j) => {
        for (let p = 0; p < PAIRS; p++) {
          const at = { ...couple(p, ms, spot) };
          cover!.launchFrom(at, ringTargets(at, FLING, FLING_REACH));
        }
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BEAT_SHAKE, j / (BEATS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          dancing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const d of dancers)
            drawWispBetween(ctx, d, ms, now, WISP_SIZE * DANCER, 0.4, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
