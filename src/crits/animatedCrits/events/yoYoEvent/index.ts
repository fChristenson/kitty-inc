// the "Yo-Yo" event: it covers its crit, whose click freezes the screen while
// the wisp drops out of the total-income readout like a yo-yo and plunges
// down onto the clicked floor's button, slamming into it with a flash, a
// bang, a jolt and coins bursting up, then snaps back up into the total's
// hand; again and again, ever faster and harder. The last snap back flies
// right into the total and explodes in a huge blast and shake, coins
// bursting out of it, and all the coins sweep into the total. Pays floor
// income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playExplosion, playSlamExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../../../shared/totalIncomeCoins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "yoYo";
const REWARD = 4;
// throws down and back, each DOWN of its time plunging and the rest snapping
// back up
const THROWS = 6;
const DOWN = 0.45;
// the wisp, as a share of the screen's width, swelling GROW more by the end
const WISP = 0.055;
const GROW = 0.35;
// each slam: a burst, a bang, a jolt and coins bursting up off the button
const SLAM_BURST: [number, number] = [0.4, 0.75];
const SLAM_BURST_MS = 260;
const SLAM_SHAKE: [number, number] = [0.8, 1.9];
const SLAM_COINS: [number, number] = [3, 6];
const SPRAY: [number, number] = [80, 240];
const SPRAY_SPAN = 2;
// the blast in the total: coins bursting out of it
const FINAL_COINS = 28;
const FINAL_RING: [number, number] = [90, 320];
const FINAL_SHAKE = 2.9;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

interface Throw {
  from: number;
  slamAt: number;
  backAt: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.yoYoEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { throwMs, holdMs, mergeMs } = CONFIG.yoYoEvent;
      const width = area.right - area.left;
      const size = Math.max(WISP_SIZE, width * WISP);
      const button = getButtonCenter(context.isGroundFloor);
      // the total, local to the floor; known once the overlay's first drawn
      let total: Point | null = null;

      const throws: Throw[] = [];
      let at = 0;
      for (let k = 0; k < THROWS; k++) {
        const ms = lerp(throwMs, k / (THROWS - 1));
        throws.push({ from: at, slamAt: at + ms * DOWN, backAt: at + ms });
        at += ms;
      }
      const blastAt = at;

      const point = { x: 0, y: 0 };
      // plunging down accelerating, snapping back up decelerating
      const wispAt = (ms: number): Point | null => {
        if (!total || ms < 0 || ms >= blastAt) return null;
        let u = 0;
        for (const t of throws) {
          if (ms >= t.backAt) continue;
          u =
            ms < t.slamAt
              ? ((ms - t.from) / (t.slamAt - t.from)) ** 2
              : (1 - (ms - t.slamAt) / (t.backAt - t.slamAt)) ** 2;
          break;
        }
        point.x = total.x + (button.x - total.x) * u;
        point.y = total.y + (button.y - total.y) * u;
        return point;
      };

      const startedAt = performance.now();
      let blastedAt: number | null = null;
      const beats = createBeats(
        [...throws.map((t) => t.slamAt), blastAt],
        (ms) => ms,
        (_, k, now) => (k === THROWS ? blast(now) : slam(k)),
      );
      // the catches back in the total's hand, but the last, which blasts
      const catches = createBeats(
        throws.slice(0, -1),
        (t) => t.backAt,
        () => caught(),
      );

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: blastAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect, totalTarget) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            total ??= {
              x: totalTarget.x - rect.left,
              y: totalTarget.y - rect.top,
            };
            const now = performance.now();
            const ms = now - startedAt;
            beats.tick(ms, now);
            catches.tick(ms, now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (let k = 0; k < THROWS; k++) {
              const firedAt = beats.firedAt(k);
              if (firedAt === null) break;
              const t = (now - firedAt) / SLAM_BURST_MS;
              if (t < 1)
                drawWhiteBurst(
                  ctx,
                  button.x,
                  button.y,
                  t,
                  lerp(SLAM_BURST, k / (THROWS - 1)),
                );
            }
            if (blastedAt !== null)
              drawExplosion(
                ctx,
                total.x,
                total.y,
                now - blastedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the wisp over the coins it knocks loose
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / blastAt);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWispBetween(
              ctx,
              wispAt,
              ms,
              now,
              size * (1 + GROW * heat),
              heat,
              0,
              blastAt,
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame it slams into the button
      function slam(k: number): void {
        if (!cover?.isLive()) return;
        const t = k / (THROWS - 1);
        playExplosion();
        shakeScreen(lerp(SLAM_SHAKE, t));
        cover.launchFrom(
          button,
          sprayTargets(
            button,
            Math.round(lerp(SLAM_COINS, t)),
            SPRAY,
            -Math.PI / 2,
            SPRAY_SPAN,
          ),
        );
      }
      // on the frame it snaps back into the total's hand
      function caught(): void {
        if (!cover?.isLive()) return;
        playBloop();
        pulseHudTotalFlash();
      }
      // on the frame the last snap back hits the total
      function blast(now: number): void {
        blastedAt = now;
        if (!cover?.isLive() || !total) return;
        playSlamExplosion();
        shakeScreen(FINAL_SHAKE);
        triggerHudTotalFlash();
        pulseHudTotalFlash();
        cover.launchFrom(total, ringTargets(total, FINAL_COINS, FINAL_RING));
      }
    },
  },
  { label: "Yo-Yo", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Yo-Yo
export function forceYoYoEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
