// what button crits leave on an upgrade button: free taps (each a free
// upgrade), a charge (levels its next tap lands, free), double taps (each
// landing two levels), payout taps (each paying its bar's payout too), hot
// taps (each rolling its next crit more often), linked taps (each landing
// a level on every button linked to it too) and nails (its next crit landing
// again on the taps after it). Read by the button's draw and its tap
// (floors/upgradeButton, floors/floorInteractions)
import { snapshotMap } from "../../shared/snapshotState";
import type { Floor } from "../../gameState";
import type { CritTier } from "../critTypes";
import { armCritUpgrade } from "../floorCrits/upgradeCrit";

const freeTaps = snapshotMap<Floor, number>();
const charges = snapshotMap<Floor, number>();
const doubleTaps = snapshotMap<Floor, number>();
const payoutTaps = snapshotMap<Floor, number>();
const hotTaps = snapshotMap<Floor, number>();
const linkedTaps = snapshotMap<Floor, number>();
// how many taps the next crit landing on a nailed button plays for
const nails = snapshotMap<Floor, number>();
// a crit stuck on its button, and how many more times it's armed again
const stuck = snapshotMap<Floor, { tier: CritTier; left: number }>();
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

export function addNails(floor: Floor, taps: number): void {
  addTaps(nails, floor, taps);
}

// after floor's crit of `tier` is spent: armed again while it's stuck, or
// stuck if the button was nailed
export function stickSpentCrit(floor: Floor, tier: CritTier): void {
  const held = stuck.get(floor);
  if (held) {
    if (held.left > 1) held.left--;
    else stuck.delete(floor);
    armCritUpgrade(floor, held.tier);
    return;
  }
  const taps = nails.get(floor);
  if (!taps) return;
  nails.delete(floor);
  if (taps > 2) stuck.set(floor, { tier, left: taps - 2 });
  if (taps > 1) armCritUpgrade(floor, tier);
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

// whether floor's next tap is free (a charge or a free tap): the only bonuses
// that change how its button looks and whether it can be pressed
export function hasFreeButtonTap(floor: Floor): boolean {
  return charges.has(floor) || freeTaps.has(floor);
}

// a free tap's label in place of the price, "+30 Lvl" or "Free 7", and a
// perk's tag shown over the button, "Double 7", "Payout 7", "Hot 7",
// "Linked 7" or "Sticky 3"; made once per number
const chargeLabels = new Map<number, string>();
const tapLabels = new Map<number, string>();
const doubleLabels = new Map<number, string>();
const payoutLabels = new Map<number, string>();
const hotLabels = new Map<number, string>();
const linkedLabels = new Map<number, string>();
const nailLabels = new Map<number, string>();
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
export function buttonFreeLabel(floor: Floor): string | null {
  const charge = charges.get(floor);
  if (charge)
    return (
      chargeLabels.get(charge) ??
      labelOf(chargeLabels, charge, `+${charge} Lvl`)
    );
  return tapsLabel(freeTaps, tapLabels, floor, "Free");
}
export function buttonPerkLabel(floor: Floor): string | null {
  return (
    tapsLabel(doubleTaps, doubleLabels, floor, "Double") ??
    tapsLabel(payoutTaps, payoutLabels, floor, "Payout") ??
    tapsLabel(hotTaps, hotLabels, floor, "Hot") ??
    tapsLabel(linkedTaps, linkedLabels, floor, "Linked") ??
    tapsLabel(nails, nailLabels, floor, "Sticky")
  );
}
