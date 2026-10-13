// what button crits leave on an upgrade button: free taps (each a free
// upgrade), a charge (levels its next tap lands, free), double taps (each
// landing two levels), payout taps (each paying its bar's payout too), hot
// taps (each rolling its next crit more often) and linked taps (each landing
// a level on every button linked to it too). Read by the button's draw and
// its tap (floors/upgradeButton, floors/floorInteractions)
import { snapshotMap } from "../../shared/snapshotState";
import type { Floor } from "../../gameState";

const freeTaps = snapshotMap<Floor, number>();
const charges = snapshotMap<Floor, number>();
const doubleTaps = snapshotMap<Floor, number>();
const payoutTaps = snapshotMap<Floor, number>();
const hotTaps = snapshotMap<Floor, number>();
const linkedTaps = snapshotMap<Floor, number>();
// not a snapshotMap: a snapshot would deep-copy the linked floors themselves
const links = new WeakMap<Floor, Floor[]>();

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

export function addHotTaps(floor: Floor, taps: number): void {
  addTaps(hotTaps, floor, taps);
}

// links `linked`'s button to floor's, for floor's linked taps
export function linkButton(floor: Floor, linked: Floor): void {
  const floors = links.get(floor);
  if (!floors) links.set(floor, [linked]);
  else if (!floors.includes(linked)) floors.push(linked);
}

// floor's taps that press its linked buttons too, if it has any
export function addLinkedTaps(floor: Floor, taps: number): void {
  if (links.has(floor)) addTaps(linkedTaps, floor, taps);
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

// whether a tap on floor's button rolls its next crit hot, using one up
export function takeHotTap(floor: Floor): boolean {
  return takeTap(hotTaps, floor);
}

// the buttons a tap on floor's presses too, using up a linked tap (null if
// none); the links go with the last one
export function takeLinkedFloors(floor: Floor): Floor[] | null {
  if (!takeTap(linkedTaps, floor)) return null;
  const floors = links.get(floor) ?? null;
  if (!linkedTaps.has(floor)) links.delete(floor);
  return floors;
}

export function hasButtonBonus(floor: Floor): boolean {
  return (
    charges.has(floor) ||
    freeTaps.has(floor) ||
    doubleTaps.has(floor) ||
    payoutTaps.has(floor) ||
    hotTaps.has(floor) ||
    linkedTaps.has(floor)
  );
}

// the button's label while it carries one, "+30 Lvl", "Free 7", "Double 7",
// "Payout 7", "Hot 7" or "Linked 7", made once per number
const chargeLabels = new Map<number, string>();
const tapLabels = new Map<number, string>();
const doubleLabels = new Map<number, string>();
const payoutLabels = new Map<number, string>();
const hotLabels = new Map<number, string>();
const linkedLabels = new Map<number, string>();
function labelOf(labels: Map<number, string>, n: number, text: string) {
  labels.set(n, text);
  return text;
}
function tapsLabel(
  taps: WeakMap<Floor, number>,
  labels: Map<number, string>,
  floor: Floor,
  word: string,
): string | null {
  const n = taps.get(floor);
  if (!n) return null;
  return labels.get(n) ?? labelOf(labels, n, `${word} ${n}`);
}
export function buttonBonusLabel(floor: Floor): string | null {
  const charge = charges.get(floor);
  if (charge)
    return (
      chargeLabels.get(charge) ??
      labelOf(chargeLabels, charge, `+${charge} Lvl`)
    );
  return (
    tapsLabel(freeTaps, tapLabels, floor, "Free") ??
    tapsLabel(doubleTaps, doubleLabels, floor, "Double") ??
    tapsLabel(payoutTaps, payoutLabels, floor, "Payout") ??
    tapsLabel(hotTaps, hotLabels, floor, "Hot") ??
    tapsLabel(linkedTaps, linkedLabels, floor, "Linked")
  );
}
