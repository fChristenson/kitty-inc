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
  const { IMAGE_FILES } = await server.ssrLoadModule(
    "/src/loadAssets/index.ts",
  );
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
  assert.equal(kinds.length, 590);
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
    const source = await readFile(`public/${IMAGE_FILES[info.icon]}`);
    // the game loads the white-bordered sticker cut, so check that copy too
    const shipped = await readFile(`public/stickers/${IMAGE_FILES[info.icon]}`);
    for (const buffer of [source, shipped]) {
      const metadata = await sharp(buffer).metadata();
      assert(
        metadata.width <= 250 &&
          metadata.height <= 250 &&
          metadata.isPalette &&
          metadata.hasAlpha,
        `${kind}: unoptimized icon`,
      );
    }
  }
  assert(CONFIG.crit.fastForwardChance > CONFIG.crit.dinnerTimeChance);
  assert(CONFIG.crit.dinnerTimeChance > CONFIG.crit.yesChefChance);
  assert(CONFIG.crit.casualFridayChance > CONFIG.crit.flamencoChance);
  assert(CONFIG.crit.flamencoChance > CONFIG.crit.fancyFridayChance);
  assert(CONFIG.crit.keynoteChance > CONFIG.crit.ninjaChance);
  assert(CONFIG.crit.ninjaChance > CONFIG.crit.spaceChance);
  for (const family of [
    [
      "goldNugget",
      "amethyst",
      "bubbleEconomy",
      "chaChaChing",
      "emerald",
      "iHatePortals",
      "ruby",
      "jurassicPerk",
      "chonk",
      "saphire",
      "nothingToSee",
      "rumbaReturns",
      "megaChonk",
      "diamond",
      "abraCashDabra",
      "tubs",
      "despicableFees",
    ],
    [
      "fastForward",
      "dinnerTime",
      "silverRush",
      "yesChef",
      "cloudNineToFive",
      "goldRush",
      "yesWarchief",
      "wouldYouKindly",
      "nowIAmSuspicious",
      "theExpenseMatrix",
      "holyGuacamole",
    ],
    [
      "casualFriday",
      "flamenco",
      "roman",
      "workWork",
      "loafActually",
      "fancyFriday",
      "gladiator",
      "forTheKing",
      "waltzStreet",
      "yesYourHighness",
      "captainOfIndustry",
      "forTheEmperor",
      "iAmTheNight",
      "queenOfQueens",
    ],
    [
      "breakEven",
      "hammerTime",
      "keynote",
      "backToTheFiscal",
      "ninja",
      "cyberPunk",
      "bulletDodger",
      "rockTheStock",
      "space",
      "samurai",
      "theLordOfTheRingBinders",
      "epic",
      "bigDaddy",
      "centurion",
      "luckyClover",
    ],
    [
      "blessed",
      "eggcellentWork",
      "arcana",
      "obelisk",
      "iDidntAskForThis",
      "theGreatCatsby",
      "wizard",
      "prehistoric",
      "youAreNotPrepared",
      "wishfulBanking",
      "theBigCheese",
      "whySoSerious",
    ],
    ["moonwalker", "mimeYourBusiness", "spaceAndTime", "pocketDimension"],
    ["killerCroc2", "bestestBoy", "bane", "bulwark"],
    ["poisonIvy3", "doggo", "killerCroc", "overlord"],
    ["poisonIvy", "otterlyAdorable"],
    ["cupcake", "metalHeart", "bulwark"],
    ["donut", "clockworkWizard2", "metalHeart2", "clockworkWizard"],
    ["frostRune", "fullPlate"],
    ["beerBelly", "donut", "highRoller3", "otterlyAdorable"],
    ["bottomsUp", "cupcake", "metalHeart", "highRoller2", "bulwark"],
    ["doggo", "pokerNight", "killerCroc", "overlord"],
    ["apple", "ponyKeg"],
    ["vodkaWhiskers", "clockworkWizard2"],
    [
      "emptyGlass",
      "amberSpritz",
      "copperMugMule2",
      "beerBelly",
      "negroniNightfall2",
      "donut",
      "highRoller3",
    ],
    [
      "blackberryBramble",
      "bottomsUp",
      "cupcake",
      "derbyDayJulep",
      "hurricaneHour",
      "cosmoCashout",
      "metalHeart",
    ],
    ["singaporeSling", "wineCountry", "hurricaneHour2"],
    ["blackberryBramble2", "potion", "frenchSeventyFive"],
    ["apple", "derbyDayJulep2", "ponyKeg", "allowance"],
    ["sidecarSurge", "vodkaWhiskers", "clockworkWizard2", "lootBags"],
    ["queenOfQueens", "copperMugMule", "allowance2"],
    ["frostRune", "pineappleParadise", "fullPlate"],
    ["negroniNightfall", "splitThePot"],
    ["oldFashionedFortune", "metalHeart2", "liquidAssets2"],
    [
      "tikiZombie",
      "longIslandLandslide",
      "pocketMoney2",
      "doggo",
      "pokerNight",
      "killerCroc",
      "overlord",
    ],
    ["clockworkWizard", "pocketMoney"],
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
    officeClown: [[20, 30, 15, 0], 0],
    fridayTieDay: [[20, 30, 10, 0], 30],
    soReady: [[20, 45, 10, 0], 0],
    doughDivision: [[20, 36, 10, 0], 0],
    profitPopcorn: [[20, 30, 10, 0], 24],
    donutDisturb: [[20, 35, 10, 0], 15],
    cakeDay: [[20, 30, 22, 0], 0],
    champagneProblems: [[20, 30, 10, 0], 45],
    bonusBurrito: [[20, 38, 10, 0], 9],
    sundaeBest: [[20, 30, 10, 0], 30],
    popTheQuestion: [[20, 34, 10, 0], 0],
    partyCrasher: [[20, 33, 13, 0], 0],
    epic: [[20, 70, 10, 0], 0],
    ready: [[20, 34, 10, 0], 12],
    workWork: [[31, 41, 21, 0], 0],
    yesWarchief: [[20, 30, 10, 0], 84],
    youAreNotPrepared: [[20, 39, 10, 0], 0],
    arcana: [[20, 42, 10, 0], 0],
    bigDaddy: [[20, 75, 10, 0], 0],
    chonk: [[20, 30, 10, 0], 48],
    cyberPunk: [[20, 43, 10, 0], 0],
    dodgeThis: [[20, 30, 10, 0], 18],
    whiteRabbit: [[20, 35, 15, 0], 0],
    gladiator: [[33, 43, 23, 0], 0],
    iDidntAskForThis: [[20, 50, 10, 0], 0],
    iHatePortals: [[20, 30, 10, 0], 33],
    littleSister: [[20, 30, 17, 0], 0],
    magicIsATool: [[28, 30, 18, 0], 0],
    megaChonk: [[20, 30, 10, 0], 66],
    metal: [[20, 30, 27, 0], 0],
    princess: [[20, 30, 10, 0], 39],
    spaceAndTime: [[29, 39, 10, 0], 0],
    thinkWithYourHead: [[20, 30, 15, 0], 10],
    wouldYouKindly: [[20, 30, 10, 0], 96],
    yesYourHighness: [[39, 49, 29, 0], 0],
    bulletDodger: [[20, 44, 10, 0], 0],
    nothingToSee: [[20, 30, 10, 0], 60],
    nowIAmSuspicious: [[20, 30, 10, 0], 102],
    redOrBlue: [[20, 30, 16, 0], 18],
    abraCashDabra: [[20, 30, 10, 0], 75],
    captainOfIndustry: [[41, 51, 31, 0], 0],
    clowningAround: [[23, 33, 13, 0], 18],
    discoDividend: [[20, 30, 10, 0], 33],
    mimeYourBusiness: [[28, 38, 10, 0], 0],
    redCarpetTreatment: [[20, 30, 10, 0], 36],
    rockTheStock: [[20, 46, 10, 0], 0],
    strongReturn: [[20, 30, 36, 0], 0],
    theBigCheese: [[20, 60, 10, 0], 0],
    queenOfQueens: [[48, 58, 38, 0], 0],
    bubbleEconomy: [[20, 30, 10, 0], 21],
    cloudNineToFive: [[20, 30, 10, 0], 54],
    luckyLaundromat: [[25, 35, 15, 0], 30],
    moneyMagnet: [[20, 30, 10, 0], 42],
    overTheRainbow: [[20, 30, 10, 0], 45],
    pocketDimension: [[38, 48, 10, 0], 0],
    shootingStarEmployee: [[20, 30, 33, 0], 0],
    treasureMeasure: [[20, 30, 20, 0], 0],
    wishfulBanking: [[20, 42, 10, 0], 0],
    backToTheFiscal: [[20, 41, 10, 0], 0],
    despicableFees: [[20, 30, 10, 0], 90],
    howToTrainYourManager: [[20, 34, 10, 0], 18],
    jurassicPerk: [[20, 30, 10, 0], 39],
    raidersOfTheLostReceipt: [[20, 30, 19, 0], 0],
    theDevilWearsPawda: [[34, 30, 10, 0], 0],
    theExpenseMatrix: [[20, 30, 10, 0], 108],
    theFastAndTheFurriest: [[32, 30, 22, 0], 0],
    theFellowshipOfTheBling: [[26, 36, 16, 0], 36],
    theGreatCatsby: [[20, 60, 10, 0], 0],
    theLordOfTheRingBinders: [[20, 65, 10, 0], 0],
    breakEven: [[20, 38, 10, 0], 0],
    chaChaChing: [[20, 30, 10, 0], 24],
    charlestonCharge: [[20, 30, 21, 0], 0],
    congaCompounding: [[24, 34, 14, 0], 24],
    robotResources: [[20, 30, 29, 0], 0],
    rumbaReturns: [[20, 30, 10, 0], 63],
    salsaSalary: [[20, 30, 10, 0], 39],
    shuffleTheFunds: [[34, 44, 10, 0], 0],
    tangoTender: [[20, 37, 17, 0], 0],
    tapThatAsset: [[20, 30, 10, 0], 51],
    waltzStreet: [[37, 47, 27, 0], 0],
    prehistoric: [[20, 70, 10, 0], 0],
    breadyOrNot: [[31, 41, 10, 0], 0],
    eggcellentWork: [[20, 38, 10, 0], 0],
    holyGuacamole: [[20, 30, 10, 0], 114],
    loafActually: [[32, 42, 22, 0], 0],
    pastaLaVista: [[20, 30, 10, 0], 48],
    souperStar: [[20, 30, 10, 0], 48],
    tacoBoutIt: [[20, 34, 14, 0], 0],
    theGreatPancakeStack: [[41, 51, 10, 0], 0],
    wokAndRoll: [[20, 30, 34, 0], 0],
    iAmTheNight: [[47, 57, 37, 0], 0],
    tubs: [[20, 30, 10, 0], 78],
    whySoSerious: [[20, 50, 10, 0], 0],
    avocardio: [[20, 45, 10, 0], 0],
    butterBelieveIt: [[20, 30, 10, 0], 54],
    cheesePullChampion: [[20, 36, 10, 0], 18],
    grillSergeant: [[40, 50, 30, 0], 0],
    noodleNap: [[20, 30, 10, 0], 66],
    picklePredicament: [[20, 30, 18, 0], 0],
    golem: [[20, 30, 45, 0], 0],
    hotPotato: [[20, 30, 10, 0], 54],
    brunchBoss: [[20, 37, 10, 0], 21],
    curryFavour: [[20, 30, 10, 0], 42],
    dimSumDynasty: [[35, 45, 25, 0], 0],
    soupDumplingSurgeon: [[20, 35, 10, 0], 30],
    chocolateFountainOfYouth: [[20, 30, 10, 0], 60],
    gummyBearMarket: [[30, 40, 20, 0], 0],
    jawbreaker: [[20, 48, 10, 0], 0],
    licoriceLaces: [[20, 30, 19, 0], 0],
    lollipopGuild: [[20, 30, 10, 0], 36],
    marshmallowMountain: [[20, 30, 18, 0], 0],
    sugarHigh: [[25, 35, 15, 0], 30],
    bubblegumBalloon: [[20, 30, 10, 0], 45],
    candyCaneClimber: [[20, 30, 22, 0], 0],
    sherbetSherpa: [[20, 30, 10, 0], 48],
    toffeeTrap: [[20, 37, 10, 0], 0],
    cottonCandyCloud: [[20, 30, 10, 0], 33],
    fudgeIt: [[20, 44, 10, 0], 0],
    gobstopperGetaway: [[20, 30, 23, 0], 0],
    jellyBeanJamboree: [[20, 30, 10, 0], 30],
    rockCandyQuarry: [[20, 37, 10, 0], 0],
    sprinkleStorm: [[26, 36, 16, 0], 0],
    dungeonAccountant: [[20, 39, 10, 0], 0],
    lootGoblin: [[20, 30, 10, 0], 48],
    inventoryFull: [[20, 42, 10, 0], 0],
    sideQuestSalary: [[20, 30, 10, 0], 21],
    minMaxManager: [[20, 30, 20, 0], 0],
    criticalKnit: [[20, 30, 10, 0], 18],
    savePointSavings: [[20, 35, 10, 0], 0],
    achievementUnlocked: [[20, 38, 10, 0], 0],
    newGamePlus: [[20, 50, 10, 0], 0],
    speedrunPayroll: [[20, 30, 10, 0], 90],
    lagCompensation: [[20, 30, 10, 0], 27],
    patchNotesPayday: [[20, 30, 21, 0], 0],
    biggerOnTheInside: [[20, 30, 10, 0], 60],
    cacheMeOutside: [[20, 30, 18, 0], 0],
    itCompiles: [[20, 45, 10, 0], 0],
    magicalPayrollGirl: [[20, 40, 10, 0], 0],
    mechaMiddleManagement: [[32, 42, 22, 0], 0],
    mergeConflict: [[20, 37, 10, 0], 21],
    mintCondition: [[20, 30, 10, 0], 54],
    stackOverflowing: [[20, 30, 19, 0], 0],
    oneMoreRound: [[20, 38, 10, 0], 24],
    couchCoOpCapital: [[29, 39, 19, 0], 0],
    hardCarry: [[20, 30, 24, 0], 0],
    readyCheck: [[26, 36, 16, 0], 0],
    queueRoyalty: [[20, 30, 10, 0], 36],
    rankedAndBanked: [[20, 41, 10, 0], 0],
    victoryPose: [[20, 48, 10, 0], 0],
    emoteEconomy: [[20, 30, 10, 0], 48],
    checkpointChampion: [[20, 30, 20, 0], 0],
    fishingForFunds: [[20, 30, 10, 0], 39],
    purrfectOrigin: [[20, 37, 10, 0], 0],
    capeEscape: [[20, 30, 10, 0], 30],
    thunderPaws: [[28, 38, 18, 0], 0],
    clawAndOrder: [[20, 30, 10, 0], 18],
    felineFury: [[20, 46, 10, 0], 0],
    sidekickShuffle: [[27, 30, 17, 0], 0],
    cosmicCatapult: [[20, 30, 10, 0], 54],
    theMoonstoneKey: [[20, 36, 10, 0], 0],
    spellbookSupreme: [[20, 42, 10, 0], 0],
    prismPotion: [[20, 30, 10, 0], 42],
    galaxyGumball: [[20, 30, 10, 0], 33],
    treasureTruffle: [[20, 35, 10, 0], 15],
    wizardsWaffle: [[30, 40, 20, 0], 0],
    goldenFortuneCookie: [[20, 30, 19, 0], 0],
    crystalDragonEgg: [[20, 42, 10, 0], 0],
    diamondCompass: [[20, 30, 10, 0], 30],
    emeraldCrown: [[20, 38, 10, 0], 0],
    goldenFleece: [[20, 30, 10, 0], 42],
    imperialScepter: [[20, 30, 23, 0], 0],
    rubyHeartRelic: [[20, 30, 10, 0], 36],
    sapphireHourglass: [[20, 30, 10, 0], 27],
    vaultOfJewels: [[26, 36, 16, 0], 0],
    goldenIdol: [[20, 45, 10, 0], 0],
    emberwingDragon: [[20, 48, 10, 0], 0],
    moonlitKirin: [[20, 30, 10, 0], 30],
    pocketPhoenix: [[20, 37, 10, 0], 0],
    crystalGriffin: [[20, 30, 10, 0], 48],
    velvetManticore: [[20, 39, 10, 0], 0],
    frostfangYeti: [[31, 41, 21, 0], 0],
    lanternKitsune: [[20, 30, 10, 0], 18],
    coralSeaSerpent: [[20, 30, 10, 0], 36],
    clockworkMinotaur: [[20, 43, 10, 0], 0],
    starryCerberus: [[28, 30, 18, 0], 0],
    goldenSphinx: [[20, 30, 20, 0], 0],
    mossbackTreant: [[25, 35, 15, 0], 0],
    rainbowAlicorn: [[20, 30, 10, 0], 27],
    bogWitchFamiliar: [[20, 36, 10, 0], 0],
    pearlHippocampus: [[20, 30, 10, 0], 21],
    thunderbirdChick: [[20, 39, 10, 0], 0],
    obsidianBasilisk: [[20, 50, 10, 0], 0],
    cloudNymph: [[20, 30, 10, 0], 30],
    alchemyAtDusk: [[20, 36, 10, 0], 0],
    astropathAlleycat: [[20, 30, 10, 0], 48],
    bardOfTheBrokenLyre: [[20, 30, 10, 0], 21],
    battleStandardBobcat: [[20, 40, 10, 0], 0],
    cathedralStarship: [[20, 30, 10, 0], 72],
    cursedCrownHunt: [[20, 45, 10, 0], 0],
    dreadnoughtWhisker: [[20, 50, 10, 0], 0],
    elixirUnderMoonlight: [[20, 37, 10, 0], 0],
    frostbiteTracker: [[20, 30, 10, 0], 27],
    ironpawVanguard: [[31, 41, 21, 0], 0],
    lastStandLionheart: [[20, 44, 10, 0], 0],
    meowchineBerserker: [[20, 38, 10, 0], 0],
    meowtallicanGunner: [[20, 30, 10, 0], 30],
    midnightMonsterContract: [[20, 30, 16, 0], 0],
    moonlitWyvernHunt: [[20, 30, 10, 0], 39],
    orbitalPounce: [[25, 35, 15, 0], 0],
    plasmaPurrgeon: [[20, 39, 10, 0], 0],
    relicbladeRonin: [[20, 46, 10, 0], 0],
    seaMonsterSlayer: [[20, 30, 10, 0], 30],
    silverclawSentinel: [[20, 37, 10, 0], 0],
    starBastionCaptain: [[20, 42, 10, 0], 0],
    tavernTactician: [[20, 30, 10, 0], 48],
    theAntlerwoodStalker: [[20, 35, 10, 0], 0],
    theCataclysmicChaplain: [[20, 45, 10, 0], 0],
    theGriffinContract: [[20, 30, 10, 0], 18],
    theSiegeScratcher: [[20, 48, 10, 0], 0],
    theWarpwayWatcher: [[20, 30, 10, 0], 36],
    theWhiteWhisker: [[20, 30, 20, 0], 0],
    toxinclawInfiltrator: [[20, 30, 10, 0], 21],
    voidclawVeteran: [[20, 43, 10, 0], 0],
    voidshieldTemplar: [[28, 38, 18, 0], 0],
    wolfmarkWanderer: [[20, 30, 10, 0], 33],
    wolfpackFarewell: [[26, 36, 16, 0], 0],
    bloodlineOmen: [[20, 47, 10, 0], 0],
    candleclawCatacomb: [[20, 30, 10, 0], 42],
    emberPawPatrol: [[34, 44, 24, 0], 0],
    whiskerCoastSurvivor: [[20, 30, 10, 0], 51],
    astapurrion: [[20, 30, 10, 0], 57],
    astralclawSkyblade: [[20, 53, 10, 0], 0],
    drizztDoPurrden: [[29, 30, 19, 0], 0],
    elmiaowster: [[20, 36, 10, 0], 0],
    elvenSongblade: [[20, 30, 10, 0], 120],
    galepaw: [[20, 30, 10, 0], 66],
    halsinpaw: [[36, 46, 26, 0], 0],
    hearthpawShadowagent: [[20, 30, 10, 0], 60],
    imeown: [[20, 30, 23, 0], 0],
    jaheirball: [[20, 30, 10, 0], 42],
    karlachonk: [[20, 51, 10, 0], 0],
    laezclaw: [[20, 49, 10, 0], 0],
    minscAndMeow: [[38, 48, 28, 0], 0],
    sarevmeowk: [[20, 30, 25, 0], 0],
    shadowpurr: [[20, 41, 10, 0], 0],
    theEmpurror: [[20, 30, 10, 0], 78],
    thisIsTheEnd: [[20, 52, 10, 0], 0],
    whiskerWyll: [[20, 30, 10, 0], 57],
    winkWink: [[20, 30, 24, 0], 0],
    adamWhiskersen: [[20, 38, 10, 0], 0],
    bankroll: [[20, 55, 10, 0], 0],
    billBlizzard: [[20, 30, 10, 0], 138],
    bobPawge: [[44, 54, 34, 0], 0],
    bullionStack: [[20, 54, 10, 0], 0],
    cashCannon: [[30, 30, 20, 0], 0],
    fairExchange: [[20, 30, 10, 0], 54],
    gemMine: [[30, 40, 10, 0], 0],
    goldMine: [[20, 30, 10, 0], 30],
    goldenChalice: [[20, 37, 10, 0], 0],
    goldenGoose: [[20, 30, 10, 0], 126],
    goldenStag: [[20, 30, 10, 0], 66],
    handsomeJake: [[20, 30, 28, 0], 0],
    jcDentclaw: [[20, 56, 10, 0], 0],
    liquidAssets: [[20, 30, 10, 0], 63],
    midasTouch: [[20, 43, 10, 0], 0],
    moneyPrinter: [[43, 53, 33, 0], 0],
    moneyTree: [[20, 30, 10, 0], 132],
    nuggetAvalanche: [[20, 30, 10, 0], 51],
    pennyJar: [[20, 30, 25, 0], 0],
    purrDenton: [[20, 30, 27, 0], 0],
    strikeItRich: [[20, 30, 26, 0], 0],
    vaultDoor: [[42, 52, 32, 0], 0],
    wishingWell: [[20, 30, 10, 0], 69],
    youKnowWhatStallion: [[31, 30, 21, 0], 0],
    annaNyavarre: [[20, 30, 10, 0], 69],
    batteryCell: [[20, 30, 26, 0], 0],
    blackBlade: [[20, 61, 10, 0], 0],
    boneFlute: [[20, 30, 10, 0], 60],
    coldSteel: [[20, 63, 10, 0], 0],
    commando: [[20, 57, 10, 0], 0],
    corvidCrown: [[20, 40, 10, 0], 0],
    daedalynx: [[20, 30, 10, 0], 144],
    dataCube: [[32, 42, 10, 0], 0],
    dropTuned: [[33, 30, 23, 0], 0],
    eternalFlame: [[20, 30, 10, 0], 84],
    forgeAhead: [[50, 60, 40, 0], 0],
    guntherHairman: [[20, 58, 10, 0], 0],
    heliopaws: [[46, 56, 36, 0], 0],
    hornsUp: [[20, 30, 32, 0], 0],
    ironKey: [[20, 30, 29, 0], 0],
    lastCall: [[20, 30, 10, 0], 87],
    nanoBlade: [[20, 59, 10, 0], 0],
    peltCloak: [[34, 30, 24, 0], 0],
    pigIron: [[51, 61, 41, 0], 0],
    praxisKit: [[20, 44, 10, 0], 0],
    quickSilver: [[20, 30, 10, 0], 63],
    runicAmulet: [[20, 41, 10, 0], 0],
    scaledGrip: [[20, 62, 10, 0], 0],
    securityTurret: [[20, 30, 10, 0], 36],
    shoulderSpikes: [[49, 59, 39, 0], 0],
    shredMetal: [[20, 30, 31, 0], 0],
    signetOfSkulls: [[20, 45, 10, 0], 0],
    stormFork: [[20, 30, 10, 0], 150],
    studdedBelt: [[20, 30, 28, 0], 0],
    swashbuckler: [[20, 30, 10, 0], 57],
    tempered: [[20, 30, 35, 0], 0],
    theCure: [[20, 30, 10, 0], 81],
    titaniumGrip: [[20, 30, 10, 0], 72],
    wardingSigil: [[33, 43, 10, 0], 0],
    blackHole: [[20, 30, 10, 0], 156],
    bottledNebula: [[20, 46, 10, 0], 0],
    eclipse: [[20, 30, 37, 0], 0],
    treasureMap: [[20, 30, 10, 0], 75],
    captainLeFluff: [[20, 30, 38, 0], 0],
    // the cascade always takes its first step and the fixture's crit floor sits
    // one above the ground, so only floor 0 is ever reached
    divingBell: [[22, 30, 10, 0], 0],
    flooringInspector: [[35, 45, 10, 0], 0],
    kraken: [[20, 30, 10, 0], 162],
    messageInABottle: [[20, 30, 30, 0], 0],
    ancientRelic: [[20, 30, 10, 0], 105],
    geometricRelic: [[20, 30, 10, 0], 102],
    berryParfait: [[20, 30, 10, 0], 192],
    berrySmoothie: [[20, 30, 10, 0], 96],
    butterCroissant: [[20, 69, 10, 0], 0],
    cheeseWheel: [[20, 30, 10, 0], 102],
    chromeArm: [[20, 67, 10, 0], 0],
    circuitBreaker: [[20, 66, 10, 0], 0],
    glassWyvern: [[20, 30, 10, 0], 90],
    goldBar: [[20, 30, 10, 0], 186],
    honeyToast: [[20, 30, 33, 0], 0],
    potionCommotion: [[20, 30, 10, 0], 90],
    lemonTart: [[20, 30, 46, 0], 0],
    lifelineLoot: [[20, 52, 10, 0], 0],
    moonCloak: [[40, 50, 10, 0], 0],
    mossbackManticore: [[20, 30, 10, 0], 180],
    platinumRing: [[20, 62, 10, 0], 0],
    sapphireOrbit: [[20, 50, 10, 0], 0],
    roboticGripper: [[20, 68, 10, 0], 0],
    silverCoin: [[20, 30, 10, 0], 75],
    spicedChai: [[20, 30, 10, 0], 105],
    stormBoots: [[38, 30, 28, 0], 0],
    sushiPlatter: [[20, 30, 10, 0], 78],
    thornmailGlove: [[20, 49, 10, 0], 0],
    gildedCache: [[55, 65, 45, 0], 0],
    bullseye: [[20, 30, 31, 0], 0],
    chainReaction: [[36, 46, 10, 0], 0],
    doubleHelix: [[35, 30, 25, 0], 0],
    eureka: [[20, 48, 10, 0], 0],
    goldMedal: [[20, 30, 10, 0], 93],
    halfLife: [[20, 30, 10, 0], 168],
    highRoller: [[20, 30, 10, 0], 84],
    jackpot: [[52, 62, 42, 0], 0],
    knockout: [[20, 64, 10, 0], 0],
    pearlDiver: [[20, 30, 10, 0], 81],
    roundAndRound: [[20, 30, 10, 0], 69],
    scratchCard: [[20, 30, 10, 0], 96],
    silverware: [[20, 30, 39, 0], 0],
    snakeEyes: [[20, 30, 10, 0], 40],
    twentyOne: [[37, 47, 10, 0], 0],
    wheelOfFortune: [[20, 43, 10, 0], 0],
    aetherLantern: [[39, 49, 10, 0], 0],
    boilerRoom: [[20, 30, 32, 0], 0],
    brassDiver: [[20, 30, 10, 0], 99],
    clockworkHand: [[36, 30, 26, 0], 0],
    cogwork: [[20, 30, 10, 0], 174],
    fullSteam: [[53, 63, 43, 0], 0],
    pocketWatch: [[20, 30, 10, 0], 87],
    tubeDelivery: [[20, 30, 41, 0], 0],
    windUp: [[20, 47, 10, 0], 0],
    berryShortcake: [[20, 30, 10, 0], 99],
    brassBanker: [[20, 30, 44, 0], 0],
    candyCastle: [[20, 30, 10, 0], 216],
    caramelApple: [[20, 58, 10, 0], 0],
    catnipSatchel: [[20, 30, 10, 0], 58],
    cinnamonSwirl: [[46, 30, 36, 0], 0],
    citrusCoin: [[20, 30, 10, 0], 99],
    clockworkSatellite: [[20, 30, 40, 0], 0],
    coinCascade: [[20, 30, 10, 0], 228],
    comfortFood: [[20, 30, 34, 0], 0],
    crownHedgehog: [[20, 52, 10, 0], 0],
    emberKey: [[20, 62, 10, 0], 0],
    emberwingDragon2: [[20, 30, 10, 0], 90],
    emperorsFinest: [[20, 30, 10, 0], 222],
    eternalDuty: [[47, 57, 37, 0], 0],
    faithIsOurShield: [[20, 54, 10, 0], 0],
    fearNotThePsyker: [[20, 30, 10, 0], 102],
    frostRune: [[49, 59, 10, 0], 0],
    lanternFox: [[20, 30, 10, 0], 93],
    lanternLynx: [[20, 30, 33, 0], 0],
    memoryCrystal: [[20, 51, 10, 0], 0],
    mochaFroth: [[20, 30, 10, 0], 84],
    coinrootGrove: [[40, 50, 30, 0], 0],
    neonBeaker: [[20, 30, 10, 0], 96],
    neverSurrender: [[20, 65, 10, 0], 0],
    pearlOtter: [[20, 30, 10, 0], 90],
    pickleParade: [[20, 30, 35, 0], 0],
    profitPigeon: [[20, 30, 10, 0], 81],
    purge: [[20, 63, 10, 0], 0],
    rainbowRelic: [[20, 53, 10, 0], 0],
    ramenCrown: [[20, 30, 10, 0], 210],
    redPanda: [[51, 30, 41, 0], 0],
    silverLaurel: [[20, 30, 10, 0], 58],
    thunderNachos: [[48, 58, 38, 0], 0],
    toTheSkies: [[20, 30, 46, 0], 0],
    treasureTeapot: [[20, 30, 10, 0], 102],
    whatAreYourOrders: [[20, 30, 40, 0], 0],
    whisperingOrb: [[20, 55, 10, 0], 0],
    clockworkOwl: [[20, 57, 10, 0], 0],
    goldenGardenGolem: [[20, 30, 10, 0], 198],
    moonlitMint: [[20, 30, 10, 0], 78],
    vaultBeetle: [[20, 64, 10, 0], 0],
    lionKey: [[20, 56, 10, 0], 0],
    restorationProject: [[20, 60, 10, 0], 0],
    arfthas: [[20, 52, 10, 0], 0],
    guldanMeow: [[20, 30, 10, 0], 93],
    sargerasPurrgeras: [[65, 75, 55, 0], 0],
    sylvanwhisker: [[20, 30, 10, 0], 84],
    sylvanasWhiskerunner: [[20, 30, 10, 0], 90],
    jainaPurrmoore: [[20, 54, 10, 0], 0],
    thrallpaw: [[20, 30, 10, 0], 192],
    varianWrynnkles: [[20, 68, 10, 0], 0],
    anduinWrynncat: [[20, 30, 10, 0], 90],
    illidandelight: [[20, 72, 10, 0], 0],
    malfurionStormpaw: [[20, 30, 10, 0], 210],
    voljinWhisker: [[20, 56, 10, 0], 0],
    lorthemewPurron: [[20, 30, 10, 0], 87],
    khadgarPurr: [[53, 63, 43, 0], 0],
    garroshHellscreamPurr: [[20, 78, 10, 0], 0],
    grommewHellscream: [[20, 30, 10, 0], 240],
    deathwingTheDestroycat: [[75, 85, 65, 0], 0],
    deathwingAshwing: [[20, 80, 10, 0], 0],
    deathwingDestroypurr: [[80, 90, 70, 0], 0],
    ragnapurrs: [[20, 30, 10, 0], 111],
    medivhMewage: [[20, 57, 10, 0], 0],
    tyrandeWhiskerwind: [[20, 30, 10, 0], 102],
    tyrandeMoonwhisker: [[20, 30, 10, 0], 96],
    tyrandeWhisperpaws: [[20, 30, 10, 0], 228],
    tyrandeStarbow: [[20, 61, 10, 0], 0],
    chenStormstout: [[45, 55, 35, 0], 0],
    antleredFoxFortune: [[20, 64, 10, 0], 0],
    emperorProvidesPurrfection: [[20, 30, 10, 0], 264],
    furionStormpaw: [[20, 30, 10, 0], 252],
    whatIsBrewing: [[20, 30, 10, 0], 48],
    goldLion: [[20, 30, 10, 0], 162],
    goldElephant: [[20, 58, 10, 0], 0],
    goldBear: [[20, 30, 10, 0], 144],
    goldWolf: [[20, 30, 32, 0], 0],
    goldOwl: [[20, 30, 10, 0], 40],
    goldRam: [[38, 30, 28, 0], 0],
    goldRabbit: [[20, 30, 10, 0], 39],
    goldCat: [[20, 45, 10, 0], 0],
    goldenLion: [[20, 50, 10, 0], 0],
    loadedBurger: [[20, 54, 10, 0], 0],
    tacoFeast: [[20, 30, 10, 0], 132],
    pizzaSupreme: [[20, 56, 10, 0], 0],
    sushiPlatter2: [[20, 30, 10, 0], 84],
    sushiPlatter3: [[20, 53, 10, 0], 0],
    sushiPlatter4: [[20, 30, 10, 0], 180],
    ramenBowl: [[20, 57, 10, 0], 0],
    berrySmoothie2: [[20, 30, 10, 0], 87],
    berrySmoothie3: [[20, 55, 10, 0], 0],
    berrySmoothie4: [[20, 30, 10, 0], 186],
    icedCoffee: [[20, 30, 10, 0], 54],
    tropicalLemonade: [[20, 50, 10, 0], 0],
    tropicalLemonade2: [[20, 30, 10, 0], 72],
    hotChocolate: [[20, 49, 10, 0], 0],
    hotChocolate2: [[20, 30, 10, 0], 126],
    sunsetMargarita: [[20, 47, 10, 0], 0],
    blueLagoonCocktail: [[20, 52, 10, 0], 0],
    blueLagoonCocktail2: [[20, 30, 10, 0], 69],
    blueLagoonCocktail3: [[20, 55, 10, 0], 0],
    strawberryDaiquiri: [[20, 30, 10, 0], 81],
    mangoMojito: [[20, 54, 10, 0], 0],
    mangoMojito2: [[20, 30, 10, 0], 78],
    espressoMartini: [[20, 30, 10, 0], 192],
    chocolateCake: [[20, 60, 10, 0], 0],
    strawberryShortcake: [[20, 30, 10, 0], 84],
    rainbowDonut: [[20, 51, 10, 0], 0],
    iceCreamSundae: [[20, 30, 10, 0], 204],
    iceCreamSundae2: [[20, 59, 10, 0], 0],
    macaronTower: [[20, 30, 10, 0], 198],
    macaronTower2: [[20, 61, 10, 0], 0],
    batman: [[20, 68, 10, 0], 0],
    joker: [[20, 30, 10, 0], 210],
    harleyQuinn: [[20, 62, 10, 0], 0],
    killerCroc: [[20, 30, 10, 0], 240],
    mrFreeze: [[20, 66, 10, 0], 0],
    poisonIvy: [[20, 30, 10, 0], 102],
    scarecrow: [[20, 60, 10, 0], 0],
    thePenguin: [[20, 30, 10, 0], 84],
    theRiddler: [[20, 57, 10, 0], 0],
    bane: [[20, 72, 10, 0], 0],
    harleyQuinn2: [[20, 30, 10, 0], 99],
    killerCroc2: [[20, 69, 10, 0], 0],
    poisonIvy2: [[20, 61, 10, 0], 0],
    poisonIvy3: [[20, 30, 10, 0], 222],
    thePenguin2: [[20, 59, 10, 0], 0],
    bestestBoy: [[20, 71, 10, 0], 0],
    doggo: [[20, 30, 10, 0], 228],
    otterlyAdorable: [[20, 30, 10, 0], 105],
    apple: [[20, 30, 10, 0], 44],
    cupcake: [[20, 56, 10, 0], 0],
    potion: [[44, 30, 34, 0], 0],
    donut: [[20, 30, 10, 0], 90],
    clockworkWizard2: [[20, 30, 44, 0], 0],
    metalHeart: [[20, 66, 10, 0], 0],
    metalHeart2: [[20, 30, 10, 0], 123],
    clockworkWizard: [[20, 42, 10, 0], 0],
    bulwark: [[20, 73, 10, 0], 0],
    fullPlate: [[53, 63, 10, 0], 0],
    overlord: [[20, 30, 10, 0], 270],
    beerBelly: [[20, 30, 10, 0], 69],
    bottomsUp: [[20, 55, 10, 0], 0],
    wineCountry: [[20, 30, 10, 0], 81],
    ponyKeg: [[20, 30, 10, 0], 56],
    vodkaWhiskers: [[20, 30, 41, 0], 0],
    highRoller3: [[20, 30, 10, 0], 96],
    splitThePot: [[20, 65, 45, 0], 0],
    highRoller2: [[20, 67, 10, 0], 0],
    pokerNight: [[20, 30, 10, 0], 234],
    emptyGlass: [[20, 30, 10, 0], 57],
    amberSpritz: [[20, 30, 10, 0], 60],
    copperMugMule2: [[20, 30, 10, 0], 63],
    negroniNightfall2: [[20, 30, 10, 0], 72],
    blackberryBramble: [[20, 52, 10, 0], 0],
    blackberryBramble2: [[41, 30, 31, 0], 0],
    singaporeSling: [[20, 30, 10, 0], 75],
    derbyDayJulep: [[20, 57, 10, 0], 0],
    derbyDayJulep2: [[20, 30, 10, 0], 52],
    hurricaneHour: [[20, 58, 10, 0], 0],
    cosmoCashout: [[20, 59, 10, 0], 0],
    frenchSeventyFive: [[46, 30, 36, 0], 0],
    sidecarSurge: [[20, 30, 37, 0], 0],
    allowance: [[20, 30, 10, 0], 60],
    hurricaneHour2: [[20, 30, 10, 0], 93],
    copperMugMule: [[50, 60, 40, 0], 0],
    pineappleParadise: [[51, 61, 10, 0], 0],
    negroniNightfall: [[20, 60, 40, 0], 0],
    oldFashionedFortune: [[20, 30, 10, 0], 102],
    tikiZombie: [[20, 30, 10, 0], 198],
    tikiZombie2: [[20, 50, 10, 0], 60],
    allowance2: [[52, 62, 42, 0], 0],
    lootBags: [[20, 30, 48, 0], 0],
    longIslandLandslide: [[20, 30, 10, 0], 216],
    pocketMoney2: [[20, 30, 10, 0], 222],
    liquidAssets2: [[20, 30, 10, 0], 132],
    pocketMoney: [[20, 45, 10, 0], 0],
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
    if (kind === "popTheQuestion")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "youAreNotPrepared")
      assert.equal(test.context.floor.critMultiplierTier, "mega");
    if (kind === "arcana" || kind === "iDidntAskForThis")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "theBigCheese")
      assert.equal(test.context.floor.critMultiplierTier, "mega");
    if (kind === "wishfulBanking")
      assert.equal(test.context.floor.critMultiplierTier, "mega");
    if (kind === "theGreatCatsby")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "prehistoric")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "eggcellentWork")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "whySoSerious")
      assert.equal(test.context.floor.critMultiplierTier, "mega");
    if (kind === "savePointSavings" || kind === "achievementUnlocked")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "magicalPayrollGirl")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "theMoonstoneKey")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "emeraldCrown")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "velvetManticore")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "elixirUnderMoonlight" || kind === "theAntlerwoodStalker")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "clockworkWizard")
      assert.equal(test.context.floor.critMultiplierTier, "crit");
    if (kind === "pocketMoney")
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
  for (const kind of [
    "checkUp",
    "robinHood",
    "spy",
    "theLawWon",
    "littleSister",
    "thinkWithYourHead",
    "treasureMeasure",
    "raidersOfTheLostReceipt",
    "theDevilWearsPawda",
    "charlestonCharge",
  ]) {
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
    `PASS: ${kinds.length} rewards, single-floor fallbacks, targeting ties, milestones, tier caps, registry state, roll gates/cap, odds, and icons`,
  );
} finally {
  Math.random = originalRandom;
  await server.close();
}
