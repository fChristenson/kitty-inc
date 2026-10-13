// what button crits leave on an upgrade button: free taps (each a free
// upgrade), a charge (levels its next tap lands, free), double taps (each
// landing two levels) and payout taps (each paying its bar's payout too).
// Read by the button's draw and its tap (floors/upgradeButton,
// floors/floorInteractions)
import { snapshotMap } from "../../shared/snapshotState";
import type { Floor } from "../../gameState";

const freeTaps = snapshotMap<Floor, number>();
const charges = snapshotMap<Floor, number>();
const doubleTaps = snapshotMap<Floor, number>();
const payoutTaps = snapshotMap<Floor, number>();

function addTaps(taps: WeakMap<Floor, number>, floor: Floor, n: number): void {
  taps.set(floor, (taps.get(floor) ?? 0) + n);
}

// whether floor has one of taps left, using it up
function takeTap(taps: WeakMap<Floor, number>, floor: Floor): boolean {
  const left = taps.get(floor);
  if (!left) return false;
  if (left > 1) taps.set(floor, left - 1);
  else taps.delete(floor);
  return true;
}

export function addFreeTaps(floor: Floor, taps: number): void {
  addTaps(freeTaps, floor, taps);
}

export function addDoubleTaps(floor: Floor, taps: number): void {
  addTaps(doubleTaps, floor, taps);
}

export function addPayoutTaps(floor: Floor, taps: number): void {
  addTaps(payoutTaps, floor, taps);
}

export function addButtonCharge(floor: Floor, levels: number): void {
  charges.set(floor, (charges.get(floor) ?? 0) + levels);
}

// the levels floor's button is charged with, used up (0 if none)
export function takeButtonCharge(floor: Floor): number {
  const charge = charges.get(floor) ?? 0;
  charges.delete(floor);
  return charge;
}

// whether floor's button has a free tap left, using one up
export function takeFreeTap(floor: Floor): boolean {
  return takeTap(freeTaps, floor);
}

// whether a tap on floor's button lands a second level, using one up
export function takeDoubleTap(floor: Floor): boolean {
  return takeTap(doubleTaps, floor);
}

// whether a tap on floor's button pays its bar's payout too, using one up
export function takePayoutTap(floor: Floor): boolean {
  return takeTap(payoutTaps, floor);
}

export function hasButtonBonus(floor: Floor): boolean {
  return (
    charges.has(floor) ||
    freeTaps.has(floor) ||
    doubleTaps.has(floor) ||
    payoutTaps.has(floor)
  );
}

// the button's label while it carries one, "+30 Lvl", "Free 7", "Double 7"
// or "Payout 7", made once per number
const chargeLabels = new Map<number, string>();
const tapLabels = new Map<number, string>();
const doubleLabels = new Map<number, string>();
const payoutLabels = new Map<number, string>();
function labelOf(labels: Map<number, string>, n: number, text: string) {
  labels.set(n, text);
  return text;
}
export function buttonBonusLabel(floor: Floor): string | null {
  const charge = charges.get(floor);
  if (charge)
    return (
      chargeLabels.get(charge) ??
      labelOf(chargeLabels, charge, `+${charge} Lvl`)
    );
  const taps = freeTaps.get(floor);
  if (taps)
    return tapLabels.get(taps) ?? labelOf(tapLabels, taps, `Free ${taps}`);
  const doubles = doubleTaps.get(floor);
  if (doubles)
    return (
      doubleLabels.get(doubles) ??
      labelOf(doubleLabels, doubles, `Double ${doubles}`)
    );
  const payouts = payoutTaps.get(floor);
  if (payouts)
    return (
      payoutLabels.get(payouts) ??
      labelOf(payoutLabels, payouts, `Payout ${payouts}`)
    );
  return null;
}
