// the bar effects more than one crit leaves (a crit's own lives in its
// module: see ./rateBonus' defineBarEffect)
import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";
import { countDown, defineBarEffect } from "./rateBonus";

// an Overclock's (or a Rebound's): overclockSpeed times as fast till then
const overclocks = defineBarEffect<number>({
  speed: () => CONFIG.crit.overclockSpeed,
  ended: (until, now) => now >= until,
});
export function overclockBar(floor: Floor): void {
  overclocks.set(floor, Date.now() + CONFIG.crit.overclockMs);
}

// a Shortcut's (or a Housewarming's) banked payouts paying double
const doubles = defineBarEffect<number>({
  payout: () => CONFIG.crit.shortcutPayout,
  onPayout: countDown,
});
export function bankDoublePayout(floor: Floor, payouts = 1): void {
  doubles.set(floor, (doubles.get(floor) ?? 0) + payouts);
}

// a Wound Up's (or a Crackle Cage's): payouts bigger for woundUpMs
const windups = defineBarEffect<number>({
  payout: () => CONFIG.crit.woundUpPayout,
  ended: (until, now) => now >= until,
});
export function windUpBar(floor: Floor): void {
  windups.set(floor, Date.now() + CONFIG.crit.woundUpMs);
}
