// the "Firecrackers" event (explosion; a free floor): it covers its crit,
// whose click freezes the screen while a string of firecrackers is strung
// from the clicked floor's button zigzagging up the screen to the
// building's locked floor; a fizzing spark races up the string, ever faster,
// and the crackers go off one after another in a rattling chain of little
// fireballs and bangs, each a jolt; at the top the spark reaches a big
// banger on the locked floor, which fizzes, blinks and blows in a huge blast
// and shake, and as the screen unfreezes the floor bursts open: unlocked
// for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "firecrackers";
const CRACKERS = 14;
const ZIGS = 3;
const CRACKER = 0.3;
const SPARK = 0.45;
const POP = 34;
const BANGER = 0.9;
const BANGER_FUSE = 50;
const BIG = 230;
const POP_SHAKE: [number, number] = [0.3, 0.9];

export const forceFirecrackersEvent = registerWispEvent(
  KEY,
  "Firecrackers",
  () => CONFIG.firecrackersEvent.chance,
  (floor, context, area) => {
    const { runMs, fuseMs, holdMs, mergeMs } = CONFIG.firecrackersEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const banger: Point = {
      x: FLOOR_W / 2,
      y: locked.offsetY + FLOOR_H / 2,
    };
    const width = area.right - area.left;
    // zigzagging from the button up to the banger
    const route: Point[] = [
      button,
      ...Array.from({ length: ZIGS }, (_, k) => ({
        x: area.left + width * (k % 2 === 0 ? 0.15 : 0.85),
        y: lerp([button.y, banger.y], (k + 1) / (ZIGS + 1)),
      })),
      banger,
    ];
    // the spark speeds up as it runs
    const share = (ms: number) => {
      const t = clamp01(ms / runMs);
      return 0.4 * t + 0.6 * t * t;
    };
    const timeAt = (u: number) =>
      runMs * ((-0.4 + Math.sqrt(0.16 + 2.4 * u)) / 1.2);
    const crackers = Array.from({ length: CRACKERS }, (_, k) => {
      const u = (k + 1) / (CRACKERS + 1);
      return {
        at: alongRoute(route, u, { x: 0, y: 0 }),
        pops: timeAt(u),
      };
    });
    const blowAt = runMs + fuseMs;
    const endAt = blowAt;
    const sparkAt: Point = { x: 0, y: 0 };
    const spark = (ms: number): Point | null =>
      ms < 0 || ms > runMs ? null : alongRoute(route, share(ms), sparkAt);
    const unpopped = crackers.map(
      (c) =>
        (ms: number): Point | null =>
          ms < 0 || ms >= c.pops ? null : c.at,
    );
    const bangerAt = (ms: number): Point | null =>
      ms < 0 || ms >= blowAt ? null : banger;

    const popping = createBeats(
      crackers,
      (c) => c.pops,
      (_, k) => {
        if (!cover?.isLive()) return;
        if (k % 2 === 0) playBloop();
        else playExplosion();
        shakeScreen(lerp(POP_SHAKE, k / (CRACKERS - 1)));
      },
    );
    const blowing = createBeats(
      [blowAt],
      (ms) => ms,
      () => cover!.blast(banger),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          popping.tick(ms, now);
          blowing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > blowAt + DETONATION_MS) return;
          crackers.forEach((c, k) => {
            drawWispBetween(
              ctx,
              unpopped[k],
              ms,
              now,
              WISP_SIZE * CRACKER,
              0.2,
              0,
              c.pops,
            );
            drawDetonation(ctx, c.at, ms - c.pops, POP, now);
          });
          if (ms >= runMs && ms < blowAt)
            drawLitFuse(ctx, banger, (ms - runMs) / fuseMs, BANGER_FUSE, now);
          drawWispBetween(
            ctx,
            bangerAt,
            ms,
            now,
            WISP_SIZE * BANGER,
            clamp01(ms / blowAt),
            0,
            blowAt,
          );
          if (ms < runMs) {
            const p = spark(ms);
            if (p) drawLitFuse(ctx, p, 1, POP * 0.4, now);
          }
          drawWispBetween(ctx, spark, ms, now, WISP_SIZE * SPARK, 1, 0, runMs);
          drawDetonation(ctx, banger, ms - blowAt, BIG, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
