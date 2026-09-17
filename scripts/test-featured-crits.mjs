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
  const { IMAGE_FILES } = await server.ssrLoadModule("/src/loadAssets/index.ts");
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
  assert.equal(kinds.length, 44);
  assert.equal(new Set(allKinds).size, allKinds.length);
  assert.equal(
    new Set(allKinds.map((kind) => crit.CRIT_PROC_INFO[kind].label)).size,
    allKinds.length,
  );
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
    const source = await readFile(`src/assets/${IMAGE_FILES[info.icon]}`);
    assert.deepEqual(
      source,
      await readFile(
        `src/assets/themes/references/dist/${IMAGE_FILES[info.icon]}`,
      ),
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
  for (const family of [
    ["goldNugget", "amethyst", "emerald", "ruby", "saphire", "diamond"],
    ["fastForward", "dinnerTime", "silverRush", "yesChef", "goldRush"],
    [
      "casualFriday",
      "flamenco",
      "roman",
      "fancyFriday",
      "forTheKing",
      "forTheEmperor",
    ],
    [
      "hammerTime",
      "keynote",
      "ninja",
      "space",
      "samurai",
      "centurion",
      "luckyClover",
    ],
    ["blessed", "obelisk", "wizard"],
  ]) {
    for (let index = 1; index < family.length; index++) {
      assert(
        crit.getCritProcChance(family[index - 1]) >
          crit.getCritProcChance(family[index]),
        family.join(" > "),
      );
    }
  }

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
    amethyst: [[20, 30, 10, 0], 18],
    blessed: [[20, 33, 10, 0], 0],
    centurion: [[20, 130, 10, 0], 0],
    checkUp: [[20, 30, 14, 0], 4],
    diamond: [[20, 30, 10, 0], 72],
    emerald: [[20, 30, 10, 0], 27],
    fireman: [[23, 33, 13, 0], 6],
    forTheEmperor: [[45, 55, 35, 0], 0],
    forTheKing: [[35, 45, 25, 0], 0],
    goldNugget: [[20, 30, 10, 0], 12],
    goldRush: [[20, 30, 10, 0], 60],
    hammerTime: [[20, 39, 10, 0], 0],
    robinHood: [[20, 30, 13, 0], 21],
    roman: [[29, 39, 19, 0], 0],
    ruby: [[20, 30, 10, 0], 36],
    samurai: [[20, 60, 10, 0], 0],
    saphire: [[20, 30, 10, 0], 54],
    silverRush: [[20, 30, 10, 0], 36],
    spy: [[37, 30, 10, 0], 0],
    theLawWon: [[26, 30, 10, 0], 2],
    victorian: [[20, 30, 10, 0], 27],
    wizard: [[20, 35, 10, 0], 0],
    executiveSpin: [[20, 30, 14, 0], 0],
    rubberStampede: [[20, 30, 10, 0], 42],
    replyAll: [[20, 30, 10, 0], 15],
    stapleOfSuccess: [[20, 37, 10, 0], 0],
    faxOfFortune: [[20, 30, 10, 0], 24],
    casualMonday: [[20, 50, 10, 0], 0],
    deskJockey: [[20, 30, 16, 0], 0],
    inboxZeroGravity: [[20, 30, 10, 0], 72],
    beanCounter: [[20, 36, 10, 0], 0],
    kingOfTheWorld: [[20, 30, 40, 0], 0],
  };
  function fixture() {
    const floors = [20, 30, 10, 0].map((upgradeCount, index) => ({
      upgradeCount,
      unlocked: index < 3,
      critMultiplierTier: null,
      rate: [1, 9, 4, 100][index],
      payout: [1, 3, 2, 100][index],
      upgradeCost: fromNumber([10, 100, 50, 0][index]),
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
    if (kind === "blessed")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "wizard")
      assert.equal(test.context.floor.critMultiplierTier, "mega");
    if (kind === "beanCounter")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
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
  for (const kind of ["blessed", "wizard"]) {
    for (const tier of [null, "crit", "mega", "ultra"]) {
      const test = fixture();
      test.context.floor.critMultiplierTier = tier;
      test.rewards[kind](test.context);
      const expectedTier =
        kind === "wizard"
          ? tier === null
            ? "mega"
            : "ultra"
          : tier === null
            ? "crit"
            : tier === "crit"
              ? "mega"
              : "ultra";
      assert.equal(test.context.floor.critMultiplierTier, expectedTier);
      assert.equal(
        test.context.floor.upgradeCount,
        30 + CONFIG.crit[`${kind}Upgrades`],
      );
    }
  }
  for (const kind of ["checkUp", "robinHood", "spy", "theLawWon"]) {
    const test = fixture();
    for (const floor of test.floors) {
      floor.upgradeCount = 30;
      floor.rate = 1;
      floor.upgradeCost = fromNumber(10);
    }
    test.rewards[kind](test.context);
    assert.equal(
      test.context.floor.upgradeCount,
      30 + CONFIG.crit[`${kind}Upgrades`],
      `${kind}: tie favors triggering floor`,
    );
    assert.equal(
      test.floors[3].upgradeCount,
      30,
      `${kind}: locked floor touched`,
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
    "PASS: 44 rewards, single-floor fallbacks, targeting ties, milestones, tier caps, registry state, roll gates/cap, odds, and icons",
  );
} finally {
  Math.random = originalRandom;
  await server.close();
}
