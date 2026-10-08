// the "Slam Dunk" event: it covers its crit, whose click freezes the screen
// while the wisp dribbles in from off the screen's left edge along the
// clicked floor, bouncing ever faster, each bounce a thump; then it leaps
// high, hangs over the total-income readout and slams down into it: the
// total explodes in a flash, a bang and a big shake, and coins burst out of
// it, which then merge back into the total. Pays floor income × floor number
// × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playSwoosh } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../../../shared/totalIncomeCoins";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { WORKER_FEET_Y } from "../../../../floors/worker";
import { lerp } from "../../../../shared/easing";

const KEY = "slamDunk";
const REWARD = 4;
// the dribble: from this far off the screen's left edge, bouncing DRIBBLES
// times DRIBBLE_UP px high, each bounce quicker, toward the total
const OUT = 80;
const DRIBBLE_UP = 170;
const BALL_R = WISP_SIZE * 0.35;
// it takes off this far short of being under the total, and leaps to this
// far above it
const TAKE_OFF = 220;
const APEX_ABOVE = 140;
// each bounce: a burst at the floor, a thump and a jolt
const BOUNCE_BURST = 0.25;
const BOUNCE_BURST_MS = 280;
const BOUNCE_SHAKE = 0.5;
// the dunk
const DUNK_SHAKE = 2.6;
const DUNK_SCALE = 1.7;
const SPARK_REACH = 340;
const SPARK_SIZE = 22;
// coins bursting out of the total, raining down and out round it
const COINS = 40;
const COIN_DROP: [number, number] = [80, 520];
const COIN_SIDE = 420;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.slamDunkEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { bounceMs, riseMs, dunkMs, holdMs, mergeMs } =
        CONFIG.slamDunkEvent;
      const floorY = WORKER_FEET_Y - BALL_R;
      const startX = area.left - OUT;
      // each bounce's length, and when the ball touches down after it
      const touches: number[] = [];
      bounceMs.reduce((at, ms) => {
        touches.push(at + ms);
        return at + ms;
      }, 0);
      const takeOffAt = touches[touches.length - 1];
      const apexAt = takeOffAt + riseMs;
      const dunkAt = apexAt + dunkMs;
      const startedAt = performance.now();
      // the total, local to the floor; known once the overlay's first drawn
      let hoop: Point | null = null;
      let touched = 0;
      let dunkedAt: number | null = null;
      const touchedAt: number[] = [];

      // the ball ms in: dribbling across, leaping, then dunking into the hoop
      const ballAt = (ms: number): Point | null => {
        if (!hoop || ms < 0 || ms >= dunkAt) return null;
        const takeOffX = hoop.x - TAKE_OFF;
        if (ms < takeOffAt) {
          let from = 0;
          for (let k = 0; k < touches.length; k++) {
            if (ms < touches[k]) {
              const u = (ms - from) / (touches[k] - from);
              // the first is a drop in; the rest bounce up off the floor
              const y =
                k === 0
                  ? floorY - DRIBBLE_UP * (1 - u * u)
                  : floorY - DRIBBLE_UP * 4 * u * (1 - u);
              return { x: startX + (takeOffX - startX) * (ms / takeOffAt), y };
            }
            from = touches[k];
          }
        }
        const apex = { x: hoop.x, y: hoop.y - APEX_ABOVE };
        if (ms < apexAt) {
          const u = (ms - takeOffAt) / riseMs;
          return {
            x: takeOffX + (apex.x - takeOffX) * u,
            y: floorY + (apex.y - floorY) * (1 - (1 - u) ** 2),
          };
        }
        const u = ((ms - apexAt) / dunkMs) ** 2;
        return { x: apex.x, y: apex.y + (hoop.y - apex.y) * u };
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: dunkAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect, totalTarget) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            hoop ??= {
              x: totalTarget.x - rect.left,
              y: totalTarget.y - rect.top,
            };
            const now = performance.now();
            const ms = now - startedAt;
            while (touched < touches.length && ms >= touches[touched]) {
              touched++;
              bounce(now);
            }
            if (dunkedAt === null && ms >= dunkAt) dunk(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            touchedAt.forEach((at, k) => {
              const x =
                startX +
                ((hoop!.x - TAKE_OFF - startX) * touches[k]) / takeOffAt;
              drawWhiteBurst(
                ctx,
                x,
                floorY + BALL_R,
                (now - at) / BOUNCE_BURST_MS,
                BOUNCE_BURST,
              );
            });
            if (dunkedAt !== null)
              drawExplosion(
                ctx,
                hoop.x,
                hoop.y,
                now - dunkedAt,
                now,
                DUNK_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the ball over the coins
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWisp(ctx, ballAt, now - startedAt, now, WISP_SIZE, 1);
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      setTimeout(() => {
        if (cover.isLive()) playSwoosh();
      }, takeOffAt);

      // on the frame each dribble touches the floor
      function bounce(now: number): void {
        touchedAt.push(now);
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(BOUNCE_SHAKE);
      }
      // on the frame it slams into the total: coins burst out of it
      function dunk(now: number): void {
        dunkedAt = now;
        if (!cover?.isLive() || !hoop) return;
        playSlamExplosion();
        shakeScreen(DUNK_SHAKE);
        triggerHudTotalFlash();
        pulseHudTotalFlash();
        const from = hoop;
        cover.launchFrom(
          from,
          Array.from({ length: COINS }, () => ({
            x: from.x + (Math.random() * 2 - 1) * COIN_SIDE,
            y: from.y + lerp(COIN_DROP, Math.random()),
          })),
        );
      }
    },
  },
  { label: "Slam Dunk", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Slam Dunk
export function forceSlamDunkEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
