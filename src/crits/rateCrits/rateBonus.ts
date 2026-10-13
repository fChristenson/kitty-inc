// what rate crits leave on an income bar: an Overclock's run of extra speed
// and a Quickstep's quickening (each landing and payout a step faster). Read
// by the income panel's speed and payouts (floors/incomePanel); not persisted
import { snapshotMap } from "../../shared/snapshotState";
import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";

const overclocks = snapshotMap<Floor, number>();
const quicksteps = snapshotMap<Floor, { until: number; steps: number }>();

export function overclockBar(floor: Floor): void {
  overclocks.set(floor, Date.now() + CONFIG.crit.overclockMs);
}

// a Quickstep's step: starts its run if none is on
export function stepBar(floor: Floor): void {
  const now = Date.now();
  const run = quicksteps.get(floor);
  if (run && now < run.until) run.steps++;
  else quicksteps.set(floor, { until: now + CONFIG.crit.quickstepMs, steps: 1 });
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

// a payout landing on floor's bar: a Quickstep's step
export function noteRatePayout(floor: Floor, now: number): void {
  const run = quicksteps.get(floor);
  if (run && now < run.until) run.steps++;
}
