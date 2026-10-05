import type { FEET_CRITS } from "../../critData/feet";
import type { FeaturedRewards } from "./types";

export const FEET_REWARDS = {
  ankleAsset: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.ankleAssetFloors),
  archEnemyAssets: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.archEnemyAssetsBoostSeconds, balance.archEnemyAssetsExtraWorkers),
  barefootBanker: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.barefootBankerWorkers);
    actions.hireManagers(context.floors);
  },
  bestFootForward: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.bestFootForwardContinueChance),
  coldFeetCash: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.coldFeetCashTierSteps, balance.coldFeetCashUpgrades),
  footInTheDoor: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.footInTheDoorDiscount),
  heelTurnHaul: (context, { actions, balance }) =>
    actions.boostWorkers([context.floor], balance.heelTurnHaulBoostSeconds, balance.heelTurnHaulExtraWorkers),
  pedicurePayout: (context, { actions }) =>
    actions.armCrit(context.floors, "crit"),
  sockItAway: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.sockItAwayBoostSeconds, balance.sockItAwayExtraWorkers),
  soleProprietor: (context, { actions, balance, alternating }) =>
    actions.hireWorkers(alternating(context), balance.soleProprietorWorkers),
  stepUpStocks: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.stepUpStocksContinueChance),
  tenToeTreasury: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.tenToeTreasuryTierSteps, balance.tenToeTreasuryUpgrades),
  tippyToeTycoon: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.tippyToeTycoonFloors),
  toeRingRiches: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.toeRingRichesDiscount),
  toeTally: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.toeTallySeconds),
  beanCounterPaws: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.beanCounterPawsDiscount),
  kittyToeCapital: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kittyToeCapitalShare),
  pawprintProfits: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.pawprintProfitsContinueChance),
  toeBeanTreasury: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.toeBeanTreasuryTierSteps, balance.toeBeanTreasuryUpgrades),
  whiskerWalk: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.whiskerWalkDiscount),
  doubleSoleMoo: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.doubleSoleMooDiscount),
  magentaScaleSoles: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.magentaScaleSolesDiscount),
  rubyWyrmSoles: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.rubyWyrmSolesBoostSeconds, balance.rubyWyrmSolesExtraWorkers),
  azureDrakeToes: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.azureDrakeToesContinueChance),
  emberHeelHoard: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.emberHeelHoardShare),
  pinkPadWyvern: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.pinkPadWyvernBoostSeconds, balance.pinkPadWyvernExtraWorkers),
  midnightSoles: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.midnightSolesDiscount),
  crimsonCapeSoles: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.crimsonCapeSolesSeconds),
  bigHoopHustle: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.bigHoopHustleContinueChance),
  bubblegumTwins: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bubblegumTwinsDiscount),
  cooldownStretch: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cooldownStretchSeconds),
  cuddleClanComfort: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.cuddleClanComfortBoostSeconds, balance.cuddleClanComfortExtraWorkers),
  hotPinkPads: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.hotPinkPadsSeconds),
  kickBackCapital: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.kickBackCapitalBoostSeconds, balance.kickBackCapitalExtraWorkers),
  lazySundaySoles: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.lazySundaySolesContinueChance),
  lemonSole: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.lemonSoleDiscount),
  logLoungeSoles: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.logLoungeSolesSeconds),
  mirrorImageSoles: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.mirrorImageSolesBoostSeconds, balance.mirrorImageSolesExtraWorkers),
  muscleToeMogul: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.muscleToeMogulContinueChance),
  overallProfits: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.overallProfitsSeconds),
  punkRockPedicure: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.punkRockPedicureBoostSeconds, balance.punkRockPedicureExtraWorkers),
  scrapyardSoles: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.scrapyardSolesContinueChance),
  soleSpotlight: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.soleSpotlightDiscount),
  sunnySoleSisters: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.sunnySoleSistersSeconds),
  tenderTuskRub: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.tenderTuskRubBoostSeconds, balance.tenderTuskRubExtraWorkers),
  tickleTax: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.tickleTaxContinueChance),
  tuskedToeTrade: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tuskedToeTradeShare),
  tusksAndToes: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.tusksAndToesBoostSeconds, balance.tusksAndToesExtraWorkers),
  twinBraidTreads: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.twinBraidTreadsContinueChance),
  warbandWiggles: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.warbandWigglesDiscount),
  warchiefPedicure: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.warchiefPedicureShare),
  barefootRangers: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.barefootRangersBoostSeconds, balance.barefootRangersExtraWorkers),
  bloodBank: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bloodBankDiscount),
  cryptKeeper: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.cryptKeeperBoostSeconds, balance.cryptKeeperExtraWorkers),
  fangShui: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.fangShuiDiscount),
  feelingBlue: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.feelingBlueShare),
  ghostOfAChance: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.ghostOfAChanceBoostSeconds, balance.ghostOfAChanceExtraWorkers),
  oddCouple: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.oddCoupleShare),
  onTheBall: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.onTheBallBoostSeconds, balance.onTheBallExtraWorkers),
  redVelvetCape: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.redVelvetCapeDiscount),
  theCountess: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.theCountessShare),
  woodlandWanderers: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.woodlandWanderersBoostSeconds, balance.woodlandWanderersExtraWorkers),
  legUpLedger: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.legUpLedgerShare),
  pixieCutPayday: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pixieCutPaydayShare),
  sunsetSoleSavings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sunsetSoleSavingsShare),
  flexiblePricing: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.flexiblePricingDiscount),
  goldenBeltGrind: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.goldenBeltGrindBoostSeconds, balance.goldenBeltGrindExtraWorkers),
  highKickMarkdown: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.highKickMarkdownDiscount),
  petticoatPriceCut: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.petticoatPriceCutDiscount),
  pinkCarpetKickoff: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.pinkCarpetKickoffBoostSeconds, balance.pinkCarpetKickoffExtraWorkers),
  rainbowRuffleRally: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.rainbowRuffleRallyBoostSeconds, balance.rainbowRuffleRallyExtraWorkers),
  redCarpetClearance: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.redCarpetClearanceDiscount),
  tightLacedTeam: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.tightLacedTeamBoostSeconds, balance.tightLacedTeamExtraWorkers),
  faceValue: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.faceValueShare),
  heelDeal: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.heelDealPayouts),
  soleCustody: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.soleCustodyShare),
  splitTheProfits: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.splitTheProfitsShare),
  emeraldToeEarnings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.emeraldToeEarningsShare),
  footTheBill: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.footTheBillPayouts),
  greenToeGreenbacks: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.greenToeGreenbacksPayouts),
  lyingLowLedger: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.lyingLowLedgerShare),
  toeToToeTrade: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.toeToToeTradeUpgrades),
  daisyDuel: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.daisyDuelMultiple),
  goblinGrins: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goblinGrinsUpgrades),
  toeTussle: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.toeTussleGrowth),
  toeGrip: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.toeGripUpgrades),
  toePyramid: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.toePyramidMultiple),
  armsWideKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.armsWideKissMultiple),
  bandanaSmooch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bandanaSmoochGrowth),
  bicepBunKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bicepBunKissUpgrades),
  blueBuzzCutKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.blueBuzzCutKissMultiple),
  blueLeggingsPeck: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.blueLeggingsPeckGrowth),
  blueManeSmooch: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.blueManeSmoochUpgrades),
  bluePolishPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.bluePolishPuckerMultiple),
  bobCutSmooch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bobCutSmoochGrowth),
  bothFeetPucker: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bothFeetPuckerUpgrades),
  brickShortsPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.brickShortsPuckerMultiple),
  closeUpKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.closeUpKissGrowth),
  coralSoleSmooch: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.coralSoleSmoochUpgrades),
  coralToeCurl: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.coralToeCurlMultiple),
  crimsonCropPucker: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.crimsonCropPuckerGrowth),
  crouchKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.crouchKissUpgrades),
  curlyManeMwah: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.curlyManeMwahMultiple),
  doubleBunPucker: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.doubleBunPuckerGrowth),
  fingerPointPeck: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.fingerPointPeckUpgrades),
  flatTopPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.flatTopPuckerMultiple),
  flexAndPucker: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.flexAndPuckerGrowth),
  flexPosePeck: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.flexPosePeckUpgrades),
  frontKickPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.frontKickPuckerMultiple),
  giantArchDare: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.giantArchDareGrowth),
  goldWristbandKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goldWristbandKissUpgrades),
  greenToenailTease: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.greenToenailTeaseMultiple),
  handOnHipKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.handOnHipKissGrowth),
  hoopEarringSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.hoopEarringSmoochMultiple),
  hotPinkStreak: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.hotPinkStreakGrowth),
  kneePadKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.kneePadKissUpgrades),
  leanInKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.leanInKissMultiple),
  lemonArchKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.lemonArchKissGrowth),
  leotardKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.leotardKissUpgrades),
  magentaPantsMwah: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.magentaPantsMwahMultiple),
  maroonShortsMwah: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.maroonShortsMwahGrowth),
  messyBunMwah: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.messyBunMwahUpgrades),
  muscleQueenSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.muscleQueenSmoochMultiple),
  neonPantsPeck: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.neonPantsPeckGrowth),
  paleArchPeck: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.paleArchPeckUpgrades),
  peachShortsPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.peachShortsPuckerMultiple),
  peekabooSole: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.peekabooSoleGrowth),
  pinkHeadbandPointer: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pinkHeadbandPointerUpgrades),
  pinkHeelPeck: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkHeelPeckMultiple),
  pinkNailPointer: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.pinkNailPointerGrowth),
  pinkSleevePucker: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pinkSleevePuckerUpgrades),
  pinkStripePucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkStripePuckerMultiple),
  pocketPucker: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.pocketPuckerGrowth),
  pointDownPucker: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pointDownPuckerUpgrades),
  rainbowLeggingsPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.rainbowLeggingsPuckerMultiple),
  redHotSole: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.redHotSoleGrowth),
  redTopSmooch: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.redTopSmoochUpgrades),
  rustShortsSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.rustShortsSmoochMultiple),
  salmonSoleSmooch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.salmonSoleSmoochGrowth),
  salmonToesTease: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.salmonToesTeaseUpgrades),
  shortCropKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.shortCropKissMultiple),
  sidePointSmooch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.sidePointSmoochGrowth),
  silverBuzzFlex: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.silverBuzzFlexUpgrades),
  spikyHairSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.spikyHairSmoochMultiple),
  tangerineToes: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tangerineToesGrowth),
  tealCropKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.tealCropKissUpgrades),
  thunderThighSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.thunderThighSmoochMultiple),
  topBunToes: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.topBunToesGrowth),
  topknotTiptoe: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.topknotTiptoeUpgrades),
  tropicToesKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.tropicToesKissMultiple),
  waggingFingerKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.waggingFingerKissGrowth),
  whiteCropKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.whiteCropKissUpgrades),
  yellowHeelPeck: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.yellowHeelPeckMultiple),
  bigSoleSpread: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bigSoleSpreadGrowth),
  blondeBallUp: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.blondeBallUpUpgrades),
  bumblebeeLegs: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.bumblebeeLegsMultiple),
  bunTopPike: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bunTopPikeGrowth),
  butterflySplit: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.butterflySplitUpgrades),
  candyLeggingsKick: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.candyLeggingsKickMultiple),
  cobaltBobKick: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.cobaltBobKickGrowth),
  crisscrossBun: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.crisscrossBunMultiple),
  frogSitFlex: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.frogSitFlexGrowth),
  goldenLocksLegUp: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goldenLocksLegUpUpgrades),
  huggedStilts: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.huggedStiltsMultiple),
  kneeHugHuddle: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.kneeHugHuddleGrowth),
  lowFadeFootrest: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.lowFadeFootrestUpgrades),
  mintShortsLift: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.mintShortsLiftMultiple),
  patchworkPantsHug: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.patchworkPantsHugGrowth),
  pinkCropPowerhouse: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pinkCropPowerhouseUpgrades),
  pinkShortsSlant: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkShortsSlantMultiple),
  ponytailVSplit: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.ponytailVSplitGrowth),
  rainbowShortsSprawl: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.rainbowShortsSprawlUpgrades),
  reclineRaise: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.reclineRaiseMultiple),
  redheadCrossover: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.redheadCrossoverGrowth),
  redTankRaise: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.redTankRaiseUpgrades),
  sidewaysSoles: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.sidewaysSolesMultiple),
  soleSandwich: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.soleSandwichGrowth),
  victoryVSoles: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.victoryVSolesMultiple),
  cherryBobBundle: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.cherryBobBundleGrowth),
  toeStackLean: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.toeStackLeanUpgrades),
  armbandGoblinLounge: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.armbandGoblinLoungeMultiple),
  cobaltCropGoblin: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.cobaltCropGoblinGrowth),
  goblinKneeSqueeze: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goblinKneeSqueezeUpgrades),
  plumBunGoblin: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.plumBunGoblinMultiple),
  tealTopGoblin: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.tealTopGoblinGrowth),
} satisfies FeaturedRewards<typeof FEET_CRITS>;
