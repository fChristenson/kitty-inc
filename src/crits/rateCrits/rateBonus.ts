// what rate crits leave on an income bar: an Overclock's run of extra speed,
// a Quickstep's quickening (each landing and payout a step faster), a
// Shortcut's banked double payouts and a Wound Up's bigger payouts. Read by
// the income panel's speed and payouts (floors/incomePanel); not persisted
import { snapshotMap } from "../../shared/snapshotState";
import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";

const overclocks = snapshotMap<Floor, number>();
const quicksteps = snapshotMap<Floor, { until: number; steps: number }>();
const doubles = snapshotMap<Floor, number>();
const windups = snapshotMap<Floor, number>();
// a Crosshairs' lock: how many times as big the next payout pays
const aimed = snapshotMap<Floor, number>();

// a Crosshairs' shot: floor's next payout `times` as big
export function aimPayout(floor: Floor, times: number): void {
  aimed.set(floor, (aimed.get(floor) ?? 1) * times);
}

// a Shortcut's pass: one more payout paying double (a Housewarming's several)
export function bankDoublePayout(floor: Floor, payouts = 1): void {
  doubles.set(floor, (doubles.get(floor) ?? 0) + payouts);
}

// a Wound Up: payouts bigger for woundUpMs
export function windUpBar(floor: Floor): void {
  windups.set(floor, Date.now() + CONFIG.crit.woundUpMs);
}

// how many times as big rate crits make floor's next payout
export function ratePayoutMultiplier(floor: Floor, now: number): number {
  let payout = doubles.has(floor) ? CONFIG.crit.shortcutPayout : 1;
  payout *= aimed.get(floor) ?? 1;
  const windup = windups.get(floor);
  if (windup !== undefined) {
    if (now < windup) payout *= CONFIG.crit.woundUpPayout;
    else windups.delete(floor);
  }
  return payout;
}

export function overclockBar(floor: Floor): void {
  overclocks.set(floor, Date.now() + CONFIG.crit.overclockMs);
}

// a Quickstep's step: starts its run if none is on
export function stepBar(floor: Floor): void {
  const now = Date.now();
  const run = quicksteps.get(floor);
  if (run && now < run.until) run.steps++;
  else
    quicksteps.set(floor, { until: now + CONFIG.crit.quickstepMs, steps: 1 });
}

// how many times as fast rate crits run floor's bar right now
export function rateCritSpeed(floor: Floor, now: number): number {
  let speed = 1;
  const overclock = overclocks.get(floor);
  if (overclock !== undefined) {
    if (now < overclock) speed *= CONFIG.crit.overclockSpeed;
    else overclocks.delete(floor);
  }
  const run = quicksteps.get(floor);
  if (run) {
    if (now < run.until)
      speed *= Math.min(
        CONFIG.crit.quickstepMaxSpeed,
        1 + CONFIG.crit.quickstepStep * run.steps,
      );
    else quicksteps.delete(floor);
  }
  return speed;
}

// a payout landing on floor's bar: a Quickstep's step, a banked double spent
export function noteRatePayout(floor: Floor, now: number): void {
  const run = quicksteps.get(floor);
  if (run && now < run.until) run.steps++;
  aimed.delete(floor);
  const banked = doubles.get(floor);
  if (banked === undefined) return;
  if (banked > 1) doubles.set(floor, banked - 1);
  else doubles.delete(floor);
}
