// "snowball crit" (see shared/critTypes' isSnowballCrit): a Sale-like free-
// click event — while active, this floor's button wiggles/costs nothing to
// click, same as Sale/Overtime — and just like Sale, each click credits a
// lump sum straight to the player's total (never touches this floor's own
// income rate). The payout grows by n^2 instead of Sale's own flat
// multiplier (n = that click's own 1-indexed count within this event; see
// floorInteractions.ts's Snowball click branch, which calls
// nextSnowballClickCount to get each click's own n), so the payout visibly
// snowballs the longer the event is milked. The click counter resets every
// time the event (re)starts
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { CONFIG } from "../../config";
import { createTimedFloorEvent, registerEventButton } from "./shared";

export const SNOWBALL_DURATION_MS = CONFIG.crit.snowballDurationMs;

const snowballEvent = createTimedFloorEvent(SNOWBALL_DURATION_MS);
// extra per-run state beyond the shared timed-event shape — its own click
// counter, reset every time the event (re)triggers
const snowballClickCount = new WeakMap<Floor, number>();

export function triggerSnowballCrit(floor: Floor): void {
  snowballEvent.trigger(floor);
  snowballClickCount.set(floor, 0);
}

export function isSnowballActive(floor: Floor, now: number): boolean {
  return snowballEvent.isActive(floor, now);
}

// call once per free snowball click — bumps this event's own click counter
// and returns that click's own n (1-indexed), for the caller to square
export function nextSnowballClickCount(floor: Floor): number {
  const n = (snowballClickCount.get(floor) ?? 0) + 1;
  snowballClickCount.set(floor, n);
  return n;
}

registerEventButton({
  key: "snowball",
  color: COLOR.snowballBlue,
  freeClick: true,
  isActive: isSnowballActive,
  label: (critMultiplier) =>
    critMultiplier !== null ? `Snowball x${critMultiplier}` : "Snowball",
});
