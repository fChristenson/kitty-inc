import { createServer } from "vite";
import assert from "node:assert/strict";

const server = await createServer({ server: { middlewareMode: true } });
const income = await server.ssrLoadModule("/src/shared/income/index.ts");
const { toNumber, fromNumber } = await server.ssrLoadModule(
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

console.log("PASS: shared income formula, manager speed applied everywhere");
await server.close();
