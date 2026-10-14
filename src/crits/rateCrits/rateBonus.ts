// what rate crits leave on an income bar: an Overclock's run of extra speed,
// a Quickstep's quickening (each landing and payout a step faster), a
// Shortcut's banked double payouts, a Wound Up's bigger payouts and a
// Momentum's growing ones. Read by the income panel's speed and payouts
// (floors/incomePanel); not persisted
import { snapshotMap } from "../../shared/snapshotState";
import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";

const overclocks = snapshotMap<Floor, number>();
const quicksteps = snapshotMap<Floor, { until: number; steps: number }>();
const doubles = snapshotMap<Floor, number>();
const windups = snapshotMap<Floor, number>();
const momentums = snapshotMap<Floor, { until: number; steps: number }>();

// a Shortcut's pass: one more payout paying double
export function bankDoublePayout(floor: Floor): void {
  doubles.set(floor, (doubles.get(floor) ?? 0) + 1);
}

// a Wound Up: payouts bigger for woundUpMs
export function windUpBar(floor: Floor): void {
  windups.set(floor, Date.now() + CONFIG.crit.woundUpMs);
}

// a Momentum: its run starts, each payout of it a step bigger
export function startMomentum(floor: Floor): void {
  const run = momentums.get(floor);
  const until = Date.now() + CONFIG.crit.momentumMs;
  if (run) run.until = until;
  else momentums.set(floor, { until, steps: 0 });
}

// how many times as big rate crits make floor's next payout
export function ratePayoutMultiplier(floor: Floor, now: number): number {
  let payout = doubles.has(floor) ? CONFIG.crit.shortcutPayout : 1;
  const windup = windups.get(floor);
  if (windup !== undefined) {
    if (now < windup) payout *= CONFIG.crit.woundUpPayout;
    else windups.delete(floor);
  }
  const run = momentums.get(floor);
  if (run) {
    if (now < run.until)
      payout *= Math.min(
        CONFIG.crit.momentumMaxPayout,
        1 + CONFIG.crit.momentumStep * run.steps,
      );
    else momentums.delete(floor);
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

// a payout landing on floor's bar: a Quickstep's and a Momentum's step, a
// banked double spent
export function noteRatePayout(floor: Floor, now: number): void {
  const run = quicksteps.get(floor);
  if (run && now < run.until) run.steps++;
  const momentum = momentums.get(floor);
  if (momentum && now < momentum.until) momentum.steps++;
  const banked = doubles.get(floor);
  if (banked === undefined) return;
  if (banked > 1) doubles.set(floor, banked - 1);
  else doubles.delete(floor);
}
