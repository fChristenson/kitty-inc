// Hold tally: letting go of a long-press buy rattles the floor's bar with a
// flash per hundred levels the hold bought, then the bar does the jackpot
// slam and lands with the total on it, "+137 Lvl" in gold
import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { playBarExplosion } from "../../shared/explosionBang";
import { shakeScreen } from "../../shared/screenShake";
import { SLAM_LAND_MS, triggerEventEndSlam } from "../../shared/eventEndSlam";
import { punchIncomeBar } from "../incomePanel";

// a press shorter than this is a tap, not a hold
const MIN_HOLD_MS = 500;
const FLASH_LEVELS = 100;
const MAX_FLASHES = 10;
const FLASH_GAP_MS = 50;
const FLASH_SHAKE = 0.3;
const FLASH_PITCH_STEP = 0.08;

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
  const flashes = Math.min(MAX_FLASHES, Math.floor(bought / FLASH_LEVELS));
  for (let k = 0; k < flashes; k++)
    setTimeout(() => {
      punchIncomeBar(floor, null, COLOR.heavenlyGold);
      shakeScreen(FLASH_SHAKE);
      playBarExplosion(1 + k * FLASH_PITCH_STEP);
    }, k * FLASH_GAP_MS);
  // the slam brings its own bang and shake on the impact
  setTimeout(() => {
    triggerEventEndSlam(floor, "bar");
    setTimeout(
      () => punchIncomeBar(floor, `+${bought} Lvl`, COLOR.heavenlyGold),
      SLAM_LAND_MS,
    );
  }, flashes * FLASH_GAP_MS);
}
