// what rate crits leave on an income bar: bar effects, each a value per
// floor that runs the bar faster, makes its payouts bigger or both, until it
// runs out or its payouts use it up. A crit defines its own (defineBarEffect,
// once when its module loads; ones more than one crit leaves are in
// ./barEffects). Read by the income panel's speed and payouts
// (floors/incomePanel); not persisted
import { snapshotMap } from "../../shared/snapshotState";
import type { Floor } from "../../gameState";

export interface BarEffectDef<T> {
  // how many times as fast it runs its bar right now
  speed?: (value: T, now: number) => number;
  // how many times as big it makes its bar's next payout
  payout?: (value: T, now: number) => number;
  // a payout landing on its bar: what's left of it (undefined: used up)
  onPayout?: (value: T, now: number) => T | undefined;
  // whether it has run out by now
  ended?: (value: T, now: number) => boolean;
}

interface Effect {
  values: WeakMap<Floor, unknown>;
  def: BarEffectDef<unknown>;
}
const speeds: Effect[] = [];
const payouts: Effect[] = [];
const payoutHooks: Effect[] = [];

// a bar effect's values, by floor: set one to put it on a bar
export function defineBarEffect<T>(def: BarEffectDef<T>): WeakMap<Floor, T> {
  const values = snapshotMap<Floor, T>();
  const effect = { values, def } as Effect;
  if (def.speed) speeds.push(effect);
  if (def.payout) payouts.push(effect);
  if (def.onPayout) payoutHooks.push(effect);
  return values;
}

// effect's value on floor, if it's on and hasn't run out
function live(effect: Effect, floor: Floor, now: number): unknown {
  const value = effect.values.get(floor);
  if (value === undefined) return undefined;
  if (effect.def.ended?.(value, now)) {
    effect.values.delete(floor);
    return undefined;
  }
  return value;
}

// how many times as big rate crits make floor's next payout
export function ratePayoutMultiplier(floor: Floor, now: number): number {
  let payout = 1;
  for (const effect of payouts) {
    const value = live(effect, floor, now);
    if (value !== undefined) payout *= effect.def.payout!(value, now);
  }
  return payout;
}

// how many times as fast rate crits run floor's bar right now
export function rateCritSpeed(floor: Floor, now: number): number {
  let speed = 1;
  for (const effect of speeds) {
    const value = live(effect, floor, now);
    if (value !== undefined) speed *= effect.def.speed!(value, now);
  }
  return speed;
}

// a payout landing on floor's bar: each effect's onPayout
export function noteRatePayout(floor: Floor, now: number): void {
  for (const effect of payoutHooks) {
    const value = live(effect, floor, now);
    if (value === undefined) continue;
    const left = effect.def.onPayout!(value, now);
    if (left === undefined) effect.values.delete(floor);
    else effect.values.set(floor, left);
  }
}

// a count used up one a payout
export const countDown = (left: number): number | undefined =>
  left > 1 ? left - 1 : undefined;
