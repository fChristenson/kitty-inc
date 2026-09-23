import { createServer } from "vite";
import assert from "node:assert/strict";

const server = await createServer({ server: { middlewareMode: true } });
const { createPurchaseFeedback, getPurchaseJumpOffset } =
  await server.ssrLoadModule("/src/shared/purchaseFeedback/index.ts");
{
  const events = [];
  const feedback = createPurchaseFeedback({
    sound: () => events.push("sound"),
    burst: (...args) => events.push(args),
    redraw: () => events.push("redraw"),
  });
  const originalNow = Date.now;
  try {
    Date.now = () => 1000;
    for (const target of [0, 1, 2, 3]) {
      feedback(target, 10, 20, 0.3);
      assert.equal(
        getPurchaseJumpOffset(target, 1250),
        -8,
        "identical jump timing for each purchase",
      );
      assert.equal(
        getPurchaseJumpOffset(target, 1500),
        0,
        "jump expires consistently",
      );
    }
    assert.deepEqual(
      events,
      Array.from({ length: 4 }, () => [
        "sound",
        [10, 20, 0.3],
        "redraw",
      ]).flat(),
    );
  } finally {
    Date.now = originalNow;
  }
}
const { buyCheapestUpgrades } = await server.ssrLoadModule(
  "/src/shared/bulkPurchase/index.ts",
);
const { fromNumber, multiply, lt, subtract, toNumber } =
  await server.ssrLoadModule("/src/shared/bigNumber/index.ts");
const { runDetachedJob, isDetachedJobRunning } = await server.ssrLoadModule(
  "/src/shared/detachedJob/index.ts",
);
const {
  createRenovationController,
  renovateFloors,
  planRenovation,
  createFixedRenovationPlan,
  planBuildingCompletion,
  createFloorUnlockStep,
  createBuildingCompletionStep,
} = await server.ssrLoadModule("/src/renovation/index.ts");

