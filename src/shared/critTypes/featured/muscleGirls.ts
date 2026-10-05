import type { MUSCLE_GIRLS_CRITS } from "../../critData/muscleGirls";
import type { FeaturedRewards } from "./types";

export const MUSCLE_GIRLS_REWARDS = {
  barbellBelle: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  ponytailPress: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.ponytailPressBoostSeconds,
      balance.ponytailPressExtraWorkers,
    ),
  leotardLuster: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.leotardLusterPayouts),
  glitterGrip: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  bicepBombshell: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.bicepBombshellTierSteps,
      balance.bicepBombshellUpgrades,
    ),
  curlCutie: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  kissTheGuns: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.kissTheGunsPayouts,
    ),
  deadliftDiva: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.deadliftDivaFloors),
  goldPlated: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldPlatedSeconds),
  hipHingeHeroine: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.hipHingeHeroineContinueChance,
    ),
  dumbbellDarling: (context, { actions, balance, cheapest }) =>
    actions.payCycles([cheapest(context)], balance.dumbbellDarlingPayouts),
  flexAppeal: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.flexAppealFloors),
  coinFlexer: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.coinFlexerSeconds),
  gymCrush: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.gymCrushBoostSeconds,
      balance.gymCrushExtraWorkers,
    ),
  ironHeartthrob: (context, { balance, promoteAndUpgrade, selectByRate }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.ironHeartthrobTierSteps,
      balance.ironHeartthrobUpgrades,
    ),
  pointTaken: (context, { actions, balance, hereAnd, highestFloor }) =>
    actions.payCycles(
      hereAnd(context, highestFloor(context)),
      balance.pointTakenPayouts,
    ),
  inkedApproval: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.inkedApprovalContinueChance),
  leatherFlex: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.leatherFlexContinueChance),
  kettlebellKiss: (context, { actions, balance, lowestLevel }) =>
    actions.payCycles([lowestLevel(context)], balance.kettlebellKissPayouts),
  swingAndASmooch: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  muscleMommy: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.muscleMommyBoostSeconds,
      balance.muscleMommyExtraWorkers,
    ),
  kneelingKnockout: (context, { balance, lowestLevel, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.kneelingKnockoutTierSteps,
      balance.kneelingKnockoutUpgrades,
    ),
  peachyKeen: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.peachyKeenDiscount),
  gluteGains: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.gluteGainsFloors),
  headbandHustle: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  outOfTheBlue: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.outOfTheBlueContinueChance),
  proteinPrincess: (context, { balance, highestFloor, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      highestFloor(context),
      balance.proteinPrincessTierSteps,
      balance.proteinPrincessUpgrades,
    ),
  shakerSovereign: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.shakerSovereignBoostSeconds,
      balance.shakerSovereignExtraWorkers,
    ),
  crownedChug: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.crownedChugBoostSeconds,
      balance.crownedChugExtraWorkers,
    ),
  pumpAndPout: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.pumpAndPoutBoostSeconds,
      balance.pumpAndPoutExtraWorkers,
    ),
  neonFlex: (context, { balance, cheapest, upgradeAndPay }) =>
    upgradeAndPay(
      [cheapest(context)],
      balance.neonFlexUpgrades,
      balance.neonFlexPayouts,
    ),
  sixPackSweetheart: (context, { actions }) => actions.hireManagers(context.floors),
  absOfHearts: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.absOfHeartsFloors),
  spottersWink: (context, { actions, balance, cheapest, hereAnd }) =>
    actions.payCycles(
      hereAnd(context, cheapest(context)),
      balance.spottersWinkPayouts,
    ),
  rackAndReady: (context, { actions, balance, cheapest, hereAnd }) =>
    actions.upgrade(
      hereAnd(context, cheapest(context)),
      balance.rackAndReadyUpgrades,
    ),
  overheadOkay: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.overheadOkayBoostSeconds,
      balance.overheadOkayExtraWorkers,
    ),
  squatSiren: (context, { balance, cheapest, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      cheapest(context),
      balance.squatSirenTierSteps,
      balance.squatSirenUpgrades,
    ),
  deepSquatDazzle: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.deepSquatDazzleDiscount),
  sumoSweetie: (context, { balance, lowestLevel, upgradeAndPay }) =>
    upgradeAndPay(
      [lowestLevel(context)],
      balance.sumoSweetieUpgrades,
      balance.sumoSweetiePayouts,
    ),
  copperCrouch: (context, { balance, belowAndHere, upgradeAndPay }) =>
    upgradeAndPay(
      belowAndHere(context),
      balance.copperCrouchUpgrades,
      balance.copperCrouchPayouts,
    ),
  bluePlateSpecial: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.bluePlateSpecialFloors),
  barbellBow: (context, { balance, highestFloor, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      highestFloor(context),
      balance.barbellBowTierSteps,
      balance.barbellBowUpgrades,
    ),
  soleMate: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.soleMateUpgrades),
  toeTapper: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.toeTapperPayouts),
  heelAppeal: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  solePower: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.solePowerBoostSeconds,
      balance.solePowerExtraWorkers,
    ),
  tiptoeTitan: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.tiptoeTitanTierSteps,
      balance.tiptoeTitanUpgrades,
    ),
  footloose: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.footloosePayouts),
  tenLittlePiggies: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.tenLittlePiggiesFloors),
  pedicurePinup: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.pedicurePinupDiscount),
  wiggleRoom: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.wiggleRoomPayouts),
  cozyToes: (context, { actions, balance, lowestLevel }) =>
    actions.payCycles([lowestLevel(context)], balance.cozyToesPayouts),
  barefootBoss: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  kickBackQueen: (context, { balance, upgradeAndPay }) =>
    upgradeAndPay(
      context.floors,
      balance.kickBackQueenUpgrades,
      balance.kickBackQueenPayouts,
    ),
  bendOverBackwards: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bendOverBackwardsDiscount),
  downwardDogDays: (context, { actions, balance, belowAndHere }) =>
    actions.payCycles(belowAndHere(context), balance.downwardDogDaysPayouts),
  plankYouVeryMuch: (context, { actions, balance, highestFloor }) =>
    actions.upgrade(
      [highestFloor(context)],
      balance.plankYouVeryMuchUpgrades,
    ),
  namasteSlay: (context, { balance, promoteAndUpgrade, selectByRate }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.namasteSlayTierSteps,
      balance.namasteSlayUpgrades,
    ),
  mightyOak: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.mightyOakPayouts),
  savasanaSiesta: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.savasanaSiestaContinueChance),
  catCowCrawl: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.catCowCrawlDiscount),
  lizardLounge: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.lizardLoungeContinueChance),
  blondeAmbition: (context, { actions, balance, highestFloor }) =>
    actions.payCycles([highestFloor(context)], balance.blondeAmbitionPayouts),
  bigFootEnergy: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.bigFootEnergyTierSteps,
      balance.bigFootEnergyUpgrades,
    ),
  tickleMePink: (context, { balance, upgradeAndPay }) =>
    upgradeAndPay(
      [context.floor],
      balance.tickleMePinkUpgrades,
      balance.tickleMePinkPayouts,
    ),
  galaTootsies: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  redCarpetStomp: (context, { balance, promoteAndUpgrade, selectByRate }) =>
    promoteAndUpgrade(
      selectByRate(context, false),
      balance.redCarpetStompTierSteps,
      balance.redCarpetStompUpgrades,
    ),
  backDayBeauty: (context, { actions, balance, hereAnd, selectByRate }) =>
    actions.upgrade(
      hereAnd(context, selectByRate(context, false)),
      balance.backDayBeautyUpgrades,
    ),
  putYourFeetUp: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.putYourFeetUpContinueChance),
  highTen: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.highTenDiscount),
  legsForDays: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.legsForDaysContinueChance),
  toeTheLine: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.toeTheLineDiscount),
  melonPicnic: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(
      alternating(context),
      Math.floor(topLevel(context) / 2),
    ),
  juicePress: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.juicePressBoostSeconds,
      balance.juicePressExtraWorkers,
    ),
  rindBreaker: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.rindBreakerFloors),
  seedStorm: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.seedStormContinueChance),
  priceSqueeze: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.priceSqueezeDiscount),
  farmhandFlex: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.farmhandFlexWorkers),
  prizeHeifer: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.prizeHeiferTierSteps,
      balance.prizeHeiferUpgrades,
    ),
  barnBuster: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.barnBusterFloors),
  belowParallel: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.belowParallelBoostSeconds,
      balance.belowParallelExtraWorkers,
    ),
  deepSquatDividend: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.deepSquatDividendWorkers);
    actions.hireManagers(context.floors);
  },
  heelDrive: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.heelDriveContinueChance),
  legDayLedger: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.legDayLedgerTierSteps,
      balance.legDayLedgerUpgrades,
    ),
  plantarPower: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.plantarPowerDiscount),
  posteriorChainProfits: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.posteriorChainProfitsShare),
  rackPullRiches: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  rockBottomRally: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.rockBottomRallyFloors),
  squatGoals: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  tiptoeTreasury: (context, { actions }) => actions.armCrit(context.floors, "crit"),
  quicksilverQueen: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.quicksilverQueenDiscount),
  moolahMaker: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.moolahMakerShare),
  spotOn: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.spotOnBoostSeconds,
      balance.spotOnExtraWorkers,
    ),
  ringMyBell: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.ringMyBellWorkers);
    actions.hireManagers(context.floors);
  },
  mirrorFinish: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "up",
      balance.mirrorFinishContinueChance,
    ),
  tillTheCowsComeHome: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.tillTheCowsComeHomeTierSteps,
      balance.tillTheCowsComeHomeUpgrades,
    ),
  sumoStanceStocks: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  purrFectPair: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.purrFectPairTierSteps,
      balance.purrFectPairUpgrades,
    ),
  doubleTrouble: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.doubleTroubleDiscount),
  copycats: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.copycatsShare),
  ringsideRuby: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.ringsideRubyShare),
  knockoutNova: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.knockoutNovaBoostSeconds,
      balance.knockoutNovaExtraWorkers,
    ),
  clinchQueen: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.clinchQueenContinueChance),
  braidedBruiser: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.braidedBruiserDiscount),
  backSquatBounty: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.backSquatBountyBoostSeconds,
      balance.backSquatBountyExtraWorkers,
    ),
  doubleBicepBonanza: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "up",
      balance.doubleBicepBonanzaContinueChance,
    ),
  hellfireHug: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.hellfireHugDiscount),
  kneelDeal: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kneelDealShare),
  hornedHeartbreakers: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.hornedHeartbreakersBoostSeconds,
      balance.hornedHeartbreakersExtraWorkers,
    ),
  shoulderDevilDuo: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.shoulderDevilDuoBoostSeconds,
      balance.shoulderDevilDuoExtraWorkers,
    ),
  goblinGluteGains: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.goblinGluteGainsDiscount),
  lowSquatLoot: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.lowSquatLootShare),
  squatQueenCapital: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.squatQueenCapitalBoostSeconds,
      balance.squatQueenCapitalExtraWorkers,
    ),
  bunAndBurn: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bunAndBurnDiscount),
  quadSquadQuarterly: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.quadSquadQuarterlyShare),
  bearHugBonus: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.bearHugBonusPayouts),
  bottomLine: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bottomLineShare),
  crushingQuarter: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.crushingQuarterPayouts),
  floorPlan: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.floorPlanUpgrades),
  hostileTakeover: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.hostileTakeoverUpgrades),
  knockoutProfits: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.knockoutProfitsShare),
  lastOneStanding: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.lastOneStandingUpgrades),
  leveragedBuyout: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.leveragedBuyoutUpgrades),
  marketDominance: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.marketDominanceUpgrades),
  pinnedPayday: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.pinnedPaydayPayouts),
  poundForPound: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.poundForPoundPayouts),
  tapOutTycoon: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.tapOutTycoonUpgrades),
  winnerTakesAll: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.winnerTakesAllShare),
  gymBuddyBudget: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.gymBuddyBudgetShare),
  backToBackBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.backToBackBonusPayouts),
  backupPlan: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.backupPlanUpgrades),
  flexAppealFunds: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.flexAppealFundsShare),
  handsOnHipsHoldings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.handsOnHipsHoldingsShare),
  pocketRocketPayday: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.pocketRocketPaydayPayouts),
  shoulderToShoulderShares: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shoulderToShoulderSharesShare),
  tealDeal: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tealDealPayouts),
  trioTrustFund: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.trioTrustFundShare),
  gingerPaycheck: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.gingerPaycheckPayouts),
  threeWaySplit: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.threeWaySplitShare),
  blowAKissBudget: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blowAKissBudgetShare),
  blueKissBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.blueKissBonusPayouts),
  doubleKissDeposit: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.doubleKissDepositPayouts),
  duoKissDividend: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.duoKissDividendPayouts),
  farewellKissFund: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.farewellKissFundShare),
  kissKissCapital: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kissKissCapitalShare),
  kissMarkProfit: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kissMarkProfitShare),
  kissYourMoneyHello: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.kissYourMoneyHelloPayouts),
  pointedProfits: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pointedProfitsShare),
  rainbowKissRebate: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rainbowKissRebateShare),
  sealedKissCheck: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.sealedKissCheckPayouts),
  smoochStipend: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.smoochStipendPayouts),
  sunnySmoochShares: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.sunnySmoochSharesSeconds),
  twinSmoochSavings: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.twinSmoochSavingsSeconds),
  pixieKissPaycheck: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.pixieKissPaycheckPayouts),
  smoochSalary: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.smoochSalaryPayouts),
  ballgownBullion: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.ballgownBullionPayouts),
  coutureCapital: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.coutureCapitalSeconds),
  emeraldEarnings: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.emeraldEarningsSeconds),
  goldBeltBudget: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldBeltBudgetSeconds),
  platinumPortfolio: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.platinumPortfolioSeconds),
  redDressReserve: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.redDressReservePayouts),
  ruffleReturns: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.ruffleReturnsPayouts),
  runwayRevenue: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.runwayRevenuePayouts),
  silverScreenShares: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.silverScreenSharesSeconds),
  thighHighYield: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.thighHighYieldSeconds),
  updoUpside: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.updoUpsidePayouts),
  bigHairPout: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bigHairPoutSeconds),
  blushingPucker: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.blushingPuckerPayouts),
  peckPlease: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.peckPleasePayouts),
  lipService: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.lipServiceSeconds),
  candyLips: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.candyLipsSeconds),
  kissCurl: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.kissCurlSeconds),
  kissyFace: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.kissyFaceSeconds),
  greenKisser: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.greenKisserPayouts),
  lipGlossGrin: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.lipGlossGrinPayouts),
  hotLips: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.hotLipsSeconds),
  mwahaha: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.mwahahaPayouts),
  mostKissable: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.mostKissableSeconds),
  puckerUp: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.puckerUpPayouts),
  redHotKiss: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.redHotKissPayouts),
  bedroomEyes: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bedroomEyesSeconds),
  airKiss: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.airKissPayouts),
  xoxo: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.xoxoSeconds),
  sugarKiss: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.sugarKissSeconds),
  tenderLips: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tenderLipsPayouts),
  beeStungLips: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.beeStungLipsSeconds),
  winkAndAKiss: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.winkAndAKissPayouts),
  selfLove: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.selfLovePayouts),
  crouchingKiss: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.crouchingKissSeconds),
  baldAndBold: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.baldAndBoldUpgrades),
  bigShoulderEnergy: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.bigShoulderEnergyMultiple),
  blueStreak: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.blueStreakGrowth),
  cameoAppearance: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.cameoAppearanceUpgrades),
  cheekyGoblin: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.cheekyGoblinMultiple),
  chinUp: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.chinUpGrowth),
  cleanSlate: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.cleanSlateUpgrades),
  evergreenGains: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.evergreenGainsMultiple),
  forestFlirt: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.forestFlirtGrowth),
  goblinSmirk: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goblinSmirkUpgrades),
  goldenHoops: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.goldenHoopsMultiple),
  ivoryTower: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.ivoryTowerGrowth),
  lipNibble: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.lipNibbleUpgrades),
  mohawkMwah: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.mohawkMwahMultiple),
  overallWinner: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.overallWinnerGrowth),
  pointedLook: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pointedLookUpgrades),
  silverBraid: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.silverBraidMultiple),
  splitDecision: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.splitDecisionGrowth),
  strappedForCash: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.strappedForCashUpgrades),
  olivePout: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.olivePoutMultiple),
  axeDeduction: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.axeDeductionMultiple),
  chopChop: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.chopChopGrowth),
  norseCode: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.norseCodeUpgrades),
  plunderPose: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.plunderPoseMultiple),
  raidDay: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.raidDayGrowth),
  shieldMaiden: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.shieldMaidenUpgrades),
  valhallaVenture: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.valhallaVentureMultiple),
  redheadHug: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.redheadHugUpgrades),
  blueBobNuzzle: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.blueBobNuzzleMultiple),
  curlyCuddle: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.curlyCuddleGrowth),
  leanOnMe: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.leanOnMeUpgrades),
  pinkPowerhouses: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkPowerhousesMultiple),
  ravenSnuggle: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.ravenSnuggleGrowth),
  sereneSqueeze: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.sereneSqueezeUpgrades),
  orcMatronHomage: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.orcMatronHomageMultiple),
  swimsuitVenus: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.swimsuitVenusGrowth),
  calfKissPilgrim: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.calfKissPilgrimUpgrades),
  goldenBraidIdol: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.goldenBraidIdolMultiple),
  goblinAcolyte: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.goblinAcolyteGrowth),
  greenLeggingsGenuflect: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.greenLeggingsGenuflectUpgrades),
  adoringGaze: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.adoringGazeMultiple),
  kneepadOrcSovereign: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.kneepadOrcSovereignGrowth),
  loinclothDeity: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.loinclothDeityUpgrades),
  mountainGoddess: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.mountainGoddessMultiple),
  armoredOrcIdol: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.armoredOrcIdolGrowth),
  royalHandKiss: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.royalHandKissUpgrades),
  pinkBootsPraise: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkBootsPraiseMultiple),
  buzzcutTitaness: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.buzzcutTitanessGrowth),
  pinkTopPedestal: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.pinkTopPedestalUpgrades),
  purpleLeggingsReverence: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.purpleLeggingsReverenceMultiple),
  marbleAbsVigil: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.marbleAbsVigilGrowth),
  seatedEmpress: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.seatedEmpressUpgrades),
  flexSwoon: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.flexSwoonMultiple),
  tealTribute: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tealTributeGrowth),
  thunderThighHymn: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.thunderThighHymnUpgrades),
  sculptedLegDevotee: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.sculptedLegDevoteeGrowth),
  gildedMuscleBow: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.gildedMuscleBowUpgrades),
  washboardKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.washboardKissGrowth),
  armsCrossedGoddess: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.armsCrossedGoddessUpgrades),
  twinThighDevotion: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.twinThighDevotionMultiple),
  leotardDivinity: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.leotardDivinityGrowth),
  bronzeAbsShrine: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bronzeAbsShrineUpgrades),
  cherryTopColossus: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.cherryTopColossusMultiple),
  coralCropVeneration: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.coralCropVenerationGrowth),
  creamCropAbs: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.creamCropAbsUpgrades),
  crimsonCoreAwe: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.crimsonCoreAweMultiple),
  prostratePilgrims: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.prostratePilgrimsGrowth),
  pillarLegsPraise: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pillarLegsPraiseUpgrades),
  platinumAmazon: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.platinumAmazonMultiple),
  absAltar: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.absAltarGrowth),
  navySanctum: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.navySanctumUpgrades),
  bentKneeOath: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.bentKneeOathMultiple),
  plumMatriarch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.plumMatriarchGrowth),
  bowingBeforeBeauty: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.bowingBeforeBeautyUpgrades),
  redLeggingsRapture: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.redLeggingsRaptureMultiple),
  bellyBlessing: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bellyBlessingGrowth),
  giantessSanctuary: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.giantessSanctuaryUpgrades),
  ponytailPriestess: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.ponytailPriestessMultiple),
  sunsetCongregation: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.sunsetCongregationGrowth),
  quadTemple: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.quadTempleUpgrades),
  aquaShortsMuse: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.aquaShortsMuseMultiple),
  twinHandOffering: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.twinHandOfferingGrowth),
  waistWorship: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.waistWorshipUpgrades),
  pinkTightsPowerhouse: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.pinkTightsPowerhouseMultiple),
  rainbowShortsShrine: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.rainbowShortsShrineGrowth),
  sunnyDivaAltar: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.sunnyDivaAltarUpgrades),
  emeraldTopAdoration: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.emeraldTopAdorationMultiple),
  quadricepPrayer: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.quadricepPrayerGrowth),
  blondeDisciple: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.blondeDiscipleUpgrades),
  prayingHandsPledge: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.prayingHandsPledgeMultiple),
  chiseledAbsKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.chiseledAbsKissGrowth),
  absOfStone: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.absOfStoneUpgrades),
  abdominalAdoration: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.abdominalAdorationMultiple),
  abGridGlory: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.abGridGloryGrowth),
  bicepPlea: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bicepPleaUpgrades),
  armInArm: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.armInArmMultiple),
  boxBraidBoost: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.boxBraidBoostGrowth),
  braidWatch: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.braidWatchUpgrades),
  buzzcutBackside: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.buzzcutBacksideMultiple),
  formCheck: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.formCheckGrowth),
  glovedSwat: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.glovedSwatUpgrades),
  grapeSpandex: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.grapeSpandexMultiple),
  headbandTwins: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.headbandTwinsGrowth),
  highlighterLeggings: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.highlighterLeggingsUpgrades),
  hipNuzzle: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.hipNuzzleMultiple),
  hitchhikerThumb: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.hitchhikerThumbGrowth),
  ivoryShorts: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.ivoryShortsUpgrades),
  lowLunge: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.lowLungeMultiple),
  magentaHype: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.magentaHypeGrowth),
  matchingSneakers: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.matchingSneakersUpgrades),
  neonTrimNudge: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.neonTrimNudgeMultiple),
  orangeAndLime: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.orangeAndLimeGrowth),
  peekabooBuddy: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.peekabooBuddyUpgrades),
  pinkTankPat: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkTankPatMultiple),
  redSockSumo: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.redSockSumoGrowth),
  sidelineCoach: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.sidelineCoachUpgrades),
  steadyingHand: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.steadyingHandMultiple),
  yellowShortsSmack: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.yellowShortsSmackGrowth),
  bearyBuff: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bearyBuffGrowth),
  gingerGnawers: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.gingerGnawersGrowth),
  hippoHeavyweights: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.hippoHeavyweightsGrowth),
  labRatLifters: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.labRatLiftersGrowth),
  backDay: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.backDayShare),
  backpackBabes: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.backpackBabesShare),
  blondeBicep: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blondeBicepShare),
  floorWork: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.floorWorkShare),
  gymBuddies: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.gymBuddiesShare),
  kickoff: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kickoffShare),
  redZone: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redZoneShare),
  spandexSquad: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.spandexSquadShare),
  spotterPair: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.spotterPairShare),
  sweatbandSmiles: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sweatbandSmilesShare),
  synchronizedSquat: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.synchronizedSquatShare),
  trackStar: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.trackStarShare),
  pewterPlunge: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pewterPlungeShare),
  sterlingProwl: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sterlingProwlShare),
} satisfies FeaturedRewards<typeof MUSCLE_GIRLS_CRITS>;
