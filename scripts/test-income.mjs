import { createServer } from "vite";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await createServer({ server: { middlewareMode: true } });
const income = await server.ssrLoadModule("/src/shared/income/index.ts");
const { toNumber, fromNumber, add } = await server.ssrLoadModule(
  "/src/shared/bigNumber/index.ts",
);
const { CONFIG } = await server.ssrLoadModule("/src/config.ts");

const perUpgrade = CONFIG.officeUpgrades.speedMultiplierPerUpgrade;

function floor(overrides = {}) {
  return {
    incomeAmount: fromNumber(100),
    incomeIntervalSeconds: 60,
    hasOfficeChairs: false,
    hasOfficeSupplies: false,
    hasManager: false,
    lastCollectedAt: 0,
    ...overrides,
  };
}

// the office/manager speed multiplier is one shared definition
assert.equal(income.officeUpgradeSpeedMultiplier(floor()), 1);
assert.equal(
  income.officeUpgradeSpeedMultiplier(floor({ hasManager: true })),
  perUpgrade,
);
assert.equal(
  income.officeUpgradeSpeedMultiplier(
    floor({ hasManager: true, hasOfficeChairs: true, hasOfficeSupplies: true }),
  ),
  perUpgrade ** 3,
);

// ...and hiring a manager really does raise the shared base rate every price
// and per-click payout is derived from
{
  const without = toNumber(income.baseIncomeRatePerSecond(floor()));
  const withManager = toNumber(
    income.baseIncomeRatePerSecond(floor({ hasManager: true })),
  );
  assert.ok(
    Math.abs(withManager / without - perUpgrade) < 1e-9,
    `manager should scale the base rate by ${perUpgrade}, got ${withManager / without}`,
  );
}

// baseIncomeRatePerSecond is exactly currentIncomeRatePerSecond fed the office
// multiplier — no second formula anywhere
for (const f of [
  floor(),
  floor({ hasManager: true }),
  floor({ hasManager: true, hasOfficeChairs: true }),
]) {
  assert.equal(
    toNumber(income.baseIncomeRatePerSecond(f)),
    toNumber(
      income.currentIncomeRatePerSecond(
        f,
        income.officeUpgradeSpeedMultiplier(f),
      ),
    ),
  );
}

// the idle catch-up and the live ticker price the same span identically
{
  const speed = income.officeUpgradeSpeedMultiplier(
    floor({ hasManager: true }),
  );
  const live = floor({ hasManager: true });
  const elapsedMs = 10 * 60 * 1000;
  const collected = toNumber(income.collectDueIncome(live, elapsedMs, speed));
  const peeked = toNumber(
    income.peekDueIncome(floor({ hasManager: true }), elapsedMs, speed),
  );
  assert.equal(collected, peeked, "collect and peek must agree");
  assert.ok(collected > 0, "a manager-boosted floor should pay out");
}

{
  const originalNow = Date.now;
  const globals = new Map(
    ["window", "document", "Image", "localStorage"].map((key) => [
      key,
      globalThis[key],
    ]),
  );
  const storage = new Map([
    ["cash-clicker:active-company-index", "1"],
    [
      "cash-clicker:corporation-names",
      JSON.stringify(["First", "Active", "Third"]),
    ],
    ["cash-clicker:last-close", "10000"],
  ]);
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.document = { addEventListener() {} };
  globalThis.Image = class {
    width = 1;
    height = 1;
    set src(_value) {
      queueMicrotask(() => this.onload?.());
    }
  };
  Date.now = () => 20000;
  try {
    const companies = await server.ssrLoadModule("/src/company/index.ts");
    for (const [index, rate] of [3, 2, 5].entries()) {
      companies.saveCompanyRecord(index, {
        bankedTotal: fromNumber((index + 1) * 100),
        incomeRatePerSecond: fromNumber(rate),
        assetValue: fromNumber(0),
        upgradesValue: fromNumber(0),
        updatedAt: 10000,
      });
    }
    const economy = await server.ssrLoadModule("/src/totalIncome/index.ts");
    const { computeIdleIncome } = await server.ssrLoadModule(
      "/src/gameState/index.ts",
    );
    const buildings = [[floor({ unlocked: true, lastCollectedAt: 10000 })]];
    const idleIncome = computeIdleIncome(buildings, () => fromNumber(2));
    const dormantIncome = economy.getDormantCompaniesIdleIncome(10000, 20000);
    const displayedTotal = add(idleIncome, dormantIncome);
    economy.addTotalIncome(idleIncome);
    assert.equal(toNumber(idleIncome), 20);
    assert.equal(toNumber(dormantIncome), 80);
    assert.equal(toNumber(displayedTotal), 100);
    for (const [index, expected] of [130, 220, 350].entries()) {
      assert(
        Math.abs(toNumber(economy.getStoredTotalIncome(index)) - expected) <
          1e-9,
        `company ${index} retains only its own idle earnings`,
      );
    }
    assert(
      Math.abs(toNumber(economy.getAllCompaniesTotalIncome()) - 700) < 1e-9,
    );
    assert.equal(
      toNumber(computeIdleIncome(buildings, () => fromNumber(2))),
      0,
      "active idle earnings cannot be collected twice",
    );
    assert.equal(toNumber(economy.getStoredTotalIncome(0)), 130);
    assert.equal(toNumber(economy.getStoredTotalIncome(2)), 350);
    const main = await readFile("src/main.ts", "utf8");
    assert.match(
      main,
      /addTotalIncome\(idleIncome\);\s*totalEarnedOverlay\.show\(totalIdleIncome\)/,
    );
    assert.doesNotMatch(main, /addTotalIncome\(totalIdleIncome\)/);
  } finally {
    Date.now = originalNow;
    for (const [key, value] of globals) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
}

console.log(
  "PASS: shared income formula, manager speed, per-company idle earnings and combined display",
);
await server.close();
