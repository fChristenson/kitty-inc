// lock crits: a special group playing a multiplier crit's number out onto the
// locked floor at the top of the building (bar 0; Two Up's floor above it is
// bar 1), every reward landing on it. Each kind is its own module under
// ./crits, played by floorCrits/critPlayer; a hit of step 0 only jolts, any
// other lands its reward on that bar's floor (Bolt Cutter's, Move In's and
// Hot Lap's step 2 hits on the floor they opened)
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
import { increaseIncomeRateBy, punchIncomeBar } from "../../floors/incomePanel";
import { celebrateWorkerBoost, recruitWorker } from "../../floors/worker";
import { CONFIG } from "../../config";

// where Move In's cats land across the floor they open, 0..1 of its walk
export const MOVE_IN_SPOTS = [0.15, 0.5, 0.85];

// Hot Lap's drops, one each, onto the floor it opens
const FURNISH = [
  (floor: Floor) => (floor.hasOfficeChairs = true),
  (floor: Floor) => (floor.hasOfficeSupplies = true),
  (floor: Floor) => (floor.hasManager = true),
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
  const opensThenRewards =
    kind === "boltCutterCrit" || kind === "moveInCrit" || kind === "hotLapCrit";
  let opened: Floor | null = null;
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
        if (kind === "boltCutterCrit") {
          const levels = count * CONFIG.crit.boltCutterLevels;
          increaseIncomeRateBy(opened, levels);
          punchIncomeBar(opened, `+${levels} Lvl`, color);
        } else if (kind === "hotLapCrit") {
          FURNISH[furnished++ % FURNISH.length](opened);
        } else {
          const spot = MOVE_IN_SPOTS[movedIn++ % MOVE_IN_SPOTS.length];
          const x = FLOOR_X_MIN + (FLOOR_X_MAX - FLOOR_X_MIN) * spot;
          const worker = recruitWorker(opened, x, Date.now());
          if (worker !== null) celebrateWorkerBoost(opened, worker, Date.now());
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
