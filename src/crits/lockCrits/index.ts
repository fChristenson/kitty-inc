// lock crits: a special group playing a multiplier crit's number out onto the
// locked floor at the top of the building (bar 0; Two Up's floor above it is
// bar 1), every reward landing on it. Each kind is its own module under
// ./crits, played by floorCrits/critPlayer; a hit of step 0 only jolts, any
// other lands its reward on that bar's floor (the step 2 hits of the kinds
// that open it first land on the floor they opened)
import type { FloorActionsDeps } from "../../floors/floorInteractions";
import type { Floor } from "../../gameState";
import { FLOOR_H, FLOOR_X_MAX, FLOOR_X_MIN } from "../../floors/constants";
import {
  type CritTier,
  type LockCritKind,
  pickHigherCritTier,
} from "../critTypes";
import type { FloorCritPlay, Point } from "../floorCrits/critPlayer";
import { spotsFromFlash } from "../floorCrits/playTargets";
import { lockedFloorInView, lockedFloorOf } from "./lockedFloor";
import { multiply } from "../../shared/bigNumber";
import { playBarExplosion } from "../../shared/explosionBang";
import {
  drawFloorLockPrice,
  getLockCenter,
  MAX_FLOORS_PER_BUILDING,
  setFloorLockPriceHidden,
} from "../../floors/floorLock";
import {
  currentPayoutAmount,
  flipIncomeRate,
  getIncomeBarCenter,
  increaseIncomeRateBy,
  punchIncomeBar,
} from "../../floors/incomePanel";
import { spawnHomingCoinBurst as animateHomingCoins } from "../../floors/coins";
import { addTotalIncome } from "../../totalIncome";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import {
  celebrateWorkerBoost,
  getRenderedWorkerCount,
  promoteWorkerPermaTier,
  recruitWorker,
} from "../../floors/worker";
import { CONFIG } from "../../config";
import { armCritUpgrade } from "../floorCrits/upgradeCrit";
import { addFreeTaps } from "../buttonCrits/buttonBonus";
import { liveEffect } from "../../shared/detachedJob";
import { flipUpgradeButton as animateFlip } from "../../floors/upgradeButton";

const flipUpgradeButton = liveEffect(animateFlip);
const spawnHomingCoinBurst = liveEffect(animateHomingCoins);

// where Move In's cats land across the floor they open, 0..1 of its walk
export const MOVE_IN_SPOTS = [0.15, 0.5, 0.85];

// Hot Lap's drops, one each, onto the floor it opens
const FURNISH = [
  (floor: Floor) => (floor.hasOfficeChairs = true),
  (floor: Floor) => (floor.hasOfficeSupplies = true),
  (floor: Floor) => (floor.hasManager = true),
];

// the kinds that open the floor on their step 1 hit, then reward it on step 2
const OPENS_THEN_REWARDS: readonly LockCritKind[] = [
  "boltCutterCrit",
  "moveInCrit",
  "hotLapCrit",
  "carbonCopyCrit",
  "freshPaintCrit",
  "luckyStarCrit",
  "skeletonKeyCrit",
  "jumpStartCrit",
  "conjureCrit",
  "pullUpCrit",
];

