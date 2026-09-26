import {
  add,
  log10,
  fromLog10,
  lt,
  isZero,
  ZERO,
  type BigNumber,
} from "../shared/bigNumber";
import type { Floor } from "../gameState";
import { CONFIG } from "../config";
import { upgradePriceAfter, upgradeBatchCost } from "../shared/upgradeEconomy";

export function quoteUpgrades(
  floors: Floor[],
  money: BigNumber,
): { purchases: number[]; cost: BigNumber; count: number } {
  const entries = floors
    .map((floor, index) => ({
      index,
      price: floor.upgradeCost,
      floor,
      unlocked: floor.unlocked,
    }))
    .filter((entry) => entry.unlocked);
  const purchases = floors.map(() => 0);
  if (entries.length === 0 || isZero(money))
    return { purchases, cost: ZERO, count: 0 };
  if (entries.some((entry) => isZero(entry.price))) {
    throw new RangeError("Cannot quote unlimited upgrades with a zero price");
  }
  const curves = entries.map((entry) => ({
    ...entry,
    logPrice: log10(entry.price),
  }));
  const overBudget = fromLog10(log10(money) + 1);
  // huge balances would otherwise plan more upgrades than a job can ever replay
  const maxCount = (curve: (typeof curves)[number]): number =>
    Math.min(
      CONFIG.renovation.maxUpgradesPerFloor,
      Number.MAX_SAFE_INTEGER - curve.floor.upgradeCount,
    );
  function atCutoff(cutoff: number, record = false): BigNumber {
    let total = ZERO;
    for (const curve of curves) {
      const uncapped =
        cutoff < curve.logPrice
          ? 0
          : Math.max(
              0,
              Math.floor(
                (CONFIG.incomePanel.upgradePriceLevelScale +
                  curve.floor.upgradeCount) *
                  Math.expm1(((cutoff - curve.logPrice) * Math.LN10) / 4),
              ) + 1,
            );
      if (!Number.isFinite(uncapped)) return overBudget;
      const count = Math.min(uncapped, maxCount(curve));
      if (record) purchases[curve.index] = count;
      if (count === 0) continue;
      const cost = upgradeBatchCost(curve.floor, count);
      total = add(total, cost);
    }
    return total;
  }
  let lower =
    curves.reduce(
      (lowest, curve) =>
        isZero(curve.price) ? lowest : Math.min(lowest, curve.logPrice),
      Infinity,
    ) - 1;
  let upper = log10(money);
  if (upper < lower) return { purchases, cost: ZERO, count: 0 };
  for (let iteration = 0; iteration < 64; iteration++) {
    const midpoint = lower + (upper - lower) / 2;
    if (midpoint === lower || midpoint === upper) break;
    if (lt(money, atCutoff(midpoint))) upper = midpoint;
    else lower = midpoint;
  }
  let cost = atCutoff(lower, true);
  if (lt(money, cost)) {
    lower -= Math.max(1e-10, Math.abs(lower) * Number.EPSILON * 8);
    cost = atCutoff(lower, true);
  }
  for (;;) {
    let cheapest: (typeof curves)[number] | undefined;
    let price = money;
    for (const curve of curves) {
      if (purchases[curve.index] >= maxCount(curve)) continue;
      const nextPrice = upgradePriceAfter(curve.floor, purchases[curve.index]);
      if (!cheapest || lt(nextPrice, price)) {
        cheapest = curve;
        price = nextPrice;
      }
    }
    if (!cheapest || lt(money, add(cost, price))) break;
    cost = add(cost, price);
    purchases[cheapest.index]++;
  }
  return {
    purchases,
    cost,
    count: purchases.reduce((total, count) => total + count, 0),
  };
}
