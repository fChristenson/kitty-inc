import { createServer } from "vite";
import assert from "node:assert/strict";

const server = await createServer({ server: { middlewareMode: true } });
const { buyCheapestUpgrades } = await server.ssrLoadModule(
  "/src/shared/bulkPurchase/index.ts",
);
const { fromNumber, multiply, lt, subtract, toNumber } =
  await server.ssrLoadModule("/src/shared/bigNumber/index.ts");

function makeFloors(count, seed = 1) {
  let value = seed;
  return Array.from({ length: count }, () => {
    value = (value * 48271) % 2147483647;
    return { upgradeCost: fromNumber(1 + (value % 50)), upgradeCount: 0 };
  });
}

function wallet(start) {
  let money = fromNumber(start);
  return {
    spend: (cost) => {
      if (lt(money, cost)) return false;
      money = subtract(money, cost);
      return true;
    },
    left: () => toNumber(money),
  };
}

// heap order matches a naive "always pick the global cheapest" scan
{
  const floors = makeFloors(40, 7);
  const naive = floors.map((floor) => ({ ...floor }));
  const heaped = floors.map((floor) => ({ ...floor }));
  const a = wallet(5000);
  const b = wallet(5000);
  const naiveOrder = [];
  for (;;) {
    const cheapest = naive.reduce((low, floor) =>
      lt(floor.upgradeCost, low.upgradeCost) ? floor : low,
    );
    if (!a.spend(cheapest.upgradeCost)) break;
    naiveOrder.push(toNumber(cheapest.upgradeCost).toFixed(6));
    cheapest.upgradeCost = multiply(cheapest.upgradeCost, 1.3);
    cheapest.upgradeCount += 1;
  }
  const heapOrder = [];
  const bought = buyCheapestUpgrades(heaped, b.spend, (floor) => {
    heapOrder.push(toNumber(floor.upgradeCost).toFixed(6));
    floor.upgradeCost = multiply(floor.upgradeCost, 1.3);
    floor.upgradeCount += 1;
  });
  assert.equal(bought, naiveOrder.length, "purchase count");
  assert.deepEqual(heapOrder, naiveOrder, "purchase order");
  assert.deepEqual(
    heaped.map((f) => f.upgradeCount).sort(),
    naive.map((f) => f.upgradeCount).sort(),
    "per-floor totals",
  );
  assert.equal(a.left().toFixed(6), b.left().toFixed(6), "money left");
}

// empty input and an unaffordable first pick both stop immediately
assert.equal(
  buyCheapestUpgrades(
    [],
    () => true,
    () => {},
  ),
  0,
);
assert.equal(
  buyCheapestUpgrades(
    makeFloors(5),
    () => false,
    () => {
      throw new Error("bought while broke");
    },
  ),
  0,
);

// the limit caps purchases, and always spends it on the cheapest floor
{
  const floors = makeFloors(20, 11);
  const purse = wallet(1e6);
  const cheapest = floors.reduce((low, floor) =>
    lt(floor.upgradeCost, low.upgradeCost) ? floor : low,
  );
  const bought = buyCheapestUpgrades(
    floors,
    purse.spend,
    (floor) => {
      floor.upgradeCost = multiply(floor.upgradeCost, 1.3);
      floor.upgradeCount += 1;
    },
    1,
  );
  assert.equal(bought, 1, "limit honoured");
  assert.equal(cheapest.upgradeCount, 1, "limit spent on the cheapest floor");
  assert.equal(
    floors.reduce((sum, floor) => sum + floor.upgradeCount, 0),
    1,
    "no other floor touched",
  );
}

// the company-wide case that used to freeze the page
{
  const floors = makeFloors(1200, 3);
  const purse = wallet(1e12);
  const started = performance.now();
  const bought = buyCheapestUpgrades(floors, purse.spend, (floor) => {
    floor.upgradeCost = multiply(floor.upgradeCost, 1.3);
    floor.upgradeCount += 1;
  });
  const elapsed = performance.now() - started;
  assert(bought > 10000, `expected a big sweep, got ${bought}`);
  assert(elapsed < 1000, `sweep took ${elapsed.toFixed(0)}ms`);
  console.log(
    `PASS: ${bought} purchases over 1200 floors in ${elapsed.toFixed(0)}ms`,
  );
}

await server.close();
