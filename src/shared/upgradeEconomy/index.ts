import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";
import { multiply, type BigNumber } from "../bigNumber";

export const UPGRADE_ECONOMY_VERSION = 6;

export function baseFloorInterval(floorLevel: number): number {
  return Math.min(
    CONFIG.floors.baseIncomeIntervalSeconds * 2 ** (floorLevel - 1),
    CONFIG.incomePanel.maxIncomeIntervalSeconds,
  );
}

export function floorIncomeScale(floorLevel: number): number {
  return (
    CONFIG.floors.incomeGrowthFactor **
    Math.min(
      floorLevel - 1,
      Math.log2(
        CONFIG.incomePanel.maxIncomeIntervalSeconds /
          CONFIG.floors.baseIncomeIntervalSeconds,
      ),
    )
  );
}

export function upgradeSpeedMultiplier(level: number): number {
  return 1 + level / CONFIG.incomePanel.upgradeSpeedLevelScale;
}

// a floor's base income per second at `level`, as a multiple of its level-0
// income: each upgrade adds a rate step and speeds its cycle up
export function floorRateFactor(level: number): number {
  const step = CONFIG.floors.baseRateStep / CONFIG.floors.baseIncomeAmount;
  return (1 + step * level) * upgradeSpeedMultiplier(level);
}

// floor `index`'s unlock price as a multiple of its building's base unlock cost
export function floorUnlockFactor(index: number): number {
  if (index < 1) return 1;
  const { floors } = CONFIG;
  const level = Math.min(
    CONFIG.incomePanel.maxFloorLevel,
    floors.unlockLevelsPerFloor * index,
  );
  const scheduled =
    (floors.unlockIncomeSeconds *
      index *
      floorRateFactor(level) *
      floors.baseIncomeAmount) /
    floors.baseUnlockCost;
  return Math.max(floors.unlockCostGrowthFactor ** (index - 1), scheduled);
}

// the price of the upgrade bought at `level`, as a multiple of the first one:
// it costs `payback` seconds of the floor's own income, a span that grows
// by upgradePaybackGrowth of the first one's per level
export function upgradePriceFactor(level: number): number {
  return (
    floorRateFactor(level) *
    (1 + CONFIG.incomePanel.upgradePaybackGrowth * level)
  );
}

// running totals of upgradePriceFactor, so a batch costs one subtraction
const priceSums = (() => {
  const sums = new Float64Array(CONFIG.incomePanel.maxFloorLevel + 2);
  for (let level = 0; level <= CONFIG.incomePanel.maxFloorLevel; level++)
    sums[level + 1] = sums[level] + upgradePriceFactor(level);
  return sums;
})();
const clampLevel = (level: number) =>
  Math.max(0, Math.min(CONFIG.incomePanel.maxFloorLevel + 1, level));

export function upgradePriceAfter(floor: Floor, count: number): BigNumber {
  const level = floor.upgradeCount;
  return multiply(
    floor.upgradeCost,
    upgradePriceFactor(level + count) / upgradePriceFactor(level),
  );
}

export function upgradeBatchCost(floor: Floor, count: number): BigNumber {
  const level = floor.upgradeCount;
  const sum =
    priceSums[clampLevel(level + count)] - priceSums[clampLevel(level)];
  return multiply(floor.upgradeCost, sum / upgradePriceFactor(level));
}

// how many upgrades in a row cost at most 10^logCutoff each
export function upgradesWithin(
  floor: Floor,
  logPrice: number,
  logCutoff: number,
): number {
  if (logCutoff < logPrice) return 0;
  const level = floor.upgradeCount;
  const room = Math.max(0, CONFIG.incomePanel.maxFloorLevel - level);
  const limit = Math.log10(upgradePriceFactor(level)) + logCutoff - logPrice;
  let low = 1;
  let high = room;
  if (high < 1) return 0;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (Math.log10(upgradePriceFactor(level + mid - 1)) <= limit) low = mid;
    else high = mid - 1;
  }
  return low;
}
