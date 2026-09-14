// "frozen crit" (see shared/critTypes' isFrozenCrit): unlike every other
// piggyback proc, its reward isn't instant — it just locks this floor's
// upgradeCost at whatever it currently is for FROZEN_DURATION_MS of real
// time. incomePanel.ts's increaseIncomeRate checks isFrozenActive and skips
// its own cost-growth multiplication while true; every other part of that
// tick (income rate, upgradeCount, interval halving) proceeds completely
// normally, and the button still costs real money to click — it just isn't
// getting any more expensive for the duration. The button itself still
// wiggles and shows its own "Frozen" label/color while active (see
// drawUpgradeButton), same visual treatment as Sale/Overtime, but
// affordability dimming still applies normally (freeClick: false below —
// this is not a free click)
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { CONFIG } from "../../config";
import { createTimedFloorEvent, registerEventButton } from "./shared";

export const FROZEN_DURATION_MS = CONFIG.crit.frozenDurationMs;

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
  freeClick: false,
  isActive: isFrozenActive,
  // never scales with a simultaneously-armed crit tier — the reward is a
  // flat price lock, not a per-click payout, so there's no multiplier to show
  label: () => "Frozen",
});
