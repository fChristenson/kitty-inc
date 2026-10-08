// the "Swing" event: it covers its crit, whose click freezes the screen while
// the wisp swells in low in the middle of it and swings like a pendulum hung
// from high above the screen, each swing wider and faster; at the top of
// every swing, a flash, a pop, a jolt and coins flung off it. At the top of
// its highest swing it lets go and flies straight into the total-income
// readout and explodes in a huge blast and shake, coins bursting out of it,
// and all the coins sweep into the total. Pays floor income × floor number ×
// REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playSlamExplosion, playSwoosh } from "../../../../sound";
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
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "swing";
const REWARD = 4;
// the pendulum: hung ABOVE of the screen's height over its top, LENGTH of
// its height long; SWINGS half-swings, each reaching from FIRST of the widest
// it can go (EDGE of its width in from the side) up to all of it
const ABOVE = 0.15;
const LENGTH = 0.8;
const SWINGS = 7;
const FIRST = 0.3;
const EDGE = 0.08;
const POP_MS = 160;
// the wisp, as a share of the screen's width, swelling GROW more by the end
const WISP = 0.055;
const GROW = 0.35;
// each swing's top: a burst, a pop, a jolt and coins flung on its way
const TOP_BURST: [number, number] = [0.3, 0.6];
const TOP_BURST_MS = 240;
const TOP_SHAKE: [number, number] = [0.5, 1.5];
const TOP_COINS: [number, number] = [2, 5];
const FLING: [number, number] = [70, 220];
const FLING_SPAN = 1.4;
// the blast in the total: coins bursting out of it
const FINAL_COINS = 28;
const FINAL_RING: [number, number] = [90, 320];
const FINAL_SHAKE = 2.9;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.swingEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { swingMs, shootMs, holdMs, mergeMs } = CONFIG.swingEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const size = Math.max(WISP_SIZE, width * WISP);
      const pivot = {
        x: (area.left + area.right) / 2,
        y: area.top - height * ABOVE,
      };
      const length = height * LENGTH;
      const widest = Math.asin(
        Math.min(1, (width / 2 - width * EDGE) / length),
      );
      const side = Math.random() < 0.5 ? 1 : -1;
      // each swing's top, alternating sides, the first a hair off the bottom
      const tops = Array.from({ length: SWINGS + 1 }, (_, k) =>
        k === 0
          ? 0
          : (k % 2 === 1 ? side : -side) *
            widest *
            lerp([FIRST, 1], (k - 1) / (SWINGS - 1)),
      );
      const reachAt: number[] = [];
      let at = POP_MS;
      for (let k = 0; k < SWINGS; k++) {
        // the first is half a swing: from the bottom out to its top
        at += lerp(swingMs, k / (SWINGS - 1)) * (k === 0 ? 0.5 : 1);
        reachAt.push(at);
      }
      const shootFrom = reachAt[SWINGS - 1];
      const blastAt = shootFrom + shootMs;
      // the total, local to the floor; known once the overlay's first drawn
      let total: Point | null = null;

      const bob = (angle: number, into: Point): Point => {
        into.x = pivot.x + Math.sin(angle) * length;
        into.y = pivot.y + Math.cos(angle) * length;
        return into;
      };
      // swinging fastest through the bottom, slowing to a stop at each top
      const angleAt = (ms: number) => {
        if (ms < POP_MS) return 0;
        let from = POP_MS;
        for (let k = 0; k < SWINGS; k++) {
          if (ms < reachAt[k]) {
            const u = (ms - from) / (reachAt[k] - from);
            if (k === 0) return tops[1] * Math.sin((u * Math.PI) / 2);
            const a = tops[k];
            const b = tops[k + 1];
            return (a + b) / 2 + ((a - b) / 2) * Math.cos(u * Math.PI);
          }
          from = reachAt[k];
        }
        return tops[SWINGS];
      };
      const release = bob(tops[SWINGS], { x: 0, y: 0 });
      const point = { x: 0, y: 0 };
      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= blastAt) return null;
        if (ms < shootFrom) return bob(angleAt(ms), point);
        if (!total) return null;
        const u = (ms - shootFrom) / shootMs;
        point.x = release.x + (total.x - release.x) * u;
        point.y = release.y + (total.y - release.y) * u;
        return point;
      };

      const startedAt = performance.now();
      let blastedAt: number | null = null;
      const topSpots = tops.slice(1).map((a) => bob(a, { x: 0, y: 0 }));
      const beats = createBeats(
        [...reachAt.slice(0, -1), shootFrom, blastAt],
        (ms) => ms,
        (_, k, now) =>
          k === SWINGS ? blast(now) : k === SWINGS - 1 ? letGo() : topped(k),
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
            beats.tick(now - startedAt, now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (let k = 0; k < SWINGS - 1; k++) {
              const firedAt = beats.firedAt(k);
              if (firedAt === null) break;
              const t = (now - firedAt) / TOP_BURST_MS;
              if (t < 1)
                drawWhiteBurst(
                  ctx,
                  topSpots[k].x,
                  topSpots[k].y,
                  t,
                  lerp(TOP_BURST, k / (SWINGS - 2)),
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
          // the wisp over the coins it flings
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / shootFrom);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWispBetween(
              ctx,
              wispAt,
              ms,
              now,
              size * easeOutBack(clamp01(ms / POP_MS)) * (1 + GROW * heat),
              heat,
              0,
              blastAt,
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame it hangs at the top of a swing: coins flung on up its arc
      function topped(k: number): void {
        if (!cover?.isLive()) return;
        const spot = topSpots[k];
        const t = k / (SWINGS - 2);
        // straight on up the arc, the way it was swinging
        const way = Math.sign(tops[k + 1]);
        playBloop();
        shakeScreen(lerp(TOP_SHAKE, t));
        cover.launchFrom(
          spot,
          sprayTargets(
            spot,
            Math.round(lerp(TOP_COINS, t)),
            FLING,
            Math.atan2(
              -Math.abs(Math.sin(tops[k + 1])),
              way * Math.cos(tops[k + 1]),
            ),
            FLING_SPAN,
          ),
        );
      }
      function letGo(): void {
        if (cover?.isLive()) playSwoosh();
      }
      // on the frame it hits the total: a huge blast and coins bursting out
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
  { label: "Swing", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Swing
export function forceSwingEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
