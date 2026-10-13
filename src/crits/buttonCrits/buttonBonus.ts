// what button crits leave on an upgrade button: free taps (each a free
// upgrade) and a charge (levels its next tap lands, free). Read by the
// button's draw and its tap (floors/upgradeButton, floors/floorInteractions)
import { snapshotMap } from "../../shared/snapshotState";
import type { Floor } from "../../gameState";

const freeTaps = snapshotMap<Floor, number>();
const charges = snapshotMap<Floor, number>();

export function addFreeTaps(floor: Floor, taps: number): void {
  freeTaps.set(floor, (freeTaps.get(floor) ?? 0) + taps);
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
  const taps = freeTaps.get(floor);
  if (!taps) return false;
  if (taps > 1) freeTaps.set(floor, taps - 1);
  else freeTaps.delete(floor);
  return true;
}

export function hasButtonBonus(floor: Floor): boolean {
  return charges.has(floor) || freeTaps.has(floor);
}

// the button's label while it carries one, "+30 Lvl" or "Free 7", made once
// per number
const chargeLabels = new Map<number, string>();
const tapLabels = new Map<number, string>();
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
  return null;
}
