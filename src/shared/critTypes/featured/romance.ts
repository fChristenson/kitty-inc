import type { ROMANCE_CRITS } from "../../critData/romance";
import type { FeaturedRewards } from "./types";

export const ROMANCE_REWARDS = {
  airKissAssets: (context, { actions, lowestLevel }) =>
    actions.armCrit([lowestLevel(context)], "crit"),
  blownKissBonus: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  butterflyKiss: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.butterflyKissFloors),
  crushCapital: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.crushCapitalDiscount),
  cupidsCommission: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cupidsCommissionSeconds),
  frenchKissFortune: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.frenchKissFortuneBoostSeconds, balance.frenchKissFortuneExtraWorkers),
  glossyPout: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.glossyPoutWorkers),
  goodnightKissGains: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.goodnightKissGainsContinueChance),
  heartThrobHoldings: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.heartThrobHoldingsTierSteps, balance.heartThrobHoldingsUpgrades),
  kissAndTell: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(lowestLevel(context), balance.kissAndTellTierSteps, balance.kissAndTellUpgrades),
  kissCamCashout: (context, { actions }) =>
    actions.armCrit([context.floor], "crit"),
  kissingBoothBank: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  lipLockLoot: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.lipLockLootBoostSeconds, balance.lipLockLootExtraWorkers),
  lipServiceLoot: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  lipstickLedger: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.lipstickLedgerContinueChance),
  loveLetterLedger: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.loveLetterLedgerTierSteps, balance.loveLetterLedgerUpgrades),
  mistletoeMargin: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.mistletoeMarginDiscount),
  mwahMoney: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.mwahMoneyShare),
  peckPortfolio: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.peckPortfolioFloors),
  puckerUpPayout: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.puckerUpPayoutBoostSeconds, balance.puckerUpPayoutExtraWorkers),
  rosyCheekReturns: (context, { actions, alternating }) =>
    actions.hireManagers(alternating(context)),
  sealedWithAKiss: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.sealedWithAKissContinueChance),
  smittenSavings: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.smittenSavingsTierSteps, balance.smittenSavingsUpgrades),
  smoochStocks: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.smoochStocksDiscount),
  stolenKissStash: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.stolenKissStashSeconds),
  sweetheartSurplus: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  cheekPeckProfit: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.cheekPeckProfitBoostSeconds, balance.cheekPeckProfitExtraWorkers),
  kissKissCash: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.kissKissCashContinueChance),
  lipBalmBonus: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.lipBalmBonusTierSteps, balance.lipBalmBonusUpgrades),
  lovebirdLoot: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.lovebirdLootDiscount),
  poutPower: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.poutPowerShare),
  smackDabSavings: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.smackDabSavingsBoostSeconds, balance.smackDabSavingsExtraWorkers),
  scaleSmooch: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.scaleSmoochContinueChance),
  hornLockKiss: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.hornLockKissDiscount),
  fireAndFrostKiss: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.fireAndFrostKissSeconds),
  sapphireEmberSmooch: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.sapphireEmberSmoochBoostSeconds, balance.sapphireEmberSmoochExtraWorkers),
  fangKissFling: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.fangKissFlingBoostSeconds, balance.fangKissFlingExtraWorkers),
  neckNibbleKiss: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.neckNibbleKissContinueChance),
  baldAndBeautiful: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.baldAndBeautifulBoostSeconds, balance.baldAndBeautifulExtraWorkers),
  battleScarBeau: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.battleScarBeauContinueChance),
  boneBunBesties: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.boneBunBestiesDiscount),
  brunetteBliss: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.brunetteBlissShare),
  bunBraidBond: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.bunBraidBondBoostSeconds, balance.bunBraidBondExtraWorkers),
  buzzcutBesos: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.buzzcutBesosContinueChance),
  cheekToCheek: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.cheekToCheekDiscount),
  cobaltCrush: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.cobaltCrushShare),
  cropTopCuddle: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.cropTopCuddleBoostSeconds, balance.cropTopCuddleExtraWorkers),
  crownedCrush: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.crownedCrushContinueChance),
  doubleCheekDividend: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.doubleCheekDividendDiscount),
  flexAndPeck: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.flexAndPeckShare),
  frostHairFlirt: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.frostHairFlirtBoostSeconds, balance.frostHairFlirtExtraWorkers),
  gildedEmbrace: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.gildedEmbraceContinueChance),
  goldChainSmooch: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.goldChainSmoochDiscount),
  goldenNecklaceNuzzle: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldenNecklaceNuzzleShare),
  goldHoopTrio: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.goldHoopTrioBoostSeconds, balance.goldHoopTrioExtraWorkers),
  handInHandHustle: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.handInHandHustleContinueChance),
  ironShoulderKiss: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.ironShoulderKissDiscount),
  ivoryManeKiss: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.ivoryManeKissShare),
  leanInLoot: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.leanInLootBoostSeconds, balance.leanInLootExtraWorkers),
  limelightKiss: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.limelightKissContinueChance),
  mohawkMakeout: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.mohawkMakeoutDiscount),
  pinkLipPact: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkLipPactShare),
  ponytailParade: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.ponytailParadeBoostSeconds, balance.ponytailParadeExtraWorkers),
  rainbowHairHuddle: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.rainbowHairHuddleContinueChance),
  rubyLipRendezvous: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.rubyLipRendezvousDiscount),
  sandwichSmooch: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sandwichSmoochShare),
  scarletPucker: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.scarletPuckerBoostSeconds, balance.scarletPuckerExtraWorkers),
  scarredSweetheart: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.scarredSweetheartContinueChance),
  silverHairSnuggle: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.silverHairSnuggleBoostSeconds, balance.silverHairSnuggleExtraWorkers),
  sixPackSmooch: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.sixPackSmoochDiscount),
  spikySweetheart: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.spikySweetheartShare),
  swoleMates: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.swoleMatesBoostSeconds, balance.swoleMatesExtraWorkers),
  tealBunBlush: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.tealBunBlushDiscount),
  thirdWheelWindfall: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.thirdWheelWindfallShare),
  tripleSmoochSyndicate: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.tripleSmoochSyndicateBoostSeconds, balance.tripleSmoochSyndicateExtraWorkers),
  tuskTango: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.tuskTangoDiscount),
  tuskTouchKiss: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tuskTouchKissShare),
  tuskTrioTreaty: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.tuskTrioTreatyBoostSeconds, balance.tuskTrioTreatyExtraWorkers),
  crushHour: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.crushHourDiscount),
  earResistibleTrio: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.earResistibleTrioShare),
  evergreenEmbrace: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.evergreenEmbraceBoostSeconds, balance.evergreenEmbraceExtraWorkers),
  fangClub: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.fangClubDiscount),
  goldenBraidBond: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldenBraidBondShare),
  greenWithEnvy: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.greenWithEnvyBoostSeconds, balance.greenWithEnvyExtraWorkers),
  moonbeamHuddle: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.moonbeamHuddleDiscount),
  nightAndDay: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.nightAndDayShare),
  topKnotTrio: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.topKnotTrioBoostSeconds, balance.topKnotTrioExtraWorkers),
  vestedInterest: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.vestedInterestDiscount),
  bridalCarryBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.bridalCarryBonusPayouts),
  cheekToCheekCash: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.cheekToCheekCashPayouts),
  embraceEquity: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.embraceEquityUpgrades),
  eyeToEyeEarnings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.eyeToEyeEarningsShare),
  goblinSmoochSavings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goblinSmoochSavingsShare),
  greenbackKiss: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.greenbackKissPayouts),
  hugItOutIncome: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hugItOutIncomeShare),
  kissAndMakeMoney: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.kissAndMakeMoneyPayouts),
  noseToNoseNetWorth: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.noseToNoseNetWorthShare),
  orcKissAccount: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.orcKissAccountShare),
  silverFoxFund: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.silverFoxFundShare),
  slowDanceDividend: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.slowDanceDividendPayouts),
  sweptAwaySalary: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.sweptAwaySalaryPayouts),
  tangoTycoons: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.tangoTycoonsUpgrades),
  tieBreakerBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tieBreakerBonusPayouts),
  twoStepTreasury: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.twoStepTreasuryShare),
  warmWelcomeWages: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.warmWelcomeWagesPayouts),
  blondeGoblinBankroll: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.blondeGoblinBankrollPayouts),
  braidedGoblinBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.braidedGoblinBonusPayouts),
  emeraldKissEarnings: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.emeraldKissEarningsSeconds),
  goblinKissGold: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.goblinKissGoldPayouts),
  greenQueenGains: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.greenQueenGainsUpgrades),
  hoopEarringHoldings: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.hoopEarringHoldingsSeconds),
  pointyEarPay: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.pointyEarPayPayouts),
  punkGoblinPayout: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.punkGoblinPayoutPayouts),
  swampSmoochStash: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.swampSmoochStashSeconds),
  tuskKissTally: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tuskKissTallyPayouts),
  pompadourKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pompadourKissMultiple),
  armCandy: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.armCandyGrowth),
  blondeBobKiss: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.blondeBobKissUpgrades),
  blueQuiffPeck: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.blueQuiffPeckMultiple),
  blueGoblinTwins: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.blueGoblinTwinsGrowth),
  buckleUp: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.buckleUpUpgrades),
  coralCrush: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.coralCrushMultiple),
  cottonCandyKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.cottonCandyKissGrowth),
  braidedPuckers: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.braidedPuckersUpgrades),
  fadeAndBraid: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.fadeAndBraidMultiple),
  flaxenBraidPeck: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.flaxenBraidPeckGrowth),
  giggleFit: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.giggleFitUpgrades),
  goldilocks: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.goldilocksMultiple),
  goblinLipPrint: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.goblinLipPrintGrowth),
  loveBite: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.loveBiteUpgrades),
  twinPonytails: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.twinPonytailsMultiple),
  lemonCropTop: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.lemonCropTopGrowth),
  limeCrush: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.limeCrushUpgrades),
  rapunzelSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.rapunzelSmoochMultiple),
  lookalikeLipstick: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.lookalikeLipstickGrowth),
  necklineKiss: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.necklineKissUpgrades),
  pinkBraidSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkBraidSmoochMultiple),
  goblinCrush: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.goblinCrushGrowth),
  smoochDelivery: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.smoochDeliveryUpgrades),
  snowcapSnuggle: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.snowcapSnuggleMultiple),
  tealBraids: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tealBraidsGrowth),
  tomboySmooch: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.tomboySmoochUpgrades),
  lipstickTrail: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.lipstickTrailMultiple),
  blueBobSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.blueBobSmoochMultiple),
  braidsAndCurls: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.braidsAndCurlsGrowth),
  cheekSmoochDuo: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.cheekSmoochDuoUpgrades),
  cottonCandyCuddle: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.cottonCandyCuddleMultiple),
  greenCheekLick: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.greenCheekLickGrowth),
  leggingsLeanIn: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.leggingsLeanInUpgrades),
  platinumPeck: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.platinumPeckMultiple),
  ponytailPucker: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.ponytailPuckerGrowth),
  tealBraidNuzzle: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.tealBraidNuzzleUpgrades),
  tongueTango: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.tongueTangoMultiple),
  buzzcutBraidBuddies: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.buzzcutBraidBuddiesMultiple),
  hoopEarringKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.hoopEarringKissGrowth),
  pinkBraidSnuggle: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pinkBraidSnuggleUpgrades),
  violetWavesKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.violetWavesKissMultiple),
} satisfies FeaturedRewards<typeof ROMANCE_CRITS>;
