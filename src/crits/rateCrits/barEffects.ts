// the bar effects more than one crit leaves (a crit's own lives in its
// module: see ./rateBonus' defineBarEffect), their amounts in the meta.ts of
// the crit they're named for
import overclock from "./crits/overclockCrit/meta";
import shortcut from "./crits/shortcutCrit/meta";
import woundUp from "./crits/woundUpCrit/meta";
import type { Floor } from "../../gameState";
import { countDown, defineBarEffect } from "./rateBonus";

export const OVERCLOCK_SPEED = overclock.values.speed;
export const WOUND_UP_PAYOUT = woundUp.values.payout;

// an Overclock's (or a Rebound's): OVERCLOCK_SPEED times as fast till then
const overclocks = defineBarEffect<number>({
  speed: () => OVERCLOCK_SPEED,
  ended: (until, now) => now >= until,
});
export function overclockBar(floor: Floor): void {
  overclocks.set(floor, Date.now() + overclock.values.ms);
}

// a Shortcut's (or a Housewarming's) banked payouts paying double
const doubles = defineBarEffect<number>({
  payout: () => shortcut.values.payout,
  onPayout: countDown,
});
export function bankDoublePayout(floor: Floor, payouts = 1): void {
  doubles.set(floor, (doubles.get(floor) ?? 0) + payouts);
}

// a Wound Up's (or a Crackle Cage's): payouts bigger for a while
const windups = defineBarEffect<number>({
  payout: () => WOUND_UP_PAYOUT,
  ended: (until, now) => now >= until,
});
export function windUpBar(floor: Floor): void {
  windups.set(floor, Date.now() + woundUp.values.ms);
}
