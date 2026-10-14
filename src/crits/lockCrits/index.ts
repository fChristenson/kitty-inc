// lock crits: a special group playing a multiplier crit's number out onto the
// locked floor at the top of the building (bar 0; Two Up's floor above it is
// bar 1), every reward landing on it. Each kind is its own module under
// ./crits, played by floorCrits/critPlayer; a hit of step 0 only jolts, any
// other lands its reward on that bar's floor (the step 2 hits of the kinds
// that open it first land on the floor they opened)
import type { FloorActionsDeps } from "../../floors/floorInteractions";
import type { Floor } from "../../gameState";
import { FLOOR_H } from "../../floors/constants";
import type { CritTier, LockCritKind } from "../critTypes";
import {
  getFloorCritDef,
  type FloorCritPlay,
  type Point,
} from "../floorCrits/critPlayer";
import { spotsFromFlash } from "../floorCrits/playTargets";
import { critTarget } from "../critKit/target";
import { lockedFloorInView, lockedFloorOf } from "./lockedFloor";
import { playBarExplosion } from "../../shared/explosionBang";
import {
  drawFloorLockPrice,
  getLockCenter,
  MAX_FLOORS_PER_BUILDING,
  setFloorLockPriceHidden,
} from "../../floors/floorLock";

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
  // (decided on the first frame it plays, its module loaded by then)
  const below = deps.floors[deps.floors.length - 2];
  let twoFloors: boolean | undefined;
  const pitch = () => {
    const under = deps.getFloorRect?.(below)?.top;
    const top = deps.getFloorRect?.(locked)?.top;
    return under !== undefined && top !== undefined ? under - top : FLOOR_H;
  };
  const bars = (): Point[] => {
    twoFloors ??=
      !!getFloorCritDef(kind)?.twoFloors &&
      deps.floors.length < MAX_FLOORS_PER_BUILDING;
    if (!twoFloors) return spot();
    const [at] = spot();
    return [at, { x: at.x, y: at.y - pitch() }];
  };
  let opened: Floor | null = null;
  // what the floor it opened would have cost
  let price: Floor["unlockCost"] | null = null;
  // the reward hits it has landed
  let rewarded = 0;
  return {
    kind,
    barHalfWidth: getLockCenter().x,
    bars,
    onHit: (_bar, step, color) => {
      playBarExplosion(1 + step * 0.08);
      if (step === 0) return;
      // its own reward and opening (FloorCritDef's), its module loaded by
      // its first hit
      const def = getFloorCritDef(kind);
      const hit = (on: Floor) =>
        critTarget({
          floor: on,
          ownFloor: floor,
          floors: deps.floors,
          step,
          tier,
          count,
          color,
          price,
          index: rewarded,
        });
      // a crit with a reward lands it on the floor it opened on its step 2 hits
      if (def?.reward && step === 2) {
        if (!opened) return;
        def.reward(hit(opened));
        rewarded++;
        deps.persist();
        return;
      }
      // the floor waiting at the top now: Two Up's second is the one its
      // first opening queued
      const target = lockedFloorOf(deps.floors);
      if (!target) return;
      if (def?.beforeOpen?.(hit(target)) === false) {
        deps.persist();
        return;
      }
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
