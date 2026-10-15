// what button crits leave on an upgrade button: free taps (each a free
// upgrade), a charge (levels its next tap lands, free), half-price taps, hot
// taps (each rolling its next crit more often) and nails (its next crit
// landing again on the taps after it), which change how a tap works; and
// tap perks, each landing something on top of a tap (defineTapPerk: a crit
// defines its own). Read by the button's draw and its tap
// (floors/upgradeButton, floors/floorInteractions)
import { snapshotMap } from "../../shared/snapshotState";
import type { Floor } from "../../gameState";
import type { CritTier } from "../critTypes";
import { armCritUpgrade } from "../floorCrits/upgradeCrit";
import hotButton from "./crits/hotButtonCrit/meta";

const freeTaps = snapshotMap<Floor, number>();
const charges = snapshotMap<Floor, number>();
const hotTaps = snapshotMap<Floor, number>();
const halfTaps = snapshotMap<Floor, number>();
// how many taps the next crit landing on a nailed button plays for
const nails = snapshotMap<Floor, number>();
// a crit stuck on its button, and how many more times it's armed again
const stuck = snapshotMap<Floor, { tier: CritTier; left: number }>();

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

export function addHotTaps(floor: Floor, taps: number): void {
  addTaps(hotTaps, floor, taps);
}

export function addNails(floor: Floor, taps: number): void {
  addTaps(nails, floor, taps);
}

export function addHalfTaps(floor: Floor, taps: number): void {
  addTaps(halfTaps, floor, taps);
}

// whether floor's next paid tap costs half
export function hasHalfTap(floor: Floor): boolean {
  return halfTaps.has(floor);
}

// a paid tap on floor's button: a half-price one used up
export function takeHalfTap(floor: Floor): void {
  takeTap(halfTaps, floor);
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

// how many times a tap on floor's button rolls its next crit: a hot tap's
// rolls (using one up), else once
export function takeHotTap(floor: Floor): number {
  return takeTap(hotTaps, floor) ? hotButton.values.rolls : 1;
}

// whether floor's next tap is free (a charge or a free tap): the only bonuses
// that change how its button looks and whether it can be pressed
export function hasFreeButtonTap(floor: Floor): boolean {
  return charges.has(floor) || freeTaps.has(floor);
}

// a free tap's label in place of the price, "+30 Lvl" or "Free 7", and a
// perk's tag shown over the button, "Double 7" or "Sticky 3"; made once per
// number
const chargeLabels = new Map<number, string>();
const tapLabels = new Map<number, string>();
const hotLabels = new Map<number, string>();
const nailLabels = new Map<number, string>();
const halfLabels = new Map<number, string>();
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
  for (const perk of perks) {
    const label = tapsLabel(perk.taps, perk.labels, floor, perk.word);
    if (label) return label;
  }
  return (
    tapsLabel(hotTaps, hotLabels, floor, "Hot") ??
    tapsLabel(halfTaps, halfLabels, floor, "Half") ??
    tapsLabel(nails, nailLabels, floor, "Sticky")
  );
}

// what a tap perk lands with: the tapped floor and the building's, and the
// reward landing on screen
export interface TapPerkContext {
  floor: Floor;
  floors: Floor[];
  // levels on a floor (each a tap's worth), its bar popping label if given;
  // nothing on a locked or maxed one
  levelUp(on: Floor, levels: number, label?: string): void;
  // a floor's payout into the total, coins flying from its button
  payout(on: Floor, payouts: number): void;
  // a worker hired on a floor
  hire(on: Floor): void;
  // a floor's upgrade button pressing in
  press(on: Floor): void;
}

// taps a crit leaves on a button, each landing `land` on top of the tap's
// own level (`left` taps still to come); shown over it as "<word> N"
export interface TapPerk {
  add(floor: Floor, taps: number): void;
  has(floor: Floor): boolean;
}

interface PerkEntry {
  word: string;
  taps: WeakMap<Floor, number>;
  labels: Map<number, string>;
  land: (t: TapPerkContext, left: number) => void;
  // its taps wait while the tapped floor is maxed (it only levels it)
  levelsOwn: boolean;
}
const perks: PerkEntry[] = [];

// a crit's tap perk, made once when its module loads
export function defineTapPerk(
  word: string,
  land: (t: TapPerkContext, left: number) => void,
  levelsOwn = false,
): TapPerk {
  const taps = snapshotMap<Floor, number>();
  perks.push({ word, taps, labels: new Map(), land, levelsOwn });
  return {
    add: (floor, n) => addTaps(taps, floor, n),
    has: (floor) => taps.has(floor),
  };
}

// a tap that just landed on t.floor's button: one of each of its perks used
// up and landed
export function landTapPerks(t: TapPerkContext, maxed: boolean): void {
  for (const perk of perks) {
    if (perk.levelsOwn && maxed) continue;
    if (!takeTap(perk.taps, t.floor)) continue;
    perk.land(t, perk.taps.get(t.floor) ?? 0);
  }
}
