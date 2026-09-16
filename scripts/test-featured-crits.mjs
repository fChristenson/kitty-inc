import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const originalRandom = Math.random;
try {
  const crit = await server.ssrLoadModule("/src/shared/critTypes/index.ts");
  const { CONFIG } = await server.ssrLoadModule("/src/config.ts");
  const { createFeaturedCritRewards } = await server.ssrLoadModule(
    "/src/floors/floorInteractions/featuredCritRewards.ts",
  );
  const { fromNumber } = await server.ssrLoadModule(
    "/src/shared/bigNumber/index.ts",
  );
  const { FEATURED_CRIT_KINDS: kinds, CRIT_PROC_KINDS: allKinds } = crit;
  const { createTestButtonMarkup, MAP_CRIT_TEST_KINDS } =
    await server.ssrLoadModule("/src/hud/testButton/critTestActions.ts");
  assert.deepEqual(
    new Set(MAP_CRIT_TEST_KINDS),
    new Set([
      "chain",
      "upgrade",
      "heavenly",
      "skip",
      "grandOpening",
      "luckyClover",
      "mystic",
      "pair",
      "threeOfAKind",
      "fourOfAKind",
      "fullHouse",
      "royalFlush",
    ]),
  );
  assert(MAP_CRIT_TEST_KINDS.every((kind) => allKinds.includes(kind)));
  const markup = createTestButtonMarkup();
  for (const event of ["upgrade", "unlock", "map"]) {
    assert(
      markup.includes(`<option value="${event}">`),
      `Missing ${event} test event`,
    );
  }
  const buttonKinds = [...markup.matchAll(/data-crit-kind="([^"]*)"/g)].map(
    (match) => match[1],
  );
  assert.equal(buttonKinds.length, allKinds.length + 1);
  assert.equal(new Set(buttonKinds).size, buttonKinds.length);
  assert.deepEqual(new Set(buttonKinds), new Set(["", ...allKinds]));
  for (const control of [
    "test-crit-event",
    "test-crit-tier",
    "test-crit-bonus",
  ]) {
    assert(markup.includes(`id="${control}"`));
  }
  assert.equal(kinds.length, 12);
  assert.equal(new Set(allKinds).size, allKinds.length);
  const oldLabels = new Set(
    allKinds
      .filter((kind) => !kinds.includes(kind))
      .map((kind) => crit.CRIT_PROC_INFO[kind].label),
  );
  for (const kind of kinds) {
    const info = crit.CRIT_PROC_INFO[kind];
    assert(!oldLabels.has(info.label), `${kind}: duplicate label`);
    assert(crit.getCritProcChance(kind) > CONFIG.crit.heavenlyChance);
    assert(crit.getCritProcChance(kind) <= 0.1);
    const floor = {};
    crit.forceCritProc(kind, floor);
    assert.equal(crit.readCritProcs(floor)[kind], true);
    assert.deepEqual(
      allKinds.filter((other) => crit.readCritProcs(floor)[other]),
      [kind],
    );
    crit.consumeCritProcs(floor);
    assert.equal(crit.readCritProcs(floor)[kind], false);
    const source = await readFile(`src/assets/${info.icon}.png`);
    assert.deepEqual(
      source,
      await readFile(`src/assets/themes/references/dist/${info.icon}.png`),
    );
    const metadata = await sharp(source).metadata();
    assert(
      metadata.width <= 250 &&
        metadata.height <= 250 &&
        metadata.isPalette &&
        metadata.hasAlpha,
    );
  }
  assert(CONFIG.crit.fastForwardChance > CONFIG.crit.dinnerTimeChance);
  assert(CONFIG.crit.dinnerTimeChance > CONFIG.crit.yesChefChance);
  assert(CONFIG.crit.casualFridayChance > CONFIG.crit.flamencoChance);
  assert(CONFIG.crit.flamencoChance > CONFIG.crit.fancyFridayChance);
  assert(CONFIG.crit.keynoteChance > CONFIG.crit.ninjaChance);
  assert(CONFIG.crit.ninjaChance > CONFIG.crit.spaceChance);

  const expected = {
    ballerina: [[20, 33, 10, 0], 9],
    cowboy: [[20, 30, 18, 0], 0],
    dinnerTime: [[20, 30, 10, 0], 30],
    fingerGuns: [[20, 32, 12, 0], 0],
    flamenco: [[27, 37, 17, 0], 0],
    milestone: [[20, 50, 10, 0], 0],
    moonwalker: [[26, 36, 10, 0], 0],
    ninja: [[20, 42, 10, 0], 0],
    obelisk: [[20, 32, 10, 0], 0],
    sharpShooter: [[20, 30, 10, 0], 30],
    space: [[20, 30, 30, 0], 0],
    yesChef: [[20, 30, 10, 0], 48],
  };
  function fixture() {
    const floors = [20, 30, 10, 0].map((upgradeCount, index) => ({
      upgradeCount,
      unlocked: index < 3,
      critMultiplierTier: null,
      rate: [1, 9, 4, 100][index],
      payout: [1, 3, 2, 100][index],
      lastCollectedAt: 123,
    }));
    let income = 0;
    const rewards = createFeaturedCritRewards({
      upgrade: (targets, count) => {
        for (const floor of targets)
          if (floor.unlocked) floor.upgradeCount += count;
      },
      payCycles: (targets, count) => {
        for (const floor of targets)
          if (floor.unlocked) income += floor.payout * count;
      },
      incomeRate: (floor) => fromNumber(floor.rate),
    });
    return {
      floors,
      rewards,
      income: () => income,
      context: {
        floors,
        floor: floors[1],
        deps: { getCompanyValue: () => fromNumber(1000) },
      },
    };
  }
  for (const kind of kinds) {
    const test = fixture();
    crit.applyCritProcs(crit.onlyCritProc(kind), test.context, test.rewards);
    assert.deepEqual(
      test.floors.map((floor) => floor.upgradeCount),
      expected[kind][0],
      kind,
    );
    assert.equal(test.income(), expected[kind][1], kind);
    assert(
      test.floors.every((floor) => floor.lastCollectedAt === 123),
      `${kind}: changed timers`,
    );
    if (kind === "obelisk")
      assert.equal(test.context.floor.critMultiplierTier, "mega");
  }
  for (const level of [0, 24, 25, 49, 50]) {
    const test = fixture();
    test.context.floor.upgradeCount = level;
    test.rewards.milestone(test.context);
    assert.equal(
      test.context.floor.upgradeCount,
      (Math.floor(level / 25) + 1) * 25,
    );
  }
  for (const tier of ["crit", "mega", "ultra"]) {
    const test = fixture();
    test.context.floor.critMultiplierTier = tier;
    test.rewards.obelisk(test.context);
    assert.equal(test.context.floor.critMultiplierTier, "ultra");
    assert.equal(test.context.floor.upgradeCount, 32);
  }
  for (const kind of kinds) {
    const test = fixture();
    test.floors.splice(1);
    test.context.floor = test.floors[0];
    test.rewards[kind](test.context);
    assert(
      test.income() > 0 || test.context.floor.upgradeCount > 20,
      `${kind}: no single-floor reward`,
    );
  }
  const oldProcCount = allKinds.length - kinds.length;
  const useRollSequence = (procRolls) => {
    const sequence = [0, 0, ...Array(oldProcCount).fill(1), ...procRolls];
    let position = 0;
    Math.random = () => sequence[position++] ?? 0.99;
  };
  for (const kind of kinds) {
    useRollSequence(kinds.map((other) => (other === kind ? 0 : 1)));
    let result;
    crit.rollCrit((rolled) => {
      result = rolled;
    });
    assert.equal(result?.[kind], true, `${kind}: missing from real roll`);
  }
  useRollSequence(kinds.map(() => 0));
  let capped;
  crit.rollCrit((rolled) => {
    capped = rolled;
  });
  assert.equal(
    allKinds.filter((kind) => capped[kind]).length,
    crit.MAX_SPECIAL_CRIT_PROCS,
  );
  Math.random = () => 0;
  let regular;
  crit.rollCrit((rolled) => {
    regular = rolled;
  }, false);
  assert(kinds.every((kind) => !regular[kind]));
  Math.random = () => 1;
  let called = false;
  crit.rollCrit(() => {
    called = true;
  });
  assert.equal(called, false, "Procs must never land without a tier");
  let calls = 0;
  Math.random = () => (calls++ === 0 ? 0 : 1);
  let gatewayMiss;
  crit.rollCrit((rolled) => {
    gatewayMiss = rolled;
  });
  assert(
    kinds.every((kind) => !gatewayMiss[kind]),
    "Gateway miss must suppress procs",
  );
  console.log(
    "PASS: 12 rewards, single-floor fallbacks, milestones, tier caps, registry state, roll gates/cap, odds, and icons",
  );
} finally {
  Math.random = originalRandom;
  await server.close();
}
