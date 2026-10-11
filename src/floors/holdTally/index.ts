// Hold tally: letting go of a long-press buy squeezes the floor's bar and
// bursts the levels it bought out of it, "+137 Lvl" twirling up in gold
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { punchIncomeBar } from "../incomePanel";

// a press shorter than this is a tap, not a hold
const MIN_HOLD_MS = 500;

const holds = new WeakMap<Floor, { at: number; levels: number }>();

export function startHoldTally(floor: Floor): void {
  holds.set(floor, { at: Date.now(), levels: floor.upgradeCount });
}

export function isHoldingUpgrade(floor: Floor): boolean {
  return holds.has(floor);
}

export function endHoldTally(floor: Floor): void {
  const hold = holds.get(floor);
  holds.delete(floor);
  if (!hold || Date.now() - hold.at < MIN_HOLD_MS) return;
  const bought = floor.upgradeCount - hold.levels;
  if (bought <= 0) return;
  punchIncomeBar(floor, `+${bought} Lvl`, COLOR.heavenlyGold, true);
}
