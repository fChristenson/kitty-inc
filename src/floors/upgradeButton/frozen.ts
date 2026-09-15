// "frozen crit" (see shared/critTypes' isFrozenCrit): locks this floor's own
// upgrade PRICE for FROZEN_DURATION_MS — incomePanel.ts's increaseIncomeRate
// skips its normal upgradeCost growth entirely while this is active, so
// every upgrade bought during the window costs the same frozen price. The
// upgrade itself is otherwise completely normal (still costs money, no free
// clicks, no reward multiplier, no special button appearance) — only the
// price growth is paused
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { createTimedFloorEvent } from "./shared";

export const FROZEN_DURATION_MS = CONFIG.crit.frozenDurationMs;

const frozenEvent = createTimedFloorEvent(FROZEN_DURATION_MS);

export function triggerFrozenCrit(floor: Floor): void {
  frozenEvent.trigger(floor);
}

export function isFrozenActive(floor: Floor, now: number): boolean {
  return frozenEvent.isActive(floor, now);
}