// a lock crit playing out from floor's crit onto the locked floor, if it's in
// view; unlockFree opens a floor for free
export function lockCritPlayFor(
  deps: FloorActionsDeps,
  floor: Floor,
  kind: LockCritKind,
  tier: CritTier,
  count: number,
  unlockFree: (floor: Floor) => void,
): FloorCritPlay | null {
  const locked = lockedFloorOf(deps.floors);
  if (!locked || !lockedFloorInView(deps.floors, deps.getOnScreenFloors))
    return null;
  const spot = spotsFromFlash(deps, floor, [locked], getLockCenter);
  // Two Up's second floor sits a floor's pitch above, while there's room
  const below = deps.floors[deps.floors.length - 2];
  const twoUp =
    kind === "twoUpCrit" && deps.floors.length < MAX_FLOORS_PER_BUILDING;
  const pitch = () => {
    const under = deps.getFloorRect?.(below)?.top;
    const top = deps.getFloorRect?.(locked)?.top;
    return under !== undefined && top !== undefined ? under - top : FLOOR_H;
  };
  const bars = twoUp
    ? (): Point[] => {
        const [at] = spot();
        return [at, { x: at.x, y: at.y - pitch() }];
      }
    : spot;
  const opensThenRewards = OPENS_THEN_REWARDS.includes(kind);
  let opened: Floor | null = null;
  // what the floor it opened would have cost
  let price: Floor["unlockCost"] | null = null;
  let movedIn = 0;
  let furnished = 0;
  return {
    kind,
    barHalfWidth: getLockCenter().x,
    bars,
    onHit: (_bar, step, color) => {
      playBarExplosion(1 + step * 0.08);
      if (step === 0) return;
      if (opensThenRewards && step === 2) {
        if (!opened) return;
        const now = Date.now();
        if (kind === "boltCutterCrit") {
          const levels = count * CONFIG.crit.boltCutterLevels;
          increaseIncomeRateBy(opened, levels);
          punchIncomeBar(opened, `+${levels} Lvl`, color);
        } else if (kind === "hotLapCrit") {
          FURNISH[furnished++ % FURNISH.length](opened);
        } else if (kind === "carbonCopyCrit") {
          // up from a free floor's share to the whole level of the one below
          const below = deps.floors[deps.floors.indexOf(opened) - 1];
          const levels = below ? below.upgradeCount - opened.upgradeCount : 0;
          if (levels > 0) {
            increaseIncomeRateBy(opened, levels);
            punchIncomeBar(opened, `+${levels} Lvl`, color);
          }
        } else if (kind === "freshPaintCrit") {
          for (let i = 0; i < getRenderedWorkerCount(opened); i++) {
            promoteWorkerPermaTier(opened, i);
            celebrateWorkerBoost(opened, i, now);
          }
        } else if (kind === "luckyStarCrit") {
          armCritUpgrade(opened, tier);
          flipUpgradeButton(opened);
        } else if (kind === "skeletonKeyCrit") {
          addFreeTaps(opened, count * 2);
          flipUpgradeButton(opened);
        } else if (kind === "jumpStartCrit") {
          const payouts = count * CONFIG.crit.jumpStartPayouts;
          addTotalIncome(multiply(currentPayoutAmount(opened, now), payouts));
          const bar = getIncomeBarCenter(false);
          spawnHomingCoinBurst(opened, bar.x, bar.y, {
            onEachArrive: pulseHudTotalFlash,
          });
          punchIncomeBar(opened, `x${payouts} Payout`, color);
        } else if (kind === "conjureCrit") {
          if (price) {
            addTotalIncome(multiply(price, CONFIG.crit.conjurePriceBack));
            const bar = getIncomeBarCenter(false);
            spawnHomingCoinBurst(opened, bar.x, bar.y, {
              onEachArrive: pulseHudTotalFlash,
            });
            punchIncomeBar(opened, "Price Back", color);
          }
        } else if (kind === "pullUpCrit") {
          flipIncomeRate(opened);
          opened.incomeIntervalSeconds /= CONFIG.crit.pullUpSpeed;
          punchIncomeBar(opened, `${CONFIG.crit.pullUpSpeed}x Speed`, color);
        } else {
          const spot = MOVE_IN_SPOTS[movedIn++ % MOVE_IN_SPOTS.length];
          const x = FLOOR_X_MIN + (FLOOR_X_MAX - FLOOR_X_MIN) * spot;
          const worker = recruitWorker(opened, x, now);
          if (worker !== null) celebrateWorkerBoost(opened, worker, now);
        }
        deps.persist();
        return;
      }
      // the floor waiting at the top now: Two Up's second is the one its
      // first opening queued
      const target = lockedFloorOf(deps.floors);
      if (!target) return;
      if (kind === "clearanceCrit") {
        // its discount too, which the price is rebuilt from on every load
        target.priceDiscountMultiplier /= count;
        target.unlockCost = multiply(target.unlockCost, 1 / count);
        deps.persist();
        return;
      }
      if (kind === "lockpickCrit")
        target.critMultiplierTier = pickHigherCritTier(
          target.critMultiplierTier,
          tier,
        );
      price = target.unlockCost;
      unlockFree(target);
      opened = target;
    },
    // its price, for a crit that plays it itself
    drawBar: (ctx, _bar, flash) => {
      const at = getLockCenter();
      ctx.save();
      ctx.translate(-at.x, -at.y);
      drawFloorLockPrice(ctx, locked.unlockCost, 0, flash);
      ctx.restore();
    },
    hideBars: (hidden) => setFloorLockPriceHidden(hidden ? locked : null),
  };
}
