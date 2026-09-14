// "Sale" boost: a purchasable, targeted alternative to boostMenu's boost-all (see
// hud/boostMenu/index.ts's applySaleBoost, which picks the random floor and calls
// triggerSaleBoost below). While active on a floor, its upgrade button wiggles like
// a crit and clicking it is free. A crit can still roll during a sale (see
// floorInteractions/index.ts); rather than stacking upgrades as usual, it
// multiplies that click's sale payout by the rolled tier's own
// CRIT_TIER_CONFIG[tier].multiplier
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { CONFIG } from "../../config";
import { createTimedFloorEvent, registerEventButton } from "./shared";

export const SALE_DURATION_MS = CONFIG.sale.durationMs;
// each sale click pays out floorIncomePerSecond(floor) (1 second of that
// floor's own income), credited straight to the player's total — hud/boostMenu's
// own cost is priced off this same rate times this many assumed clicks, halved, so
// a fully-clicked sale earns back at least double the cost
export const SALE_ASSUMED_CLICKS = CONFIG.sale.assumedClicks;
// per-click payout multiplier applied only to actual sale-click earnings (see
// floorInteractions/index.ts) — boostMenu's sale cost still prices off the plain
// floorIncomePerSecond rate, so a fully-clicked sale now earns back well more
// than double its cost
export const SALE_INCOME_MULTIPLIER = CONFIG.sale.incomeMultiplier;

const saleEvent = createTimedFloorEvent(SALE_DURATION_MS);

export function triggerSaleBoost(floor: Floor): void {
  saleEvent.trigger(floor);
}

export function isSaleActive(floor: Floor, now: number): boolean {
  return saleEvent.isActive(floor, now);
}

registerEventButton({
  key: "sale",
  color: COLOR.amber,
  freeClick: true,
  isActive: isSaleActive,
  label: (critMultiplier) =>
    critMultiplier !== null ? `Sale x${critMultiplier}` : "Sale",
});
