import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";
import { nextCritTier, type FeaturedCritKind } from "../../shared/critTypes";
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
      actions.upgrade(
        context.floors,
        balance.theFellowshipOfTheBlingUpgrades,
      );
      actions.payCycles(
        context.floors,
        balance.theFellowshipOfTheBlingPayouts,
      );
    },
    theGreatCatsby: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.theGreatCatsbyTierSteps,
        balance.theGreatCatsbyUpgrades,
      ),
    theLordOfTheRingBinders: (context) =>
      actions.upgrade(
        [context.floor],
        balance.theLordOfTheRingBindersUpgrades,
      ),
  } satisfies Record<FeaturedCritKind, (context: CritRewardContext) => void>;
}