{
  const loading = [];
  const shown = [];
  const controller = createRenovationController({
    setLoading: (visible) => loading.push(visible),
    showRewards: (rewards) => {
      assert.equal(
        loading.at(-1),
        false,
        "loading must clear before rewards appear",
      );
      shown.push(rewards);
    },
  });
  let finish;
  controller.setView(0, 2, false);
  const job = controller.start(
    0,
    2,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  assert.equal(
    loading.at(-1),
    true,
    "loading appears on the renovating building",
  );
  controller.setView(0, 2, true);
  assert.equal(loading.at(-1), false, "map stays usable");
  controller.setView(0, 3, false);
  finish({ badges: { heavenly: 1 } });
  assert.equal(await job, true);
  assert.equal(shown.length, 0, "no rewards on another building");
  controller.setView(1, 2, false);
  assert.equal(shown.length, 0, "no rewards on another company");
  controller.setView(0, 2, false);
  assert.deepEqual(shown, [{ heavenly: 1 }]);
  controller.setView(0, 2, false);
  assert.equal(shown.length, 1, "rewards shown once");
  await assert.rejects(
    controller.start(0, 2, async () => {
      throw new Error("cancelled");
    }),
    /cancelled/,
  );
  assert.equal(loading.at(-1), false, "failure clears loading");
  await controller.start(0, 2, async () => ({ badges: { boost: 2 } }));
  assert.deepEqual(
    shown.at(-1),
    { boost: 2 },
    "visible building shows completed rewards immediately",
  );
  controller.setView(0, 2, true);
  await controller.start(0, 2, async () => ({ badges: { boost: 1 } }));
  await controller.start(0, 2, async () => ({
    badges: { boost: 2, booty: 1 },
  }));
  const shownBeforeRenovation = shown.length;
  const nextJob = controller.start(
    0,
    2,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  controller.setView(0, 2, false);
  assert.equal(
    loading.at(-1),
    true,
    "entering an active renovation shows loading",
  );
  assert.equal(
    shown.length,
    shownBeforeRenovation,
    "older badges wait for the active renovation",
  );
  controller.setView(0, 2, true);
  controller.setView(0, 3, false);
  controller.setView(0, 2, false);
  assert.equal(loading.at(-1), true);
  assert.equal(
    shown.length,
    shownBeforeRenovation,
    "revisiting cannot release queued badges early",
  );
  finish({ badges: { boost: 4, heavenly: 1 } });
  assert.equal(await nextJob, true);
  assert.equal(loading.at(-1), false);
  assert.equal(shown.length, shownBeforeRenovation + 1);
  controller.setView(0, 2, false);
  assert.deepEqual(
    shown.at(-1),
    { boost: 7, booty: 1, heavenly: 1 },
    "successive map jobs accumulate unseen rewards",
  );
  assert.equal(
    shown.length,
    shownBeforeRenovation + 1,
    "combined rewards appear only once",
  );
}

{
  let live = { count: 0 };
  let commits = 0;
  const job = runDetachedJob({
    clone: () => structuredClone(live),
    step: (draft) => {
      assert.equal(isDetachedJobRunning(), true);
      assert.equal(live.count, 0, "draft never mutates live state");
      if (draft.count === 130) return false;
      draft.count++;
      return true;
    },
    commit: (draft) => {
      live = draft;
      commits++;
    },
  });
  assert.equal(isDetachedJobRunning(), false, "scope ends between chunks");
  assert.equal(await job, true);
  assert.equal(live.count, 130);
  assert.equal(commits, 1);
  await assert.rejects(
    runDetachedJob({
      clone: () => structuredClone(live),
      step: () => {
        throw new Error("failed draft");
      },
      commit: () => {
        throw new Error("must not commit");
      },
    }),
    /failed draft/,
  );
  assert.equal(isDetachedJobRunning(), false, "scope restored after errors");
}

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

{
  const { quoteUpgrades } = await server.ssrLoadModule(
    "/src/renovation/upgradeQuote.ts",
  );
  for (let seed = 1; seed <= 40; seed++) {
    const floors = makeFloors(20, seed).map((floor, index) => ({
      ...floor,
      unlocked: index !== 19,
      aboveCapTier: index % 3 === 0,
    }));
    const growth = (floor) => (floor.aboveCapTier ? 1.6 : 1.3);
    const budget = 1000 * seed + 0.123;
    const purse = wallet(budget);
    const copies = structuredClone(floors);
    const count = buyCheapestUpgrades(
      copies.filter((floor) => floor.unlocked),
      purse.spend,
      (floor) => {
        floor.upgradeCount++;
        floor.upgradeCost = multiply(floor.upgradeCost, growth(floor));
      },
    );
    const quote = quoteUpgrades(floors, fromNumber(budget), growth);
    assert.equal(
      quote.count,
      count,
      `direct quote purchase count, seed ${seed}`,
    );
    const groups = new Map();
    floors.forEach((floor, index) => {
      const key = `${toNumber(floor.upgradeCost)}:${growth(floor)}:${floor.unlocked}`;
      const group = groups.get(key) ?? { actual: 0, expected: 0 };
      group.actual += quote.purchases[index];
      group.expected += copies[index].upgradeCount;
      groups.set(key, group);
    });
    for (const group of groups.values())
      assert.equal(group.actual, group.expected);
    assert(
      Math.abs(toNumber(quote.cost) - (budget - purse.left())) < budget * 1e-12,
    );
  }
  const huge = quoteUpgrades(
    [{ unlocked: true, upgradeCost: fromNumber(1) }],
    { mantissa: 1, exponent: 100000 },
    () => 1.3,
  );
  assert(huge.count > 800000, "late-game quote uses arbitrary-magnitude money");
  assert(lt(huge.cost, { mantissa: 1, exponent: 100000 }));
  console.log(
    "PASS: direct geometric quotes match cheapest-first simulation and huge balances",
  );
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

try {
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    AudioContext: class {
      constructor() {
        throw new Error("Unexpected sound in detached job");
      }
    },
  };
  globalThis.document = { addEventListener() {} };
  globalThis.Image = class {
    width = 1;
    height = 1;
    set src(_value) {
      queueMicrotask(() => this.onload?.());
    }
  };
  const { buildFloor } = await server.ssrLoadModule("/src/floors/index.ts");
  const actions = await server.ssrLoadModule(
    "/src/floors/floorInteractions/index.ts",
  );
  const buttons = await server.ssrLoadModule(
    "/src/floors/upgradeButton/index.ts",
  );
  const locks = await server.ssrLoadModule("/src/floors/floorLock/index.ts");
  const {
    createBuilding,
    getBuildingMultiplier,
    getBuildingPrice,
    configureBuildingFloorPrices,
  } = await server.ssrLoadModule("/src/buildings/index.ts");
  const { CONFIG } = await server.ssrLoadModule("/src/config.ts");
  {
    const previousGrowth = CONFIG.floors.floorEconomyMultiplierPerBuilding;
    const buildingPrice = getBuildingPrice(1);
    try {
      CONFIG.floors.floorEconomyMultiplierPerBuilding = 10;
      assert.equal(getBuildingMultiplier(0), 1);
      assert.equal(getBuildingMultiplier(1), 10);
      assert.equal(getBuildingMultiplier(2), 100);
      const firstPaidFloor = buildFloor(2, {
        backgroundCount: 1,
        multiplier: getBuildingMultiplier(1),
      });
      const nextFloor = buildFloor(3, {
        backgroundCount: 1,
        multiplier: getBuildingMultiplier(1),
      });
      assert.equal(
        toNumber(firstPaidFloor.unlockCost),
        CONFIG.floors.baseUnlockCost * 10,
      );
      assert.equal(
        toNumber(nextFloor.unlockCost),
        CONFIG.floors.baseUnlockCost *
          10 *
          CONFIG.floors.unlockCostGrowthFactor,
      );
      assert.deepEqual(
        getBuildingPrice(1),
        buildingPrice,
        "floor scaling cannot alter building purchase prices",
      );
      assert.equal(toNumber(buildingPrice), CONFIG.buildings.basePrice);
    } finally {
      CONFIG.floors.floorEconomyMultiplierPerBuilding = previousGrowth;
    }
  }
  const { collectDueIncome, currentIncomeRatePerSecond } =
    await server.ssrLoadModule("/src/floors/incomePanel/index.ts");
  for (const buildingIndex of [0, 1, 2, 40]) {
    const floors = createBuilding(buildingIndex, 1);
    const multiplier = getBuildingMultiplier(buildingIndex);
    const deps = { floors, backgroundCount: 1, multiplier, onAdd() {} };
    const base =
      buildingIndex === 0
        ? fromNumber(CONFIG.floors.baseUnlockCost)
        : multiply(
            getBuildingPrice(buildingIndex),
            CONFIG.floors.unlockCostBuildingPriceMultiplier,
          );
    locks.ensureLockedFloorAbove(deps);
    assert.deepEqual(
      floors[1].unlockCost,
      base,
      "floor two costs twice the building price",
    );
    if (buildingIndex === 1) assert.equal(toNumber(floors[1].unlockCost), 2e9);
    const quote = locks.getBuildingUnlockAllCost(floors, multiplier);
    const { add, ZERO } = await server.ssrLoadModule(
      "/src/shared/bigNumber/index.ts",
    );
    let actual = ZERO;
    let expected = base;
    while (!floors.at(-1).unlocked) {
      const target = floors.at(-1);
      assert.equal(target.unlockCost.exponent, expected.exponent);
      assert(
        Math.abs(target.unlockCost.mantissa - expected.mantissa) < 1e-12,
        "each higher floor doubles its unlock price",
      );
      actual = add(actual, target.unlockCost);
      locks.unlockFloor(target);
      locks.ensureLockedFloorAbove(deps);
      expected = multiply(expected, CONFIG.floors.unlockCostGrowthFactor);
    }
    assert.deepEqual(
      actual,
      quote,
      "bulk quote matches individually unlocked floors",
    );
  }
  {
    const floors = createBuilding(1, 1);
    const deps = {
      floors,
      backgroundCount: 1,
      multiplier: getBuildingMultiplier(1),
      onAdd() {},
    };
    floors[0].priceDiscountMultiplier = 0.5;
    locks.ensureLockedFloorAbove(deps);
    assert.equal(
      toNumber(floors[1].unlockCost),
      1e9,
      "discount applies to building-anchored base",
    );
    locks.unlockFloor(floors[1]);
    const paidPrice = floors[1].unlockCost;
    locks.ensureLockedFloorAbove(deps);
    assert.equal(
      toNumber(floors[2].unlockCost),
      2e9,
      "future floors inherit discount once",
    );
    floors[2].unlockCost = fromNumber(123);
    delete floors[0].buildingFloorUnlockBaseCost;
    const incomeBefore = floors[0].incomeAmount;
    configureBuildingFloorPrices(floors, 1);
    assert.equal(
      toNumber(floors[2].unlockCost),
      2e9,
      "restored locked floor is repriced",
    );
    assert.deepEqual(
      floors[1].unlockCost,
      paidPrice,
      "paid floor prices remain historical",
    );
    assert.deepEqual(
      floors[0].incomeAmount,
      incomeBefore,
      "unlock pricing does not change income",
    );
    configureBuildingFloorPrices(floors, 1);
    assert.equal(
      toNumber(floors[2].unlockCost),
      2e9,
      "setup does not compound discounts",
    );
  }
  for (const buildingIndex of [0, 1, 5]) {
    const floors = createBuilding(buildingIndex, 1);
    const ground = floors[0];
    assert.equal(
      ground.unlocked,
      true,
      "new building includes an unlocked ground floor",
    );
    assert.equal(
      toNumber(ground.unlockCost),
      0,
      "ground floor has no extra unlock charge",
    );
    assert(toNumber(currentIncomeRatePerSecond(ground, Date.now())) > 0);
    assert(
      toNumber(collectDueIncome(ground, ground.lastCollectedAt + 60000)) > 0,
      "new ground floor earns income without another purchase",
    );
    locks.ensureLockedFloorAbove({
      floors,
      backgroundCount: 1,
      multiplier: getBuildingMultiplier(buildingIndex),
      onAdd() {},
    });
    assert.equal(floors.length, 2);
    assert.equal(floors[0], ground);
    assert.equal(
      floors[1].unlocked,
      false,
      "only the next floor needs unlocking",
    );
    assert(toNumber(floors[1].unlockCost) > 0);
  }
  const crit = await server.ssrLoadModule("/src/shared/critTypes/index.ts");
  const economy = await server.ssrLoadModule("/src/totalIncome/index.ts");
  const workers = await server.ssrLoadModule("/src/gameState/index.ts");
  {
    const previousStorage = globalThis.localStorage;
    const brokenGround = createBuilding(1, 1, { groundFloorLocked: true })[0];
    brokenGround.lastCollectedAt = 123;
    const existingGround = createBuilding(0, 1)[0];
    existingGround.lastCollectedAt = 456;
    const saved = JSON.stringify({
      buildings: [
        [{ ...brokenGround, workers: [] }],
        [{ ...existingGround, workers: [] }],
      ],
    });
    globalThis.localStorage = { getItem: () => saved };
    try {
      const restored = workers.loadBuildings();
      assert.equal(
        restored[0][0].unlocked,
        true,
        "old locked ground floors recover on load",
      );
      assert.equal(toNumber(restored[0][0].unlockCost), 0);
      assert(
        restored[0][0].lastCollectedAt > 123,
        "new income starts at recovery",
      );
      assert.equal(
        restored[1][0].lastCollectedAt,
        456,
        "working ground-floor timers remain untouched",
      );
    } finally {
      if (previousStorage === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = previousStorage;
    }
  }
  const { cloneWithSnapshotState } = await server.ssrLoadModule(
    "/src/shared/snapshotState/index.ts",
  );
  const { runDetachedStep } = await server.ssrLoadModule(
    "/src/shared/detachedJob/index.ts",
  );
  const { runBuildingJob } = await server.ssrLoadModule(
    "/src/shared/buildingJob/index.ts",
  );
  const coins = await server.ssrLoadModule("/src/floors/coins/index.ts");
  const flashes = await server.ssrLoadModule("/src/screenShake/index.ts");
  const originalRandom = Math.random;
  const originalNow = Date.now;
  const now = Date.now();
  Date.now = () => now;
  Math.random = () => 0.999999;
  const makeBuilding = () =>
    [1, 2, 3].map((level) => {
      const floor = buildFloor(level, { backgroundCount: 1 });
      floor.unlocked = level < 3;
      return floor;
    });
  const depsFor = (draft) => ({
    floors: draft.buildings[0],
    backgroundCount: 1,
    multiplier: 1,
    persist() {},
    onFloorAdded() {},
    createMysticBuilding() {
      draft.buildings.push(makeBuilding());
    },
    getCompanyValue: () => fromNumber(1000),
    applyCompanyWideBoost() {
      for (const floors of draft.buildings)
        for (const floor of floors)
          if (floor.unlocked) workers.activateBoosted(floor, 0, now);
    },
    getScreenCenterLocal() {
      throw new Error("Silent reward requested screen coordinates");
    },
  });
  try {
    const { increaseIncomeRateBy } = await server.ssrLoadModule(
      "/src/floors/incomePanel/index.ts",
    );
    const { add } = await server.ssrLoadModule(
      "/src/shared/bigNumber/index.ts",
    );
    for (const multiplier of [1, 1e200]) {
      for (const startingTier of [null, "crit", "mega"]) {
        for (const count of [0, 9, 10, 49, 50, 10000]) {
          const floors = [1, 2].map((level) =>
            buildFloor(level, {
              backgroundCount: 1,
              multiplier,
              defaultCritTier: startingTier,
            }),
          );
          const floor = floors[1];
          floor.unlocked = true;
          increaseIncomeRateBy(floor, count);
          const bonus = fromNumber(7 * multiplier);
          floor.incomeAmount = add(floor.incomeAmount, bonus);
          const unchanged = {
            upgradeCount: floor.upgradeCount,
            upgradeCost: floor.upgradeCost,
            rateStep: floor.rateStep,
            incomeIntervalSeconds: floor.incomeIntervalSeconds,
            lastCollectedAt: floor.lastCollectedAt,
          };
          const draft = { buildings: [floors], money: fromNumber(10000) };
          const deps = { ...depsFor(draft), multiplier };
          const point = buttons.getButtonCenter(false);
          const click = () => {
            const previousRaf = globalThis.requestAnimationFrame;
            globalThis.requestAnimationFrame = () => 1;
            try {
              runDetachedStep(() =>
                actions.handleFloorClick(deps, floor, point.x, point.y, false),
              );
            } finally {
              if (previousRaf === undefined)
                delete globalThis.requestAnimationFrame;
              else globalThis.requestAnimationFrame = previousRaf;
            }
          };
          let previousTier = startingTier;
          while (previousTier !== "ultra") {
            buttons.triggerOvertimeBoost(floor, fromNumber(20));
            floor.overtimeTicks = buttons.getOvertimeTickGoal(floor) - 2;
            const before = floor.incomeAmount;
            click();
            assert.deepEqual(
              floor.incomeAmount,
              before,
              "no early revaluation",
            );
            assert.equal(floor.critMultiplierTier, previousTier);
            click();
            const promotedTier = crit.nextCritTier(previousTier);
            const reference = buildFloor(2, {
              backgroundCount: 1,
              multiplier,
              defaultCritTier: promotedTier,
            });
            increaseIncomeRateBy(reference, count);
            const expected = toNumber(add(reference.incomeAmount, bonus));
            assert(
              Math.abs(toNumber(floor.incomeAmount) / expected - 1) < 1e-12,
              `${startingTier}: ${count} upgrades revalued at ${promotedTier}`,
            );
            assert.equal(floor.critMultiplierTier, promotedTier);
            for (const [key, value] of Object.entries(unchanged))
              assert.deepEqual(
                floor[key],
                value,
                `${key} unchanged by overtime`,
              );
            assert.equal(buttons.getOvertimeTicks(floor), 0);
            assert.equal(buttons.isOvertimeActive(floor, now), false);
            previousTier = promotedTier;
          }
        }
      }
    }
    console.log(
      "PASS: overtime revalues existing upgrades at each promoted tier without changing costs or timers",
    );
    for (const [tier, randomValues] of [
      ["crit", [0.999999, 0.999999, 0]],
      ["mega", [0.999999, 0]],
      ["ultra", [0]],
    ]) {
      const countsBefore = crit.CRIT_PROC_KINDS.map(crit.getCritProcCount);
      let rollCount = 0;
      Math.random = () => randomValues[rollCount++] ?? 0;
      const rolled = buttons.rollFloorBuyCrit(false);
      assert.equal(
        rolled.tier,
        tier,
        "automated building/floor rolls retain all base tiers",
      );
      assert.equal(
        rollCount,
        randomValues.length,
        "automated roll never enters the special gateway",
      );
      assert.equal(rolled.bonusTier, null);
      assert(crit.CRIT_PROC_KINDS.every((kind) => !rolled[kind]));

      const draft = { buildings: [makeBuilding()], money: fromNumber(10000) };
      const floor = draft.buildings[0][0];
      rollCount = 0;
      runDetachedStep(() =>
        economy.withDraftEconomy(draft, () =>
          actions.performAutomatedUpgradeClick(depsFor(draft), floor, true),
        ),
      );
      assert.equal(
        buttons.getCritTier(floor),
        tier,
        "ordinary automated purchase can arm each tier",
      );
      assert(
        crit.CRIT_PROC_KINDS.every((kind) => !crit.readCritProcs(floor)[kind]),
      );
      Math.random = () => 0.999999;
      const balance = draft.money;
      runDetachedStep(() =>
        economy.withDraftEconomy(draft, () =>
          actions.performAutomatedUpgradeClick(depsFor(draft), floor, true),
        ),
      );
      assert.equal(
        floor.upgradeCount,
        1 + crit.CRIT_TIER_CONFIG[tier].multiplier,
      );
      assert.deepEqual(draft.money, balance, "base-tier upgrades remain free");
      for (const existingTier of [null, "ultra"]) {
        const unlockDraft = {
          buildings: [makeBuilding()],
          money: fromNumber(10000),
        };
        const target = unlockDraft.buildings[0][2];
        target.critMultiplierTier = existingTier;
        buttons.forceTestCrit(target, "heavenly", tier, "ultra", "unlock");
        runDetachedStep(() =>
          economy.withDraftEconomy(unlockDraft, () =>
            actions.performAutomatedFloorUnlock(
              depsFor(unlockDraft),
              target,
              true,
            ),
          ),
        );
        assert.equal(
          target.critMultiplierTier,
          existingTier ?? tier,
          "bulk floor tier is permanent and never downgraded",
        );
        assert.equal(
          target.upgradeCount,
          crit.CRIT_TIER_CONFIG[tier].multiplier,
        );
        assert.equal(
          unlockDraft.buildings[0].filter((candidate) => candidate.unlocked)
            .length,
          3,
          "no Heavenly reward",
        );
        assert.deepEqual(
          unlockDraft.money,
          fromNumber(10000),
          "no bonus-tier wallet multiplier",
        );
      }
      assert.deepEqual(
        crit.CRIT_PROC_KINDS.map(crit.getCritProcCount),
        countsBefore,
        "automation never awards badges",
      );
    }
    Math.random = () => 0;
    let manualRoll;
    const manualBadgeCount = crit.CRIT_PROC_KINDS.reduce(
      (sum, kind) => sum + crit.getCritProcCount(kind),
      0,
    );
    crit.rollCrit((result) => {
      manualRoll = result;
    });
    assert(
      crit.CRIT_PROC_KINDS.some((kind) => manualRoll[kind]),
      "manual rolls still land special procs",
    );
    assert(
      crit.CRIT_PROC_KINDS.reduce(
        (sum, kind) => sum + crit.getCritProcCount(kind),
        0,
      ) > manualBadgeCount,
      "manual rolls still grant collectible badges",
    );
    Math.random = () => 0.999999;
    for (const action of ["unlock", "complete"]) {
      const floors = makeBuilding();
      const liveSnapshot = structuredClone(floors);
      const rules = {
        managerLevel: 10,
        maxWorkers: 3,
        increaseIncomeRate: (floor) => {
          floor.upgradeCount++;
          floor.upgradeCost = multiply(floor.upgradeCost, 1.3);
        },
        workerCost: () => fromNumber(2),
        chairsCost: () => fromNumber(3),
        suppliesCost: () => fromNumber(4),
        managerCost: () => fromNumber(5),
      };
      const plan =
        action === "unlock"
          ? createFixedRenovationPlan(
              floors,
              locks.getBuildingUnlockAllCost(floors, 1),
              locks.MAX_FLOORS_PER_BUILDING - 2,
            )
          : planBuildingCompletion(floors, rules);
      assert.deepEqual(
        floors,
        liveSnapshot,
        `${action}: quote never mutates live state`,
      );
      buttons.forceTestCrit(
        floors[0],
        "booty",
        "crit",
        null,
        action === "unlock" ? "unlock" : "upgrade",
      );
      economy.commitDraftIncome(fromNumber(1e10));
      let charges = 0;
      let commits = 0;
      const upgrade = (draft, floor) =>
        economy.withDraftEconomy(draft, () =>
          actions.performAutomatedUpgradeAfterPayment(
            depsFor(draft),
            floor,
            floor === draft.buildings[0][0],
            true,
          ),
        );
      const result = await renovateFloors({
        plan,
        buildings: [floors],
        buildingIndex: 0,
        spend(cost) {
          charges++;
          return economy.spendTotalIncome(cost);
        },
        refund() {
          assert.fail(`${action}: unexpected refund`);
        },
        getMoney: economy.getTotalIncome,
        isCurrent: () => true,
        upgrade,
        createStep(draft) {
          const step =
            action === "unlock"
              ? createFloorUnlockStep(draft.buildings[0], (floor) =>
                  economy.withDraftEconomy(draft, () =>
                    actions.performAutomatedFloorUnlock(
                      depsFor(draft),
                      floor,
                      true,
                    ),
                  ),
                )
              : createBuildingCompletionStep(
                  plan,
                  draft.buildings[0],
                  (floor) => upgrade(draft, floor),
                  rules,
                );
          return () => {
            assert.deepEqual(
              floors,
              liveSnapshot,
              `${action}: state frozen until commit`,
            );
            return step();
          };
        },
        commit(draft, rewardBase) {
          commits++;
          assert.deepEqual(
            economy.getTotalIncome(),
            rewardBase,
            `${action}: no per-step live charges`,
          );
          assert.deepEqual(
            draft.money,
            rewardBase,
            `${action}: no Booty reward from automation`,
          );
          assert.deepEqual(draft.badges, {}, `${action}: no automated badges`);
        },
      });
      assert.equal(charges, 1, `${action}: charges once upfront`);
      assert.equal(commits, 1, `${action}: commits once`);
      if (action === "unlock") {
        assert.equal(result.buildings[0].length, locks.MAX_FLOORS_PER_BUILDING);
        assert(result.buildings[0].every((floor) => floor.unlocked));
        assert.equal(
          result.buildings[0][2].upgradeCount,
          crit.CRIT_TIER_CONFIG.crit.multiplier,
        );
        assert.deepEqual(
          result.money,
          economy.getTotalIncome(),
          "unlocks don't double-charge draft wallet",
        );
        assert.equal(
          result.buildings[0][2].critMultiplierTier,
          "crit",
          "bulk unlock retains tier promotion",
        );
      } else {
        for (const floor of result.buildings[0].slice(0, 2)) {
          assert(floor.upgradeCount >= rules.managerLevel);
          assert.equal(floor.workerCount, rules.maxWorkers);
          assert(
            floor.hasOfficeChairs &&
              floor.hasOfficeSupplies &&
              floor.hasManager,
          );
        }
        assert.equal(result.buildings[0][2].unlocked, false);
      }
    }
    console.log(
      "PASS: prepaid map unlock/completion jobs retain regular tiers without special rewards or badges",
    );
    const manyFloors = Array.from({ length: 10000 }, () =>
      buildFloor(1, { backgroundCount: 1 }),
    );
    let heartbeats = 0;
    let commits = 0;
    let purchases = 0;
    let purchaseNotifications = 0;
    let result;
    const heartbeat = setInterval(() => {
      heartbeats++;
    }, 0);
    try {
      const plan = planRenovation(manyFloors, fromNumber(150));
      assert.equal(plan.count, 150);
      assert(Math.abs(toNumber(plan.cost) - 150) < 1e-9);
      economy.commitDraftIncome(fromNumber(1000));
      const companyBuildings = [manyFloors];
      const job = renovateFloors({
        plan,
        buildings: companyBuildings,
        buildingIndex: 0,
        spend: economy.spendTotalIncome,
        onPurchased: () => {
          purchaseNotifications++;
          assert.equal(
            purchases,
            0,
            "feedback precedes all upgrade processing",
          );
          assert.equal(commits, 0, "feedback does not await commit");
          assert(
            Math.abs(toNumber(economy.getTotalIncome()) - 850) < 1e-9,
            "feedback follows successful payment",
          );
        },
        refund: economy.addTotalIncome,
        getMoney: economy.getTotalIncome,
        isCurrent: () => true,
        upgrade: (draft, floor) => {
          assert.equal(
            manyFloors[0].upgradeCount,
            0,
            "10k live floors stay frozen",
          );
          floor.upgradeCount++;
          floor.upgradeCost = multiply(floor.upgradeCost, 1.3);
          draft.money = fromNumber(1e20);
          purchases++;
        },
        commit: (draft) => {
          commits++;
          result = draft;
          companyBuildings[0] = draft.buildings[0];
        },
      });
      assert(
        Math.abs(toNumber(economy.getTotalIncome()) - 850) < 1e-9,
        "quoted cost charged immediately",
      );
      assert.equal(
        purchaseNotifications,
        1,
        "feedback is synchronous with acceptance",
      );
      assert.equal(
        economy.spendTotalIncome(fromNumber(100)),
        true,
        "map purchases remain available during renovation",
      );
      const boughtBuilding = makeBuilding();
      companyBuildings.push(boughtBuilding);
      await job;
      assert.equal(
        purchaseNotifications,
        1,
        "completion does not replay purchase feedback",
      );
      assert(
        Math.abs(toNumber(economy.getTotalIncome()) - 750) < 1e-9,
        "commit cannot overwrite a concurrent purchase",
      );
      assert.equal(
        companyBuildings[1],
        boughtBuilding,
        "new buildings survive renovation commit",
      );
      assert.equal(
        purchases,
        150,
        "crit payouts never expand the prepaid plan",
      );
      assert(
        heartbeats > 3,
        `10k job must yield during clone and upgrades, got ${heartbeats}`,
      );
      assert.equal(commits, 1);
      assert.equal(
        result.buildings[0].reduce((sum, floor) => sum + floor.upgradeCount, 0),
        150,
      );
      console.log(
        `PASS: 10,000-floor renovation yielded ${heartbeats} times and committed once; building-specific loading/reward navigation`,
      );
      const retryPlan = planRenovation(manyFloors, fromNumber(1));
      const beforeFailure = economy.getTotalIncome();
      assert.equal(
        await renovateFloors({
          plan: retryPlan,
          buildings: [manyFloors],
          buildingIndex: 0,
          spend: () => false,
          onPurchased: () =>
            assert.fail("rejected purchase must not celebrate"),
          refund: () => assert.fail("rejected purchase must not refund"),
          getMoney: economy.getTotalIncome,
          isCurrent: () => true,
          upgrade: () => assert.fail("rejected purchase must not process"),
          commit: () => assert.fail("rejected purchase must not commit"),
        }),
        null,
      );
      await assert.rejects(
        renovateFloors({
          plan: retryPlan,
          buildings: [manyFloors],
          buildingIndex: 0,
          spend: economy.spendTotalIncome,
          refund: economy.addTotalIncome,
          getMoney: economy.getTotalIncome,
          isCurrent: () => true,
          upgrade() {
            throw new Error("failed prepaid job");
          },
          commit() {
            assert.fail("failed job committed");
          },
        }),
        /failed prepaid job/,
      );
      assert.deepEqual(
        economy.getTotalIncome(),
        beforeFailure,
        "failed job refunds the quote",
      );
    } finally {
      clearInterval(heartbeat);
    }
    for (const event of ["upgrade", "unlock"]) {
      for (const kind of crit.CRIT_PROC_KINDS) {
        const baseline = makeBuilding();
        const manual = {
          buildings: [baseline.map(cloneWithSnapshotState)],
          money: fromNumber(10000),
        };
        const automated = {
          buildings: [baseline.map(cloneWithSnapshotState)],
          money: fromNumber(10000),
        };
        const reference = {
          buildings: [baseline.map(cloneWithSnapshotState)],
          money: fromNumber(10000),
        };
        const referenceFloor =
          reference.buildings[0][event === "upgrade" ? 1 : 2];
        if (event === "unlock") referenceFloor.critMultiplierTier = "crit";
        buttons.forceTestCrit(referenceFloor, null, "crit", null, event);
        runDetachedStep(() =>
          economy.withDraftEconomy(reference, () => {
            const point =
              event === "upgrade"
                ? buttons.getButtonCenter(false)
                : locks.getLockCenter();
            actions.handleFloorClick(
              depsFor(reference),
              referenceFloor,
              point.x,
              point.y,
              false,
            );
          }),
        );
        let automatedBadges;
        for (const [draft, isManual] of [
          [manual, true],
          [automated, false],
        ]) {
          const floor = draft.buildings[0][event === "upgrade" ? 1 : 2];
          buttons.forceTestCrit(floor, kind, "crit", "mega", event);
          runDetachedStep(() =>
            economy.withDraftEconomy(draft, () => {
              if (isManual) {
                const point =
                  event === "upgrade"
                    ? buttons.getButtonCenter(false)
                    : locks.getLockCenter();
                actions.handleFloorClick(
                  depsFor(draft),
                  floor,
                  point.x,
                  point.y,
                  false,
                );
              } else {
                const countsBefore = crit.CRIT_PROC_KINDS.map(
                  crit.getCritProcCount,
                );
                automatedBadges = {};
                crit.withDraftCritCounts(automatedBadges, () => {
                  const bought =
                    event === "upgrade"
                      ? actions.performAutomatedUpgradeClick(
                          depsFor(draft),
                          floor,
                          false,
                        )
                      : actions.performAutomatedFloorUnlock(
                          depsFor(draft),
                          floor,
                        );
                  assert.equal(bought, true, `${kind}: ${event} completed`);
                });
                assert.deepEqual(
                  crit.CRIT_PROC_KINDS.map(crit.getCritProcCount),
                  countsBefore,
                );
              }
            }),
          );
        }
        assert.deepEqual(
          automated,
          reference,
          `${kind}: ${event} only grants base tier`,
        );
        assert.deepEqual(automatedBadges, {}, `${kind}: no automated badge`);
        if (kind === "booty")
          assert(
            toNumber(manual.money) > toNumber(automated.money),
            "manual special rewards still apply",
          );
      }
    }

    const live = makeBuilding();
    workers.activateBoosted(live[0], 0, now, 30000);
    crit.triggerFrozenCrit(live[0]);
    buttons.triggerSaleBoost(live[0]);
    buttons.armGuaranteedUltraCrit(live[0]);
    buttons.forceTestCrit(live[1], "heavenly", "crit", null, "upgrade");
    const untouched = structuredClone(live);
    const originalMoney = economy.getTotalIncome();
    let committed;
    let steps = 0;
    await runBuildingJob({
      buildings: [live],
      getMoney: () => fromNumber(1000),
      isCurrent: () => true,
      step(draft) {
        assert.deepEqual(live, untouched, "live floors untouched until commit");
        assert.deepEqual(
          economy.getTotalIncome(),
          originalMoney,
          "live wallet untouched between steps",
        );
        if (steps++ > 0) return false;
        const copy = draft.buildings[0][0];
        assert.equal(workers.getBoostRemainingMs(copy, 0, now), 30000);
        assert.equal(crit.isFrozenActive(copy, now), true);
        assert.equal(buttons.isSaleActive(copy, now), true);
        buttons.rollCritUpgrade(copy);
        assert.equal(
          buttons.getCritTier(copy),
          "ultra",
          "guaranteed crit survives cloning",
        );
        return economy.withDraftEconomy(draft, () =>
          actions.performAutomatedUpgradeClick(
            depsFor(draft),
            draft.buildings[0][1],
            false,
          ),
        );
      },
      commit(draft) {
        committed = draft;
      },
    });
    assert.equal(
      committed.buildings[0].filter((floor) => floor.unlocked).length,
      2,
    );
    assert(
      committed.buildings[0].every(
        (floor) => floor.critMultiplierTier === null,
      ),
    );
    assert.equal(
      committed.buildings[0][1].upgradeCount,
      crit.CRIT_TIER_CONFIG.crit.multiplier,
    );
    assert.deepEqual(
      committed.badges,
      {},
      "pre-armed Heavenly never grants automated badges",
    );
    assert.deepEqual(live, untouched);
    assert.deepEqual(economy.getTotalIncome(), originalMoney);
    assert.equal(
      buttons.getCritTier(live[1]),
      "crit",
      "original armed state not consumed",
    );
    assert.equal(
      coins.hasActiveCoins(),
      false,
      "no floor particle bursts queued",
    );
    assert.equal(
      flashes.isCritFlashActive(now),
      false,
      "no screen celebration queued",
    );
    console.log(
      `PASS: ${crit.CRIT_PROC_KINDS.length} specials excluded from automated upgrades/unlocks; manual specials and snapshot state preserved`,
    );
  } finally {
    Math.random = originalRandom;
    Date.now = originalNow;
  }
} finally {
  await server.close();
}
