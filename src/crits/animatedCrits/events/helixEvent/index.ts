// the "Helix" event: it covers its crit, whose click freezes the screen while
// two wisps spring out of the clicked floor's button and twist round each
// other in a double helix, rising up the screen toward the total-income
// readout, ever faster and tighter, swelling as they swing near and shrinking
// as they swing away; every time they cross, a flash, a pop, a jolt and coins
// flung out. At the top they fuse into the total and explode in a huge blast
// and shake, coins bursting out of it, and all the coins sweep into the
// total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playSlamExplosion } from "../../../../sound";
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
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "helix";
const REWARD = 4;
// the helix: TWISTS full twists from the button to the total, swinging AMP
// of the screen's width either side, narrowing to nothing at the top and
// opening out over the first OPEN of the way; picking up pace by SPEEDUP
const TWISTS = 5;
const AMP = 0.28;
const OPEN = 0.08;
const SPEEDUP = 0.6;
// the wisps, as a share of the screen's width, DEPTH bigger and smaller as
// they swing near and away
const WISP = 0.05;
const DEPTH = 0.35;
// each crossing: a burst, a pop, a jolt and coins flung out
const CROSS_BURST: [number, number] = [0.3, 0.55];
const CROSS_BURST_MS = 220;
const CROSS_SHAKE: [number, number] = [0.5, 1.4];
const CROSS_COINS: [number, number] = [2, 4];
const FLING: [number, number] = [70, 220];
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
    chance: () => CONFIG.helixEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { riseMs, holdMs, mergeMs } = CONFIG.helixEvent;
      const width = area.right - area.left;
      const amp = width * AMP;
      const size = Math.max(WISP_SIZE, width * WISP);
      const button = getButtonCenter(context.isGroundFloor);
      // the total, local to the floor; known once the overlay's first drawn
      let total: Point | null = null;

      // the share of the way up, picking up pace
      const climbAt = (ms: number) => {
        const u = clamp01(ms / riseMs);
        return (1 - SPEEDUP) * u + SPEEDUP * u * u;
      };
      // when the climb reaches share p: invert (1 - S)u + S u² = p
      const msAtClimb = (p: number) =>
        ((-(1 - SPEEDUP) + Math.sqrt((1 - SPEEDUP) ** 2 + 4 * SPEEDUP * p)) /
          (2 * SPEEDUP)) *
        riseMs;
      // the wisps' swing round the axis ms in, and how far either side
      const phaseAt = (ms: number) => climbAt(ms) * TWISTS * Math.PI * 2;
      const reachAt = (p: number) =>
        amp * smoothstep(clamp01(p / OPEN)) * (1 - p) ** 0.7;
      // a wisp's spot on the helix at climb p and swing phase
      const spotAt = (p: number, swing: number, into: Point): Point | null => {
        if (!total) return null;
        const dx = total.x - button.x;
        const dy = total.y - button.y;
        const d = Math.hypot(dx, dy) || 1;
        const side = reachAt(p) * Math.sin(swing);
        into.x = button.x + dx * p - (dy / d) * side;
        into.y = button.y + dy * p + (dx / d) * side;
        return into;
      };
      const strands = [0, Math.PI].map((offset) => {
        const point = { x: 0, y: 0 };
        return {
          offset,
          at: (ms: number): Point | null =>
            ms < 0 || ms >= riseMs
              ? null
              : spotAt(climbAt(ms), phaseAt(ms) + offset, point),
        };
      });

      // they cross every half twist, but not at the button or the total
      const crossings: number[] = [];
      for (let k = 1; k < TWISTS * 2; k++)
        crossings.push(msAtClimb(k / (TWISTS * 2)));
      const crossedAt: (Point | null)[] = crossings.map(() => null);

      const startedAt = performance.now();
      let blastedAt: number | null = null;
      const beats = createBeats(
        [...crossings, riseMs],
        (ms) => ms,
        (ms, k, now) => (k === crossings.length ? blast(now) : crossed(ms, k)),
      );

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: riseMs + holdMs + mergeMs, mergeMs },
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
            crossedAt.forEach((spot, k) => {
              const firedAt = beats.firedAt(k);
              if (!spot || firedAt === null) return;
              const t = (now - firedAt) / CROSS_BURST_MS;
              if (t < 1)
                drawWhiteBurst(
                  ctx,
                  spot.x,
                  spot.y,
                  t,
                  lerp(CROSS_BURST, k / (crossings.length - 1)),
                );
            });
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
          // the wisps over the coins they fling, the farther one first
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / riseMs);
            const phase = phaseAt(ms);
            const near = Math.cos(phase) > 0 ? 0 : 1;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const k of [1 - near, near]) {
              const strand = strands[k];
              drawWispBetween(
                ctx,
                strand.at,
                ms,
                now,
                size * (1 + DEPTH * Math.cos(phase + strand.offset)),
                heat,
                0,
                riseMs,
              );
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame the strands cross
      function crossed(ms: number, k: number): void {
        const spot = spotAt(climbAt(ms), 0, { x: 0, y: 0 });
        crossedAt[k] = spot;
        if (!cover?.isLive() || !spot) return;
        const t = k / (crossings.length - 1);
        playBloop();
        shakeScreen(lerp(CROSS_SHAKE, t));
        cover.launchFrom(
          spot,
          sprayTargets(spot, Math.round(lerp(CROSS_COINS, t)), FLING),
        );
      }
      // on the frame they fuse into the total: a huge blast, coins bursting out
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
  { label: "Helix", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Helix
export function forceHelixEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
