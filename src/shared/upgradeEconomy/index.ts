import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";
import { multiply, type BigNumber } from "../bigNumber";

export const UPGRADE_ECONOMY_VERSION = 5;

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

export function upgradePriceAfter(floor: Floor, count: number): BigNumber {
  const start = CONFIG.incomePanel.upgradePriceLevelScale + floor.upgradeCount;
  return multiply(floor.upgradeCost, ((start + count) / start) ** 4);
}

export function upgradeBatchCost(floor: Floor, count: number): BigNumber {
  const start = CONFIG.incomePanel.upgradePriceLevelScale + floor.upgradeCount;
  return multiply(
    floor.upgradeCost,
    count *
      (1 +
        (2 * (count - 1)) / start +
        ((count - 1) * (2 * count - 1)) / start ** 2 +
        (count * (count - 1) ** 2) / start ** 3 +
        ((count - 1) * (2 * count - 1) * (3 * count ** 2 - 3 * count - 1)) /
          (30 * start ** 4)),
  );
}
