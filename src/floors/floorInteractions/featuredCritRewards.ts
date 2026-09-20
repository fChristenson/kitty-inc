import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";
import {
  nextCritTier,
  BOUNCE_CRIT_CONTINUE_CHANCE,
  type FeaturedCritKind,
} from "../../shared/critTypes";
import { gt, lt, type BigNumber } from "../../shared/bigNumber";
import type { CritRewardContext } from "./index";

interface FeaturedRewardActions {
  upgrade: (floors: Floor[], count: number) => void;
  payCycles: (floors: Floor[], count: number) => void;
  incomeRate: (floor: Floor, now: number) => BigNumber;
}

export function createFeaturedCritRewards(actions: FeaturedRewardActions) {
  const balance = CONFIG.crit;
  const highestFloor = (context: CritRewardContext) =>
    context.floors.filter((floor) => floor.unlocked).at(-1) ?? context.floor;
  const lowestLevel = (context: CritRewardContext) =>
    context.floors
      .filter((floor) => floor.unlocked)
      .reduce(
        (best, floor) =>
          floor.upgradeCount < best.upgradeCount ? floor : best,
        context.floor,
      );
  const selectByRate = (context: CritRewardContext, highest: boolean) => {
    const now = Date.now();
    const compare = highest ? gt : lt;
    return context.floors
      .filter((floor) => floor.unlocked)
      .reduce(
        (best, floor) =>
          compare(actions.incomeRate(floor, now), actions.incomeRate(best, now))
            ? floor
            : best,
        context.floor,
      );
  };
  const alternating = (context: CritRewardContext) =>
    context.floors.filter((floor, index) => floor.unlocked && index % 2 === 0);
  const cheapest = (context: CritRewardContext) =>
    context.floors
      .filter((floor) => floor.unlocked)
      .reduce(
        (best, floor) =>
          lt(floor.upgradeCost, best.upgradeCost) ? floor : best,
        context.floor,
      );
  const promoteAndUpgrade = (floor: Floor, steps: number, upgrades: number) => {
    for (let step = 0; step < steps; step++) {
      floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
    }
    actions.upgrade([floor], upgrades);
  };
  // the same walk applyBounceCrit does: always fall one floor, then roll to
  // keep falling. Returning the targets rather than applying per step keeps it
  // on the cheap bulk-upgrade path the other featured rewards use. On the
  // ground floor there's nothing below to reach, so it lands where it started
  // instead of paying out nothing.
  const cascadeDown = (context: CritRewardContext) => {
    const targets: Floor[] = [];
    let index = context.floors.indexOf(context.floor) - 1;
    for (;;) {
      if (index < 0) break;
      targets.push(context.floors[index]);
      index -= 1;
      if (Math.random() >= BOUNCE_CRIT_CONTINUE_CHANCE) break;
    }
    return targets.length > 0 ? targets : [context.floor];
  };

  return {
    ballerina: (context) => {
      actions.upgrade([context.floor], balance.ballerinaUpgrades);
      actions.payCycles([context.floor], balance.ballerinaPayouts);
    },
    cowboy: (context) =>
      actions.upgrade([lowestLevel(context)], balance.cowboyUpgrades),
    dinnerTime: (context) =>
      actions.payCycles(context.floors, balance.dinnerTimePayouts),
    fingerGuns: (context) => {
      actions.upgrade([context.floor], balance.fingerGunsUpgrades);
      actions.upgrade([highestFloor(context)], balance.fingerGunsUpgrades);
    },
    flamenco: (context) =>
      actions.upgrade(context.floors, balance.flamencoUpgrades),
    milestone: (context) => {
      const count =
        balance.milestoneStep -
        (context.floor.upgradeCount % balance.milestoneStep);
      actions.upgrade([context.floor], count);
    },
    moonwalker: (context) => {
      const targets = context.floors.slice(
        0,
        context.floors.indexOf(context.floor) + 1,
      );
      actions.upgrade(targets, balance.moonwalkerUpgrades);
    },
    ninja: (context) => actions.upgrade([context.floor], balance.ninjaUpgrades),
    obelisk: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.obeliskTierSteps,
        balance.obeliskUpgrades,
      ),
    sharpShooter: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.sharpShooterPayouts,
      ),
    space: (context) =>
      actions.upgrade([highestFloor(context)], balance.spaceUpgrades),
    yesChef: (context) =>
      actions.payCycles(context.floors, balance.yesChefPayouts),
    amethyst: (context) =>
      actions.payCycles([context.floor], balance.amethystPayouts),
    blessed: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.blessedTierSteps,
        balance.blessedUpgrades,
      ),
    centurion: (context) =>
      actions.upgrade([context.floor], balance.centurionUpgrades),
    checkUp: (context) => {
      const floor = lowestLevel(context);
      actions.upgrade([floor], balance.checkUpUpgrades);
      actions.payCycles([floor], balance.checkUpPayouts);
    },
    diamond: (context) =>
      actions.payCycles([context.floor], balance.diamondPayouts),
    emerald: (context) =>
      actions.payCycles([context.floor], balance.emeraldPayouts),
    fireman: (context) => {
      actions.upgrade(context.floors, balance.firemanUpgrades);
      actions.payCycles(context.floors, balance.firemanPayouts);
    },
    forTheEmperor: (context) =>
      actions.upgrade(context.floors, balance.forTheEmperorUpgrades),
    forTheKing: (context) =>
      actions.upgrade(context.floors, balance.forTheKingUpgrades),
    goldNugget: (context) =>
      actions.payCycles([context.floor], balance.goldNuggetPayouts),
    goldRush: (context) =>
      actions.payCycles(context.floors, balance.goldRushPayouts),
    hammerTime: (context) =>
      actions.upgrade([context.floor], balance.hammerTimeUpgrades),
    robinHood: (context) => {
      actions.payCycles(
        [selectByRate(context, true)],
        balance.robinHoodPayouts,
      );
      actions.upgrade([lowestLevel(context)], balance.robinHoodUpgrades);
    },
    roman: (context) => actions.upgrade(context.floors, balance.romanUpgrades),
    ruby: (context) => actions.payCycles([context.floor], balance.rubyPayouts),
    samurai: (context) =>
      actions.upgrade([context.floor], balance.samuraiUpgrades),
    saphire: (context) =>
      actions.payCycles([context.floor], balance.saphirePayouts),
    silverRush: (context) =>
      actions.payCycles(context.floors, balance.silverRushPayouts),
    spy: (context) =>
      actions.upgrade([selectByRate(context, false)], balance.spyUpgrades),
    theLawWon: (context) => {
      const floor = cheapest(context);
      actions.upgrade([floor], balance.theLawWonUpgrades);
      actions.payCycles([floor], balance.theLawWonPayouts);
    },
    victorian: (context) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.victorianPayouts,
      ),
    executiveSpin: (context) =>
      actions.upgrade([highestFloor(context)], balance.executiveSpinUpgrades),
    rubberStampede: (context) =>
      actions.payCycles(context.floors, balance.rubberStampedePayouts),
    replyAll: (context) => {
      const lowest = lowestLevel(context);
      actions.payCycles([context.floor], balance.replyAllPayouts);
      if (lowest !== context.floor)
        actions.payCycles([lowest], balance.replyAllPayouts);
    },
    stapleOfSuccess: (context) =>
      actions.upgrade([context.floor], balance.stapleOfSuccessUpgrades),
    faxOfFortune: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.faxOfFortunePayouts,
      ),
    casualMonday: (context) =>
      actions.upgrade([context.floor], balance.casualMondayUpgrades),
    deskJockey: (context) =>
      actions.upgrade([lowestLevel(context)], balance.deskJockeyUpgrades),
    inboxZeroGravity: (context) =>
      actions.payCycles(context.floors, balance.inboxZeroGravityPayouts),
    beanCounter: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.beanCounterTierSteps,
        balance.beanCounterUpgrades,
      ),
    kingOfTheWorld: (context) =>
      actions.upgrade([highestFloor(context)], balance.kingOfTheWorldUpgrades),
    officeClown: (context) =>
      actions.upgrade([lowestLevel(context)], balance.officeClownUpgrades),
    fridayTieDay: (context) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.fridayTieDayPayouts,
      ),
    soReady: (context) =>
      actions.upgrade([context.floor], balance.soReadyUpgrades),
    doughDivision: (context) =>
      actions.upgrade([context.floor], balance.doughDivisionUpgrades),
    profitPopcorn: (context) =>
      actions.payCycles(context.floors, balance.profitPopcornPayouts),
    donutDisturb: (context) => {
      actions.upgrade([context.floor], balance.donutDisturbUpgrades);
      actions.payCycles([context.floor], balance.donutDisturbPayouts);
    },
    cakeDay: (context) =>
      actions.upgrade([lowestLevel(context)], balance.cakeDayUpgrades),
    champagneProblems: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.champagneProblemsPayouts,
      ),
    bonusBurrito: (context) => {
      actions.upgrade([context.floor], balance.bonusBurritoUpgrades);
      actions.payCycles([context.floor], balance.bonusBurritoPayouts);
    },
    sundaeBest: (context) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.sundaeBestPayouts,
      ),
    popTheQuestion: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.popTheQuestionTierSteps,
        balance.popTheQuestionUpgrades,
      ),
    partyCrasher: (context) => {
      actions.upgrade([context.floor], balance.partyCrasherUpgrades);
      actions.upgrade([highestFloor(context)], balance.partyCrasherUpgrades);
    },
    wizard: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.wizardTierSteps,
        balance.wizardUpgrades,
      ),
    epic: (context) => actions.upgrade([context.floor], balance.epicUpgrades),
    ready: (context) => {
      const topEarner = selectByRate(context, true);
      actions.upgrade([topEarner], balance.readyUpgrades);
      actions.payCycles([topEarner], balance.readyPayouts);
    },
    workWork: (context) =>
      actions.upgrade(context.floors, balance.workWorkUpgrades),
    yesWarchief: (context) =>
      actions.payCycles(context.floors, balance.yesWarchiefPayouts),
    youAreNotPrepared: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.youAreNotPreparedTierSteps,
        balance.youAreNotPreparedUpgrades,
      ),
    arcana: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.arcanaTierSteps,
        balance.arcanaUpgrades,
      ),
    bigDaddy: (context) =>
      actions.upgrade([context.floor], balance.bigDaddyUpgrades),
    chonk: (context) =>
      actions.payCycles([context.floor], balance.chonkPayouts),
    cyberPunk: (context) =>
      actions.upgrade([context.floor], balance.cyberPunkUpgrades),
    dodgeThis: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.dodgeThisPayouts,
      ),
    whiteRabbit: (context) => {
      const lowest = lowestLevel(context);
      actions.upgrade([context.floor], balance.whiteRabbitUpgrades);
      if (lowest !== context.floor)
        actions.upgrade([lowest], balance.whiteRabbitUpgrades);
    },
    gladiator: (context) =>
      actions.upgrade(context.floors, balance.gladiatorUpgrades),
    iDidntAskForThis: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.iDidntAskForThisTierSteps,
        balance.iDidntAskForThisUpgrades,
      ),
    iHatePortals: (context) =>
      actions.payCycles([context.floor], balance.iHatePortalsPayouts),
    littleSister: (context) =>
      actions.upgrade([lowestLevel(context)], balance.littleSisterUpgrades),
    magicIsATool: (context) =>
      actions.upgrade(alternating(context), balance.magicIsAToolUpgrades),
    megaChonk: (context) =>
      actions.payCycles([context.floor], balance.megaChonkPayouts),
    metal: (context) =>
      actions.upgrade([highestFloor(context)], balance.metalUpgrades),
    princess: (context) =>
      actions.payCycles(alternating(context), balance.princessPayouts),
    spaceAndTime: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.spaceAndTimeUpgrades,
      ),
    thinkWithYourHead: (context) => {
      const floor = lowestLevel(context);
      actions.upgrade([floor], balance.thinkWithYourHeadUpgrades);
      actions.payCycles([floor], balance.thinkWithYourHeadPayouts);
    },
    wouldYouKindly: (context) =>
      actions.payCycles(context.floors, balance.wouldYouKindlyPayouts),
    yesYourHighness: (context) =>
      actions.upgrade(context.floors, balance.yesYourHighnessUpgrades),
    bulletDodger: (context) =>
      actions.upgrade([context.floor], balance.bulletDodgerUpgrades),
    nothingToSee: (context) =>
      actions.payCycles([context.floor], balance.nothingToSeePayouts),
    nowIAmSuspicious: (context) =>
      actions.payCycles(context.floors, balance.nowIAmSuspiciousPayouts),
    redOrBlue: (context) => {
      actions.upgrade([lowestLevel(context)], balance.redOrBlueUpgrades);
      actions.payCycles(
        [selectByRate(context, true)],
        balance.redOrBluePayouts,
      );
    },
    abraCashDabra: (context) =>
      actions.payCycles([context.floor], balance.abraCashDabraPayouts),
    captainOfIndustry: (context) =>
      actions.upgrade(context.floors, balance.captainOfIndustryUpgrades),
    clowningAround: (context) => {
      actions.upgrade(context.floors, balance.clowningAroundUpgrades);
      actions.payCycles(context.floors, balance.clowningAroundPayouts);
    },
    discoDividend: (context) =>
      actions.payCycles(alternating(context), balance.discoDividendPayouts),
    mimeYourBusiness: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.mimeYourBusinessUpgrades,
      ),
    redCarpetTreatment: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.redCarpetTreatmentPayouts,
      ),
    rockTheStock: (context) =>
      actions.upgrade([context.floor], balance.rockTheStockUpgrades),
    strongReturn: (context) =>
      actions.upgrade([highestFloor(context)], balance.strongReturnUpgrades),
    theBigCheese: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.theBigCheeseTierSteps,
        balance.theBigCheeseUpgrades,
      ),
    queenOfQueens: (context) =>
      actions.upgrade(context.floors, balance.queenOfQueensUpgrades),
    bubbleEconomy: (context) =>
      actions.payCycles([context.floor], balance.bubbleEconomyPayouts),
    cloudNineToFive: (context) =>
      actions.payCycles(context.floors, balance.cloudNineToFivePayouts),
    luckyLaundromat: (context) => {
      actions.upgrade(context.floors, balance.luckyLaundromatUpgrades);
      actions.payCycles(context.floors, balance.luckyLaundromatPayouts);
    },
    moneyMagnet: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.moneyMagnetPayouts,
      ),
    overTheRainbow: (context) =>
      actions.payCycles(alternating(context), balance.overTheRainbowPayouts),
    pocketDimension: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.pocketDimensionUpgrades,
      ),
    shootingStarEmployee: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.shootingStarEmployeeUpgrades,
      ),
    treasureMeasure: (context) =>
      actions.upgrade([lowestLevel(context)], balance.treasureMeasureUpgrades),
    wishfulBanking: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.wishfulBankingTierSteps,
        balance.wishfulBankingUpgrades,
      ),
    backToTheFiscal: (context) =>
      actions.upgrade([context.floor], balance.backToTheFiscalUpgrades),
    despicableFees: (context) =>
      actions.payCycles([context.floor], balance.despicableFeesPayouts),
    howToTrainYourManager: (context) => {
      actions.upgrade([context.floor], balance.howToTrainYourManagerUpgrades);
      actions.payCycles([context.floor], balance.howToTrainYourManagerPayouts);
    },
    jurassicPerk: (context) =>
      actions.payCycles([context.floor], balance.jurassicPerkPayouts),
    raidersOfTheLostReceipt: (context) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.raidersOfTheLostReceiptUpgrades,
      ),
    theDevilWearsPawda: (context) =>
      actions.upgrade([cheapest(context)], balance.theDevilWearsPawdaUpgrades),
    theExpenseMatrix: (context) =>
      actions.payCycles(context.floors, balance.theExpenseMatrixPayouts),
    theFastAndTheFurriest: (context) =>
      actions.upgrade(
        alternating(context),
        balance.theFastAndTheFurriestUpgrades,
      ),
    theFellowshipOfTheBling: (context) => {
      actions.upgrade(context.floors, balance.theFellowshipOfTheBlingUpgrades);
      actions.payCycles(context.floors, balance.theFellowshipOfTheBlingPayouts);
    },
    theGreatCatsby: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.theGreatCatsbyTierSteps,
        balance.theGreatCatsbyUpgrades,
      ),
    theLordOfTheRingBinders: (context) =>
      actions.upgrade([context.floor], balance.theLordOfTheRingBindersUpgrades),
    breakEven: (context) =>
      actions.upgrade([context.floor], balance.breakEvenUpgrades),
    chaChaChing: (context) =>
      actions.payCycles([context.floor], balance.chaChaChingPayouts),
    charlestonCharge: (context) =>
      actions.upgrade([lowestLevel(context)], balance.charlestonChargeUpgrades),
    congaCompounding: (context) => {
      actions.upgrade(context.floors, balance.congaCompoundingUpgrades);
      actions.payCycles(context.floors, balance.congaCompoundingPayouts);
    },
    robotResources: (context) =>
      actions.upgrade([highestFloor(context)], balance.robotResourcesUpgrades),
    rumbaReturns: (context) =>
      actions.payCycles([context.floor], balance.rumbaReturnsPayouts),
    salsaSalary: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.salsaSalaryPayouts,
      ),
    shuffleTheFunds: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.shuffleTheFundsUpgrades,
      ),
    tangoTender: (context) => {
      actions.upgrade([context.floor], balance.tangoTenderUpgrades);
      actions.upgrade([highestFloor(context)], balance.tangoTenderUpgrades);
    },
    tapThatAsset: (context) =>
      actions.payCycles(alternating(context), balance.tapThatAssetPayouts),
    waltzStreet: (context) =>
      actions.upgrade(context.floors, balance.waltzStreetUpgrades),
    prehistoric: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.prehistoricTierSteps,
        balance.prehistoricUpgrades,
      ),
    breadyOrNot: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.breadyOrNotUpgrades,
      ),
    eggcellentWork: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.eggcellentWorkTierSteps,
        balance.eggcellentWorkUpgrades,
      ),
    holyGuacamole: (context) =>
      actions.payCycles(context.floors, balance.holyGuacamolePayouts),
    loafActually: (context) =>
      actions.upgrade(context.floors, balance.loafActuallyUpgrades),
    pastaLaVista: (context) =>
      actions.payCycles(alternating(context), balance.pastaLaVistaPayouts),
    souperStar: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.souperStarPayouts,
      ),
    tacoBoutIt: (context) => {
      actions.upgrade([context.floor], balance.tacoBoutItUpgrades);
      actions.upgrade([lowestLevel(context)], balance.tacoBoutItUpgrades);
    },
    theGreatPancakeStack: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.theGreatPancakeStackUpgrades,
      ),
    wokAndRoll: (context) =>
      actions.upgrade([highestFloor(context)], balance.wokAndRollUpgrades),
    iAmTheNight: (context) =>
      actions.upgrade(context.floors, balance.iAmTheNightUpgrades),
    tubs: (context) => actions.payCycles([context.floor], balance.tubsPayouts),
    whySoSerious: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.whySoSeriousTierSteps,
        balance.whySoSeriousUpgrades,
      ),
    avocardio: (context) =>
      actions.upgrade([context.floor], balance.avocardioUpgrades),
    butterBelieveIt: (context) =>
      actions.payCycles([context.floor], balance.butterBelieveItPayouts),
    cheesePullChampion: (context) => {
      actions.upgrade([context.floor], balance.cheesePullChampionUpgrades);
      actions.payCycles([context.floor], balance.cheesePullChampionPayouts);
    },
    grillSergeant: (context) =>
      actions.upgrade(context.floors, balance.grillSergeantUpgrades),
    noodleNap: (context) =>
      actions.payCycles(alternating(context), balance.noodleNapPayouts),
    picklePredicament: (context) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.picklePredicamentUpgrades,
      ),
    golem: (context) =>
      actions.upgrade([highestFloor(context)], balance.golemUpgrades),
    hotPotato: (context) =>
      actions.payCycles([context.floor], balance.hotPotatoPayouts),
    brunchBoss: (context) => {
      actions.upgrade([context.floor], balance.brunchBossUpgrades);
      actions.payCycles([context.floor], balance.brunchBossPayouts);
    },
    curryFavour: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.curryFavourPayouts,
      ),
    dimSumDynasty: (context) =>
      actions.upgrade(context.floors, balance.dimSumDynastyUpgrades),
    soupDumplingSurgeon: (context) => {
      actions.upgrade([context.floor], balance.soupDumplingSurgeonUpgrades);
      actions.payCycles([context.floor], balance.soupDumplingSurgeonPayouts);
    },
    chocolateFountainOfYouth: (context) =>
      actions.payCycles(
        [context.floor],
        balance.chocolateFountainOfYouthPayouts,
      ),
    gummyBearMarket: (context) =>
      actions.upgrade(context.floors, balance.gummyBearMarketUpgrades),
    jawbreaker: (context) =>
      actions.upgrade([context.floor], balance.jawbreakerUpgrades),
    licoriceLaces: (context) =>
      actions.upgrade([lowestLevel(context)], balance.licoriceLacesUpgrades),
    lollipopGuild: (context) =>
      actions.payCycles(alternating(context), balance.lollipopGuildPayouts),
    marshmallowMountain: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.marshmallowMountainUpgrades,
      ),
    sugarHigh: (context) => {
      actions.upgrade(context.floors, balance.sugarHighUpgrades);
      actions.payCycles(context.floors, balance.sugarHighPayouts);
    },
    bubblegumBalloon: (context) =>
      actions.payCycles([context.floor], balance.bubblegumBalloonPayouts),
    candyCaneClimber: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.candyCaneClimberUpgrades,
      ),
    sherbetSherpa: (context) =>
      actions.payCycles(context.floors, balance.sherbetSherpaPayouts),
    toffeeTrap: (context) =>
      actions.upgrade([context.floor], balance.toffeeTrapUpgrades),
    cottonCandyCloud: (context) =>
      actions.payCycles([context.floor], balance.cottonCandyCloudPayouts),
    fudgeIt: (context) =>
      actions.upgrade([context.floor], balance.fudgeItUpgrades),
    gobstopperGetaway: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.gobstopperGetawayUpgrades,
      ),
    jellyBeanJamboree: (context) =>
      actions.payCycles(alternating(context), balance.jellyBeanJamboreePayouts),
    rockCandyQuarry: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.rockCandyQuarryTierSteps,
        balance.rockCandyQuarryUpgrades,
      ),
    sprinkleStorm: (context) =>
      actions.upgrade(context.floors, balance.sprinkleStormUpgrades),
    dungeonAccountant: (context) =>
      actions.upgrade([context.floor], balance.dungeonAccountantUpgrades),
    lootGoblin: (context) =>
      actions.payCycles([context.floor], balance.lootGoblinPayouts),
    inventoryFull: (context) =>
      actions.upgrade([context.floor], balance.inventoryFullUpgrades),
    sideQuestSalary: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.sideQuestSalaryPayouts,
      ),
    minMaxManager: (context) =>
      actions.upgrade([lowestLevel(context)], balance.minMaxManagerUpgrades),
    criticalKnit: (context) =>
      actions.payCycles(alternating(context), balance.criticalKnitPayouts),
    savePointSavings: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.savePointSavingsTierSteps,
        balance.savePointSavingsUpgrades,
      ),
    achievementUnlocked: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.achievementUnlockedTierSteps,
        balance.achievementUnlockedUpgrades,
      ),
    newGamePlus: (context) =>
      actions.upgrade([context.floor], balance.newGamePlusUpgrades),
    speedrunPayroll: (context) =>
      actions.payCycles(context.floors, balance.speedrunPayrollPayouts),
    lagCompensation: (context) =>
      actions.payCycles([context.floor], balance.lagCompensationPayouts),
    patchNotesPayday: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.patchNotesPaydayUpgrades,
      ),
    biggerOnTheInside: (context) =>
      actions.payCycles(context.floors, balance.biggerOnTheInsidePayouts),
    cacheMeOutside: (context) =>
      actions.upgrade([lowestLevel(context)], balance.cacheMeOutsideUpgrades),
    itCompiles: (context) =>
      actions.upgrade([context.floor], balance.itCompilesUpgrades),
    magicalPayrollGirl: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.magicalPayrollGirlTierSteps,
        balance.magicalPayrollGirlUpgrades,
      ),
    mechaMiddleManagement: (context) =>
      actions.upgrade(context.floors, balance.mechaMiddleManagementUpgrades),
    mergeConflict: (context) => {
      actions.upgrade([context.floor], balance.mergeConflictUpgrades);
      actions.payCycles([context.floor], balance.mergeConflictPayouts);
    },
    mintCondition: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.mintConditionPayouts,
      ),
    stackOverflowing: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.stackOverflowingUpgrades,
      ),
    oneMoreRound: (context) => {
      actions.upgrade([context.floor], balance.oneMoreRoundUpgrades);
      actions.payCycles([context.floor], balance.oneMoreRoundPayouts);
    },
    couchCoOpCapital: (context) =>
      actions.upgrade(context.floors, balance.couchCoOpCapitalUpgrades),
    hardCarry: (context) =>
      actions.upgrade([highestFloor(context)], balance.hardCarryUpgrades),
    readyCheck: (context) =>
      actions.upgrade(context.floors, balance.readyCheckUpgrades),
    queueRoyalty: (context) =>
      actions.payCycles([context.floor], balance.queueRoyaltyPayouts),
    rankedAndBanked: (context) =>
      actions.upgrade([context.floor], balance.rankedAndBankedUpgrades),
    victoryPose: (context) =>
      actions.upgrade([context.floor], balance.victoryPoseUpgrades),
    emoteEconomy: (context) =>
      actions.payCycles(context.floors, balance.emoteEconomyPayouts),
    checkpointChampion: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.checkpointChampionUpgrades,
      ),
    fishingForFunds: (context) =>
      actions.payCycles([context.floor], balance.fishingForFundsPayouts),
    purrfectOrigin: (context) =>
      actions.upgrade([context.floor], balance.purrfectOriginUpgrades),
    capeEscape: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.capeEscapePayouts,
      ),
    thunderPaws: (context) =>
      actions.upgrade(context.floors, balance.thunderPawsUpgrades),
    clawAndOrder: (context) =>
      actions.payCycles([context.floor], balance.clawAndOrderPayouts),
    felineFury: (context) =>
      actions.upgrade([context.floor], balance.felineFuryUpgrades),
    sidekickShuffle: (context) =>
      actions.upgrade(alternating(context), balance.sidekickShuffleUpgrades),
    cosmicCatapult: (context) =>
      actions.payCycles(context.floors, balance.cosmicCatapultPayouts),
    theMoonstoneKey: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.theMoonstoneKeyTierSteps,
        balance.theMoonstoneKeyUpgrades,
      ),
    spellbookSupreme: (context) =>
      actions.upgrade([context.floor], balance.spellbookSupremeUpgrades),
    prismPotion: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.prismPotionPayouts,
      ),
    galaxyGumball: (context) =>
      actions.payCycles([context.floor], balance.galaxyGumballPayouts),
    treasureTruffle: (context) => {
      actions.upgrade([context.floor], balance.treasureTruffleUpgrades);
      actions.payCycles([context.floor], balance.treasureTrufflePayouts);
    },
    wizardsWaffle: (context) =>
      actions.upgrade(context.floors, balance.wizardsWaffleUpgrades),
    goldenFortuneCookie: (context) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.goldenFortuneCookieUpgrades,
      ),
    crystalDragonEgg: (context) =>
      actions.upgrade([context.floor], balance.crystalDragonEggUpgrades),
    diamondCompass: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.diamondCompassPayouts,
      ),
    emeraldCrown: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.emeraldCrownTierSteps,
        balance.emeraldCrownUpgrades,
      ),
    goldenFleece: (context) =>
      actions.payCycles(context.floors, balance.goldenFleecePayouts),
    imperialScepter: (context) =>
      actions.upgrade([highestFloor(context)], balance.imperialScepterUpgrades),
    rubyHeartRelic: (context) =>
      actions.payCycles([context.floor], balance.rubyHeartRelicPayouts),
    sapphireHourglass: (context) =>
      actions.payCycles(alternating(context), balance.sapphireHourglassPayouts),
    vaultOfJewels: (context) =>
      actions.upgrade(context.floors, balance.vaultOfJewelsUpgrades),
    goldenIdol: (context) =>
      actions.upgrade([context.floor], balance.goldenIdolUpgrades),
    emberwingDragon: (context) =>
      actions.upgrade([context.floor], balance.emberwingDragonUpgrades),
    moonlitKirin: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.moonlitKirinPayouts,
      ),
    pocketPhoenix: (context) =>
      actions.upgrade([context.floor], balance.pocketPhoenixUpgrades),
    crystalGriffin: (context) =>
      actions.payCycles(context.floors, balance.crystalGriffinPayouts),
    velvetManticore: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.velvetManticoreTierSteps,
        balance.velvetManticoreUpgrades,
      ),
    frostfangYeti: (context) =>
      actions.upgrade(context.floors, balance.frostfangYetiUpgrades),
    lanternKitsune: (context) =>
      actions.payCycles([context.floor], balance.lanternKitsunePayouts),
    coralSeaSerpent: (context) =>
      actions.payCycles([context.floor], balance.coralSeaSerpentPayouts),
    clockworkMinotaur: (context) =>
      actions.upgrade([context.floor], balance.clockworkMinotaurUpgrades),
    starryCerberus: (context) =>
      actions.upgrade(alternating(context), balance.starryCerberusUpgrades),
    goldenSphinx: (context) =>
      actions.upgrade([highestFloor(context)], balance.goldenSphinxUpgrades),
    mossbackTreant: (context) =>
      actions.upgrade(context.floors, balance.mossbackTreantUpgrades),
    rainbowAlicorn: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.rainbowAlicornPayouts,
      ),
    bogWitchFamiliar: (context) =>
      actions.upgrade([context.floor], balance.bogWitchFamiliarUpgrades),
    pearlHippocampus: (context) =>
      actions.payCycles([context.floor], balance.pearlHippocampusPayouts),
    thunderbirdChick: (context) =>
      actions.upgrade([context.floor], balance.thunderbirdChickUpgrades),
    obsidianBasilisk: (context) =>
      actions.upgrade([context.floor], balance.obsidianBasiliskUpgrades),
    cloudNymph: (context) =>
      actions.payCycles(context.floors, balance.cloudNymphPayouts),
    alchemyAtDusk: (context) =>
      actions.upgrade([context.floor], balance.alchemyAtDuskUpgrades),
    astropathAlleycat: (context) =>
      actions.payCycles(context.floors, balance.astropathAlleycatPayouts),
    bardOfTheBrokenLyre: (context) =>
      actions.payCycles([context.floor], balance.bardOfTheBrokenLyrePayouts),
    battleStandardBobcat: (context) =>
      actions.upgrade([context.floor], balance.battleStandardBobcatUpgrades),
    cathedralStarship: (context) =>
      actions.payCycles(context.floors, balance.cathedralStarshipPayouts),
    cursedCrownHunt: (context) =>
      actions.upgrade([context.floor], balance.cursedCrownHuntUpgrades),
    dreadnoughtWhisker: (context) =>
      actions.upgrade([context.floor], balance.dreadnoughtWhiskerUpgrades),
    elixirUnderMoonlight: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.elixirUnderMoonlightTierSteps,
        balance.elixirUnderMoonlightUpgrades,
      ),
    frostbiteTracker: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.frostbiteTrackerPayouts,
      ),
    ironpawVanguard: (context) =>
      actions.upgrade(context.floors, balance.ironpawVanguardUpgrades),
    lastStandLionheart: (context) =>
      actions.upgrade([context.floor], balance.lastStandLionheartUpgrades),
    meowchineBerserker: (context) =>
      actions.upgrade([context.floor], balance.meowchineBerserkerUpgrades),
    meowtallicanGunner: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.meowtallicanGunnerPayouts,
      ),
    midnightMonsterContract: (context) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.midnightMonsterContractUpgrades,
      ),
    moonlitWyvernHunt: (context) =>
      actions.payCycles([context.floor], balance.moonlitWyvernHuntPayouts),
    orbitalPounce: (context) =>
      actions.upgrade(context.floors, balance.orbitalPounceUpgrades),
    plasmaPurrgeon: (context) =>
      actions.upgrade([context.floor], balance.plasmaPurrgeonUpgrades),
    relicbladeRonin: (context) =>
      actions.upgrade([context.floor], balance.relicbladeRoninUpgrades),
    seaMonsterSlayer: (context) =>
      actions.payCycles([context.floor], balance.seaMonsterSlayerPayouts),
    silverclawSentinel: (context) =>
      actions.upgrade([context.floor], balance.silverclawSentinelUpgrades),
    starBastionCaptain: (context) =>
      actions.upgrade([context.floor], balance.starBastionCaptainUpgrades),
    tavernTactician: (context) =>
      actions.payCycles(context.floors, balance.tavernTacticianPayouts),
    theAntlerwoodStalker: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.theAntlerwoodStalkerTierSteps,
        balance.theAntlerwoodStalkerUpgrades,
      ),
    theCataclysmicChaplain: (context) =>
      actions.upgrade([context.floor], balance.theCataclysmicChaplainUpgrades),
    theGriffinContract: (context) =>
      actions.payCycles(
        [highestFloor(context)],
        balance.theGriffinContractPayouts,
      ),
    theSiegeScratcher: (context) =>
      actions.upgrade([context.floor], balance.theSiegeScratcherUpgrades),
    theWarpwayWatcher: (context) =>
      actions.payCycles(context.floors, balance.theWarpwayWatcherPayouts),
    theWhiteWhisker: (context) =>
      actions.upgrade([highestFloor(context)], balance.theWhiteWhiskerUpgrades),
    toxinclawInfiltrator: (context) =>
      actions.payCycles([context.floor], balance.toxinclawInfiltratorPayouts),
    voidclawVeteran: (context) =>
      actions.upgrade([context.floor], balance.voidclawVeteranUpgrades),
    voidshieldTemplar: (context) =>
      actions.upgrade(context.floors, balance.voidshieldTemplarUpgrades),
    wolfmarkWanderer: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.wolfmarkWandererPayouts,
      ),
    wolfpackFarewell: (context) =>
      actions.upgrade(context.floors, balance.wolfpackFarewellUpgrades),
    bloodlineOmen: (context) =>
      actions.upgrade([context.floor], balance.bloodlineOmenUpgrades),
    candleclawCatacomb: (context) =>
      actions.payCycles([context.floor], balance.candleclawCatacombPayouts),
    emberPawPatrol: (context) =>
      actions.upgrade(context.floors, balance.emberPawPatrolUpgrades),
    whiskerCoastSurvivor: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.whiskerCoastSurvivorPayouts,
      ),
    astapurrion: (context) =>
      actions.payCycles([context.floor], balance.astapurrionPayouts),
    astralclawSkyblade: (context) =>
      actions.upgrade([context.floor], balance.astralclawSkybladeUpgrades),
    drizztDoPurrden: (context) =>
      actions.upgrade(alternating(context), balance.drizztDoPurrdenUpgrades),
    elmiaowster: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.elmiaowsterTierSteps,
        balance.elmiaowsterUpgrades,
      ),
    elvenSongblade: (context) =>
      actions.payCycles(context.floors, balance.elvenSongbladePayouts),
    galepaw: (context) =>
      actions.payCycles(context.floors, balance.galepawPayouts),
    halsinpaw: (context) =>
      actions.upgrade(context.floors, balance.halsinpawUpgrades),
    hearthpawShadowagent: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.hearthpawShadowagentPayouts,
      ),
    imeown: (context) =>
      actions.upgrade([lowestLevel(context)], balance.imeownUpgrades),
    jaheirball: (context) =>
      actions.payCycles(alternating(context), balance.jaheirballPayouts),
    karlachonk: (context) =>
      actions.upgrade([context.floor], balance.karlachonkUpgrades),
    laezclaw: (context) =>
      actions.upgrade([context.floor], balance.laezclawUpgrades),
    minscAndMeow: (context) =>
      actions.upgrade(context.floors, balance.minscAndMeowUpgrades),
    sarevmeowk: (context) =>
      actions.upgrade([highestFloor(context)], balance.sarevmeowkUpgrades),
    shadowpurr: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.shadowpurrTierSteps,
        balance.shadowpurrUpgrades,
      ),
    theEmpurror: (context) =>
      actions.payCycles(context.floors, balance.theEmpurrorPayouts),
    thisIsTheEnd: (context) =>
      actions.upgrade([context.floor], balance.thisIsTheEndUpgrades),
    whiskerWyll: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.whiskerWyllPayouts,
      ),
    winkWink: (context) =>
      actions.upgrade([lowestLevel(context)], balance.winkWinkUpgrades),
    adamWhiskersen: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.adamWhiskersenTierSteps,
        balance.adamWhiskersenUpgrades,
      ),
    bankroll: (context) =>
      actions.upgrade([context.floor], balance.bankrollUpgrades),
    billBlizzard: (context) =>
      actions.payCycles(context.floors, balance.billBlizzardPayouts),
    bobPawge: (context) =>
      actions.upgrade(context.floors, balance.bobPawgeUpgrades),
    bullionStack: (context) =>
      actions.upgrade([context.floor], balance.bullionStackUpgrades),
    cashCannon: (context) =>
      actions.upgrade(alternating(context), balance.cashCannonUpgrades),
    fairExchange: (context) =>
      actions.payCycles(alternating(context), balance.fairExchangePayouts),
    gemMine: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.gemMineUpgrades,
      ),
    goldMine: (context) =>
      actions.payCycles([highestFloor(context)], balance.goldMinePayouts),
    goldenChalice: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.goldenChaliceTierSteps,
        balance.goldenChaliceUpgrades,
      ),
    goldenGoose: (context) =>
      actions.payCycles(context.floors, balance.goldenGoosePayouts),
    goldenStag: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.goldenStagPayouts,
      ),
    handsomeJake: (context) =>
      actions.upgrade([highestFloor(context)], balance.handsomeJakeUpgrades),
    jcDentclaw: (context) =>
      actions.upgrade([context.floor], balance.jcDentclawUpgrades),
    liquidAssets: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.liquidAssetsPayouts,
      ),
    midasTouch: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.midasTouchTierSteps,
        balance.midasTouchUpgrades,
      ),
    moneyPrinter: (context) =>
      actions.upgrade(context.floors, balance.moneyPrinterUpgrades),
    moneyTree: (context) =>
      actions.payCycles(context.floors, balance.moneyTreePayouts),
    nuggetAvalanche: (context) =>
      actions.payCycles([context.floor], balance.nuggetAvalanchePayouts),
    pennyJar: (context) =>
      actions.upgrade([lowestLevel(context)], balance.pennyJarUpgrades),
    purrDenton: (context) =>
      actions.upgrade([lowestLevel(context)], balance.purrDentonUpgrades),
    strikeItRich: (context) =>
      actions.upgrade([highestFloor(context)], balance.strikeItRichUpgrades),
    vaultDoor: (context) =>
      actions.upgrade(context.floors, balance.vaultDoorUpgrades),
    wishingWell: (context) =>
      actions.payCycles([context.floor], balance.wishingWellPayouts),
    youKnowWhatStallion: (context) =>
      actions.upgrade(
        alternating(context),
        balance.youKnowWhatStallionUpgrades,
      ),
    annaNyavarre: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.annaNyavarrePayouts,
      ),
    batteryCell: (context) =>
      actions.upgrade([lowestLevel(context)], balance.batteryCellUpgrades),
    blackBlade: (context) =>
      actions.upgrade([context.floor], balance.blackBladeUpgrades),
    boneFlute: (context) =>
      actions.payCycles(alternating(context), balance.boneFlutePayouts),
    coldSteel: (context) =>
      actions.upgrade([context.floor], balance.coldSteelUpgrades),
    commando: (context) =>
      actions.upgrade([context.floor], balance.commandoUpgrades),
    corvidCrown: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.corvidCrownTierSteps,
        balance.corvidCrownUpgrades,
      ),
    daedalynx: (context) =>
      actions.payCycles(context.floors, balance.daedalynxPayouts),
    dataCube: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.dataCubeUpgrades,
      ),
    dropTuned: (context) =>
      actions.upgrade(alternating(context), balance.dropTunedUpgrades),
    eternalFlame: (context) =>
      actions.payCycles([context.floor], balance.eternalFlamePayouts),
    forgeAhead: (context) =>
      actions.upgrade(context.floors, balance.forgeAheadUpgrades),
    guntherHairman: (context) =>
      actions.upgrade([context.floor], balance.guntherHairmanUpgrades),
    heliopaws: (context) =>
      actions.upgrade(context.floors, balance.heliopawsUpgrades),
    hornsUp: (context) =>
      actions.upgrade([highestFloor(context)], balance.hornsUpUpgrades),
    ironKey: (context) =>
      actions.upgrade([lowestLevel(context)], balance.ironKeyUpgrades),
    lastCall: (context) =>
      actions.payCycles([context.floor], balance.lastCallPayouts),
    nanoBlade: (context) =>
      actions.upgrade([context.floor], balance.nanoBladeUpgrades),
    peltCloak: (context) =>
      actions.upgrade(alternating(context), balance.peltCloakUpgrades),
    pigIron: (context) =>
      actions.upgrade(context.floors, balance.pigIronUpgrades),
    praxisKit: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.praxisKitTierSteps,
        balance.praxisKitUpgrades,
      ),
    quickSilver: (context) =>
      actions.payCycles(alternating(context), balance.quickSilverPayouts),
    runicAmulet: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.runicAmuletTierSteps,
        balance.runicAmuletUpgrades,
      ),
    scaledGrip: (context) =>
      actions.upgrade([context.floor], balance.scaledGripUpgrades),
    securityTurret: (context) =>
      actions.payCycles([highestFloor(context)], balance.securityTurretPayouts),
    shoulderSpikes: (context) =>
      actions.upgrade(context.floors, balance.shoulderSpikesUpgrades),
    shredMetal: (context) =>
      actions.upgrade([highestFloor(context)], balance.shredMetalUpgrades),
    signetOfSkulls: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.signetOfSkullsTierSteps,
        balance.signetOfSkullsUpgrades,
      ),
    stormFork: (context) =>
      actions.payCycles(context.floors, balance.stormForkPayouts),
    studdedBelt: (context) =>
      actions.upgrade([lowestLevel(context)], balance.studdedBeltUpgrades),
    swashbuckler: (context) =>
      actions.payCycles(alternating(context), balance.swashbucklerPayouts),
    tempered: (context) =>
      actions.upgrade([highestFloor(context)], balance.temperedUpgrades),
    theCure: (context) =>
      actions.payCycles([context.floor], balance.theCurePayouts),
    titaniumGrip: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.titaniumGripPayouts,
      ),
    wardingSigil: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.wardingSigilUpgrades,
      ),
    blackHole: (context) =>
      actions.payCycles(context.floors, balance.blackHolePayouts),
    bottledNebula: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.bottledNebulaTierSteps,
        balance.bottledNebulaUpgrades,
      ),
    eclipse: (context) =>
      actions.upgrade([highestFloor(context)], balance.eclipseUpgrades),
    treasureMap: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.treasureMapPayouts,
      ),
    captainLeFluff: (context) =>
      actions.upgrade([highestFloor(context)], balance.captainLeFluffUpgrades),
    divingBell: (context) =>
      actions.upgrade(cascadeDown(context), balance.divingBellUpgrades),
    flooringInspector: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.flooringInspectorUpgrades,
      ),
    kraken: (context) =>
      actions.payCycles(context.floors, balance.krakenPayouts),
    messageInABottle: (context) =>
      actions.upgrade([lowestLevel(context)], balance.messageInABottleUpgrades),
    bullseye: (context) =>
      actions.upgrade([lowestLevel(context)], balance.bullseyeUpgrades),
    chainReaction: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.chainReactionUpgrades,
      ),
    doubleHelix: (context) =>
      actions.upgrade(alternating(context), balance.doubleHelixUpgrades),
    eureka: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.eurekaTierSteps,
        balance.eurekaUpgrades,
      ),
    goldMedal: (context) =>
      actions.payCycles([context.floor], balance.goldMedalPayouts),
    halfLife: (context) =>
      actions.payCycles(context.floors, balance.halfLifePayouts),
    highRoller: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.highRollerPayouts,
      ),
    jackpot: (context) =>
      actions.upgrade(context.floors, balance.jackpotUpgrades),
    knockout: (context) =>
      actions.upgrade([context.floor], balance.knockoutUpgrades),
    pearlDiver: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.pearlDiverPayouts,
      ),
    roundAndRound: (context) =>
      actions.payCycles(alternating(context), balance.roundAndRoundPayouts),
    scratchCard: (context) =>
      actions.payCycles([context.floor], balance.scratchCardPayouts),
    silverware: (context) =>
      actions.upgrade([highestFloor(context)], balance.silverwareUpgrades),
    snakeEyes: (context) =>
      actions.payCycles([highestFloor(context)], balance.snakeEyesPayouts),
    twentyOne: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.twentyOneUpgrades,
      ),
    wheelOfFortune: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.wheelOfFortuneTierSteps,
        balance.wheelOfFortuneUpgrades,
      ),
    aetherLantern: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.aetherLanternUpgrades,
      ),
    boilerRoom: (context) =>
      actions.upgrade([lowestLevel(context)], balance.boilerRoomUpgrades),
    brassDiver: (context) =>
      actions.payCycles([context.floor], balance.brassDiverPayouts),
    clockworkHand: (context) =>
      actions.upgrade(alternating(context), balance.clockworkHandUpgrades),
    cogwork: (context) =>
      actions.payCycles(context.floors, balance.cogworkPayouts),
    fullSteam: (context) =>
      actions.upgrade(context.floors, balance.fullSteamUpgrades),
    pocketWatch: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.pocketWatchPayouts,
      ),
    tubeDelivery: (context) =>
      actions.upgrade([highestFloor(context)], balance.tubeDeliveryUpgrades),
    windUp: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.windUpTierSteps,
        balance.windUpUpgrades,
      ),
    ancientRelic: (context) =>
      actions.payCycles([context.floor], balance.ancientRelicPayouts),
    geometricRelic: (context) =>
      actions.payCycles([context.floor], balance.geometricRelicPayouts),
    berryParfait: (context) =>
      actions.payCycles(context.floors, balance.berryParfaitPayouts),
    berrySmoothie: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.berrySmoothiePayouts,
      ),
    butterCroissant: (context) =>
      actions.upgrade([context.floor], balance.butterCroissantUpgrades),
    cheeseWheel: (context) =>
      actions.payCycles([context.floor], balance.cheeseWheelPayouts),
    chromeArm: (context) =>
      actions.upgrade([context.floor], balance.chromeArmUpgrades),
    circuitBreaker: (context) =>
      actions.upgrade([context.floor], balance.circuitBreakerUpgrades),
    glassWyvern: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.glassWyvernPayouts,
      ),
    goldBar: (context) =>
      actions.payCycles(context.floors, balance.goldBarPayouts),
    honeyToast: (context) =>
      actions.upgrade([lowestLevel(context)], balance.honeyToastUpgrades),
    potionCommotion: (context) =>
      actions.payCycles([context.floor], balance.potionCommotionPayouts),
    lemonTart: (context) =>
      actions.upgrade([highestFloor(context)], balance.lemonTartUpgrades),
    lifelineLoot: (context) =>
      actions.upgrade([context.floor], balance.lifelineLootUpgrades),
    moonCloak: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.moonCloakUpgrades,
      ),
    mossbackManticore: (context) =>
      actions.payCycles(context.floors, balance.mossbackManticorePayouts),
    platinumRing: (context) =>
      actions.upgrade([context.floor], balance.platinumRingUpgrades),
    sapphireOrbit: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.sapphireOrbitTierSteps,
        balance.sapphireOrbitUpgrades,
      ),
    roboticGripper: (context) =>
      actions.upgrade([context.floor], balance.roboticGripperUpgrades),
    silverCoin: (context) =>
      actions.payCycles(alternating(context), balance.silverCoinPayouts),
    spicedChai: (context) =>
      actions.payCycles([context.floor], balance.spicedChaiPayouts),
    stormBoots: (context) =>
      actions.upgrade(alternating(context), balance.stormBootsUpgrades),
    sushiPlatter: (context) =>
      actions.payCycles(alternating(context), balance.sushiPlatterPayouts),
    thornmailGlove: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.thornmailGloveTierSteps,
        balance.thornmailGloveUpgrades,
      ),
    gildedCache: (context) =>
      actions.upgrade(context.floors, balance.gildedCacheUpgrades),
    berryShortcake: (context) =>
      actions.payCycles([context.floor], balance.berryShortcakePayouts),
    brassBanker: (context) =>
      actions.upgrade([lowestLevel(context)], balance.brassBankerUpgrades),
    candyCastle: (context) =>
      actions.payCycles(context.floors, balance.candyCastlePayouts),
    caramelApple: (context) =>
      actions.upgrade([context.floor], balance.caramelAppleUpgrades),
    catnipSatchel: (context) =>
      actions.payCycles([highestFloor(context)], balance.catnipSatchelPayouts),
    cinnamonSwirl: (context) =>
      actions.upgrade(alternating(context), balance.cinnamonSwirlUpgrades),
    citrusCoin: (context) =>
      actions.payCycles(alternating(context), balance.citrusCoinPayouts),
    clockworkSatellite: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.clockworkSatelliteUpgrades,
      ),
    coinCascade: (context) =>
      actions.payCycles(context.floors, balance.coinCascadePayouts),
    comfortFood: (context) =>
      actions.upgrade([lowestLevel(context)], balance.comfortFoodUpgrades),
    crownHedgehog: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.crownHedgehogTierSteps,
        balance.crownHedgehogUpgrades,
      ),
    emberKey: (context) =>
      actions.upgrade([context.floor], balance.emberKeyUpgrades),
    emberwingDragon2: (context) =>
      actions.payCycles([context.floor], balance.emberwingDragon2Payouts),
    emperorsFinest: (context) =>
      actions.payCycles(context.floors, balance.emperorsFinestPayouts),
    eternalDuty: (context) =>
      actions.upgrade(context.floors, balance.eternalDutyUpgrades),
    faithIsOurShield: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.faithIsOurShieldTierSteps,
        balance.faithIsOurShieldUpgrades,
      ),
    fearNotThePsyker: (context) =>
      actions.payCycles([context.floor], balance.fearNotThePsykerPayouts),
    frostRune: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.frostRuneUpgrades,
      ),
    lanternFox: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.lanternFoxPayouts,
      ),
    lanternLynx: (context) =>
      actions.upgrade([lowestLevel(context)], balance.lanternLynxUpgrades),
    memoryCrystal: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.memoryCrystalTierSteps,
        balance.memoryCrystalUpgrades,
      ),
    mochaFroth: (context) =>
      actions.payCycles([context.floor], balance.mochaFrothPayouts),
    coinrootGrove: (context) =>
      actions.upgrade(context.floors, balance.coinrootGroveUpgrades),
    neonBeaker: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.neonBeakerPayouts,
      ),
    neverSurrender: (context) =>
      actions.upgrade([context.floor], balance.neverSurrenderUpgrades),
    pearlOtter: (context) =>
      actions.payCycles([context.floor], balance.pearlOtterPayouts),
    pickleParade: (context) =>
      actions.upgrade([lowestLevel(context)], balance.pickleParadeUpgrades),
    profitPigeon: (context) =>
      actions.payCycles(alternating(context), balance.profitPigeonPayouts),
    purge: (context) => actions.upgrade([context.floor], balance.purgeUpgrades),
    rainbowRelic: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.rainbowRelicTierSteps,
        balance.rainbowRelicUpgrades,
      ),
    ramenCrown: (context) =>
      actions.payCycles(context.floors, balance.ramenCrownPayouts),
    redPanda: (context) =>
      actions.upgrade(alternating(context), balance.redPandaUpgrades),
    silverLaurel: (context) =>
      actions.payCycles([highestFloor(context)], balance.silverLaurelPayouts),
    thunderNachos: (context) =>
      actions.upgrade(context.floors, balance.thunderNachosUpgrades),
    toTheSkies: (context) =>
      actions.upgrade([highestFloor(context)], balance.toTheSkiesUpgrades),
    treasureTeapot: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.treasureTeapotPayouts,
      ),
    whatAreYourOrders: (context) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.whatAreYourOrdersUpgrades,
      ),
    whisperingOrb: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.whisperingOrbTierSteps,
        balance.whisperingOrbUpgrades,
      ),
    clockworkOwl: (context) =>
      actions.upgrade([context.floor], balance.clockworkOwlUpgrades),
    goldenGardenGolem: (context) =>
      actions.payCycles(context.floors, balance.goldenGardenGolemPayouts),
    moonlitMint: (context) =>
      actions.payCycles(alternating(context), balance.moonlitMintPayouts),
    vaultBeetle: (context) =>
      actions.upgrade([context.floor], balance.vaultBeetleUpgrades),
    lionKey: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.lionKeyTierSteps,
        balance.lionKeyUpgrades,
      ),
    restorationProject: (context) =>
      actions.upgrade([context.floor], balance.restorationProjectUpgrades),
  } satisfies Record<FeaturedCritKind, (context: CritRewardContext) => void>;
}
