// the "Unlock" event: a covered crit (see floors/streamTargetEvent) on a floor
// one or two below the building's locked floor, whose coins stream into that
// floor's unlock price. When the stream ends the floor unlocks for free and
// rolls its own unlock crit, which (when it lands) also raises its tier
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { isFloorLocked } from "../../shared/detachedJob";
import type { CritTier } from "../../shared/critTypes";
import { forceNextFloorBuyCrit } from "../upgradeButton";
import {
  drawFloorLockPrice,
  getLockCenter,
  setFloorLockPriceHidden,
} from "../floorLock";
import { registerStreamTargetEvent } from "../streamTargetEvent";

// how many floors below the locked floor the clicked one may be
const MAX_FLOORS_BELOW = 2;

function lockedFloorNear(floor: Floor, floors: Floor[]): Floor | null {
  const lockedIndex = floors.findIndex((f) => !f.unlocked);
  const below = lockedIndex - floors.indexOf(floor);
  if (lockedIndex < 0 || below < 1 || below > MAX_FLOORS_BELOW) return null;
  const locked = floors[lockedIndex];
  return isFloorLocked(locked) ? null : locked;
}

const armUnlockEvent = registerStreamTargetEvent({
  key: "unlock",
  cover: { label: "Unlock", color: COLOR.amber },
  chance: () => CONFIG.unlockEvent.chance,
  targetFloor: (floor, { floors }) => lockedFloorNear(floor, floors),
  target: () => getLockCenter(),
  canStart: (_floor, { unlockFloorFree }) => unlockFloorFree !== undefined,
  setHidden: setFloorLockPriceHidden,
  drawTarget: (ctx, floor, _isGroundFloor, whiteAlpha, rotation) =>
    drawFloorLockPrice(ctx, floor.unlockCost, rotation, whiteAlpha),
  onEnd: (_floor, _tier, { unlockFloorFree }, locked) =>
    unlockFloorFree?.(locked),
});

// dev test hook; unlockCrit forces the unlock's own roll (null: no crit,
// undefined: rolled normally)
export function forceUnlockEvent(
  floor: Floor,
  unlockCrit?: CritTier | null,
): void {
  armUnlockEvent(floor);
  if (unlockCrit !== undefined) forceNextFloorBuyCrit(unlockCrit);
}
