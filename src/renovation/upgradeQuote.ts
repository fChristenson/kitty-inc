import {
  add,
  subtract,
  multiply,
  multiplyBig,
  divide,
  pow,
  log10,
  lt,
  isZero,
  ZERO,
  type BigNumber,
} from "../shared/bigNumber";
import { buyCheapestUpgrades } from "../shared/bulkPurchase";
import type { Floor } from "../gameState";

export function quoteUpgrades(
  floors: Floor[],
  money: BigNumber,
  growthFor: (floor: Floor) => number,
): { purchases: number[]; cost: BigNumber; count: number } {
  const entries = floors
    .map((floor, index) => ({
      index,
      price: floor.upgradeCost,
      growth: growthFor(floor),
      unlocked: floor.unlocked,
    }))
    .filter((entry) => entry.unlocked && !isZero(entry.price));
  const purchases = floors.map(() => 0);
  if (entries.length === 0 || isZero(money))
    return { purchases, cost: ZERO, count: 0 };
  const curves = entries.map((entry) => {
    if (!(entry.growth > 1))
      throw new Error("Upgrade quote requires increasing prices");
    return {
      ...entry,
      logPrice: log10(entry.price),
      logGrowth: Math.log10(entry.growth),
    };
  });
  const budgetLog = log10(money);
  function fitsCutoff(cutoff: number): boolean {
    let fraction = 0;
    for (const curve of curves) {
      const count = Math.max(
        0,
        Math.floor((cutoff - curve.logPrice) / curve.logGrowth) + 1,
      );
      if (count === 0) continue;
      const costLog =
        curve.logPrice +
        count * curve.logGrowth -
        Math.log10(curve.growth - 1) +
        Math.log10(-Math.expm1(-count * Math.log(curve.growth)));
      if (costLog > budgetLog) return false;
      fraction += 10 ** (costLog - budgetLog);
      if (fraction > 1) return false;
    }
    return true;
  }
  function atCutoff(cutoff: number, record = false): BigNumber {
    let total = ZERO;
    for (const curve of curves) {
      const count = Math.max(
        0,
        Math.floor((cutoff - curve.logPrice) / curve.logGrowth) + 1,
      );
      if (record) purchases[curve.index] = count;
      if (count === 0) continue;
      const cost = divide(
        subtract(
          multiplyBig(curve.price, pow(curve.growth, count)),
          curve.price,
        ),
        curve.growth - 1,
      );
      total = add(total, cost);
    }
    return total;
  }
  let lower =
    curves.reduce(
      (lowest, curve) => Math.min(lowest, curve.logPrice),
      Infinity,
    ) - 1;
  let upper = budgetLog;
  if (upper < lower) return { purchases, cost: ZERO, count: 0 };
  for (let iteration = 0; iteration < 64; iteration++) {
    const midpoint = lower + (upper - lower) / 2;
    if (midpoint === lower || midpoint === upper) break;
    if (!fitsCutoff(midpoint)) upper = midpoint;
    else lower = midpoint;
  }
  let cost = atCutoff(lower, true);
  if (lt(money, cost)) {
    lower -= Math.max(1e-10, Math.abs(lower) * Number.EPSILON * 8);
    cost = atCutoff(lower, true);
  }
  let remaining = subtract(money, cost);
  const boundary = curves.map((curve) => ({
    ...floors[curve.index],
    upgradeCost: multiplyBig(
      curve.price,
      pow(curve.growth, purchases[curve.index]),
    ),
  }));
  const byFloor = new Map(
    boundary.map((floor, index) => [floor, curves[index]]),
  );
  buyCheapestUpgrades(
    boundary,
    (price) => {
      if (
        isZero(remaining) ||
        lt(remaining, price) ||
        lt(money, add(cost, price))
      )
        return false;
      remaining = subtract(remaining, price);
      cost = add(cost, price);
      return true;
    },
    (floor) => {
      const curve = byFloor.get(floor)!;
      purchases[curve.index]++;
      floor.upgradeCost = multiply(floor.upgradeCost, curve.growth);
    },
  );
  return {
    purchases,
    cost,
    count: purchases.reduce((total, count) => total + count, 0),
  };
}
