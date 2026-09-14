// "frozen crit" (see shared/critTypes' isFrozenCrit): a Sale-like free-click
// event — while active, this floor's button wiggles/costs nothing to click,
// same as Sale/Overtime/Snowball — but instead of performing the normal
// paid upgrade at all, each click just credits a flat lump sum straight to
// the player's total: floorIncomePerSecond(floor) * an ULTRA (125x) crit's
// own multiplier, as if every click were its own free ultra crit's worth of
// cash (see floorInteractions.ts's own Frozen click branch, which never
// calls applyUpgradeTick while this is active — the floor's own rate/price
// genuinely stay frozen since nothing about its progression changes)
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { CONFIG } from "../../config";
import { createTimedFloorEvent, registerEventButton } from "./shared";
import { CRIT_TIER_CONFIG } from "./crit";

export const FROZEN_DURATION_MS = CONFIG.crit.frozenDurationMs;
// the flat "how many ultra-crits' worth of cash" multiplier every Frozen
// click pays out — reuses the same ultra-tier config the base crit-tier
// system already defines, rather than a second hardcoded 125
export const FROZEN_PAYOUT_MULTIPLIER = CRIT_TIER_CONFIG.ultra.multiplier;

const frozenEvent = createTimedFloorEvent(FROZEN_DURATION_MS);

export function triggerFrozenCrit(floor: Floor): void {
  frozenEvent.trigger(floor);
}

export function isFrozenActive(floor: Floor, now: number): boolean {
  return frozenEvent.isActive(floor, now);
}

registerEventButton({
  key: "frozen",
  color: COLOR.frozenIceBlue,
  freeClick: true,
  isActive: isFrozenActive,
  label: (critMultiplier) =>
    critMultiplier !== null ? `Frozen x${critMultiplier}` : "Frozen",
});
