import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ROMANCE_CRITS = {
  airKissAssets: {
    label: "Air Kiss Assets",
    color: COLOR.headhunterRust,
    image: "crits/romance/airKissAssets.webp",
    description: "Arms the lowest-level floor's next click as an x5 crit",
    reward: (context, { actions, lowestLevel }) =>
      actions.armCrit([lowestLevel(context)], "crit"),
  },
  blownKissBonus: {
    label: "Blown Kiss Bonus",
    color: COLOR.supplyRunTan,
    image: "crits/romance/blownKissBonus.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  butterflyKiss: {
    label: "Butterfly Kiss",
    color: COLOR.fastForwardBlue,
    image: "crits/romance/butterflyKiss.webp",
    description: "Unlocks the next 5 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.butterflyKissFloors),
  },
  crushCapital: {
    label: "Crush Capital",
    color: COLOR.teamBuildingCoral,
    image: "crits/romance/crushCapital.webp",
    description: "Cuts every price in this building by 2.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.crushCapitalDiscount),
  },
  cupidsCommission: {
    label: "Cupids Commission",
    color: COLOR.springCleaningMint,
    image: "crits/romance/cupidsCommission.webp",
    description: "Adds 45s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.cupidsCommissionSeconds),
  },
  frenchKissFortune: {
    label: "French Kiss Fortune",
    color: COLOR.fastForwardBlue,
    image: "crits/romance/frenchKissFortune.webp",
    description: "Boosts every worker for 22s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.frenchKissFortuneBoostSeconds, balance.frenchKissFortuneExtraWorkers),
  },
  glossyPout: {
    label: "Glossy Pout",
    color: COLOR.sunshineGold,
    image: "crits/romance/glossyPout.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.glossyPoutWorkers),
  },
  goodnightKissGains: {
    label: "Goodnight Kiss Gains",
    color: COLOR.fastForwardBlue,
    image: "crits/romance/goodnightKissGains.webp",
    description: "Repeats the crit above and below, 64% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.goodnightKissGainsContinueChance),
  },
  heartThrobHoldings: {
    label: "Heart Throb Holdings",
    color: COLOR.teaBreakBrown,
    image: "crits/romance/heartThrobHoldings.webp",
    description: "One tier promotion and nine upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.heartThrobHoldingsTierSteps, balance.heartThrobHoldingsUpgrades),
  },
  kissAndTell: {
    label: "Kiss And Tell",
    color: COLOR.peppermintPink,
    image: "crits/romance/kissAndTell.webp",
    description: "One tier promotion and fourteen upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(lowestLevel(context), balance.kissAndTellTierSteps, balance.kissAndTellUpgrades),
  },
  kissCamCashout: {
    label: "Kiss Cam Cashout",
    color: COLOR.coinGold,
    image: "crits/romance/kissCamCashout.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) =>
      actions.armCrit([context.floor], "crit"),
  },
  kissingBoothBank: {
    label: "Kissing Booth Bank",
    color: COLOR.doubleDownCrimson,
    image: "crits/romance/kissingBoothBank.webp",
    description: "Raises alternating floors to the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(alternating(context), topLevel(context)),
  },
  lipLockLoot: {
    label: "Lip Lock Loot",
    color: COLOR.sameBoatCoral,
    image: "crits/romance/lipLockLoot.webp",
    description: "Boosts every worker for 30s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.lipLockLootBoostSeconds, balance.lipLockLootExtraWorkers),
  },
  lipServiceLoot: {
    label: "Lip Service Loot",
    color: COLOR.red,
    image: "crits/romance/lipServiceLoot.webp",
    description: "Free office supplies for every unlocked floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies(context.floors),
  },
  lipstickLedger: {
    label: "Lipstick Ledger",
    color: COLOR.sunshineGold,
    image: "crits/romance/lipstickLedger.webp",
    description: "Repeats the crit on the floor below, 13% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.lipstickLedgerContinueChance),
  },
  loveLetterLedger: {
    label: "Love Letter Ledger",
    color: COLOR.coinGold,
    image: "crits/romance/loveLetterLedger.webp",
    description: "One tier promotion and six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.loveLetterLedgerTierSteps, balance.loveLetterLedgerUpgrades),
  },
  mistletoeMargin: {
    label: "Mistletoe Margin",
    color: COLOR.coinGold,
    image: "crits/romance/mistletoeMargin.webp",
    description: "Cuts every price in this building by 1.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.mistletoeMarginDiscount),
  },
  mwahMoney: {
    label: "Mwah Money",
    color: COLOR.red,
    image: "crits/romance/mwahMoney.webp",
    description: "Adds 10.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.mwahMoneyShare),
  },
  peckPortfolio: {
    label: "Peck Portfolio",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/romance/peckPortfolio.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.peckPortfolioFloors),
  },
  puckerUpPayout: {
    label: "Pucker Up Payout",
    color: COLOR.fastForwardBlue,
    image: "crits/romance/puckerUpPayout.webp",
    description: "Boosts every worker for 15s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.puckerUpPayoutBoostSeconds, balance.puckerUpPayoutExtraWorkers),
  },
  rosyCheekReturns: {
    label: "Rosy Cheek Returns",
    color: COLOR.teaBreakBrown,
    image: "crits/romance/rosyCheekReturns.webp",
    description: "Hires a free manager on alternating floors",
    reward: (context, { actions, alternating }) =>
      actions.hireManagers(alternating(context)),
  },
  sealedWithAKiss: {
    label: "Sealed With A Kiss",
    color: COLOR.springCleaningMint,
    image: "crits/romance/sealedWithAKiss.webp",
    description: "Repeats the crit on the floor above, 26% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.sealedWithAKissContinueChance),
  },
  smittenSavings: {
    label: "Smitten Savings",
    color: COLOR.rainCheckBlue,
    image: "crits/romance/smittenSavings.webp",
    description: "One tier promotion and seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.smittenSavingsTierSteps, balance.smittenSavingsUpgrades),
  },
  smoochStocks: {
    label: "Smooch Stocks",
    color: COLOR.sunshineGold,
    image: "crits/romance/smoochStocks.webp",
    description: "Cuts every price in this building by 2.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.smoochStocksDiscount),
  },
  stolenKissStash: {
    label: "Stolen Kiss Stash",
    color: COLOR.fullHouseCrimson,
    image: "crits/romance/stolenKissStash.webp",
    description: "Adds 5s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.stolenKissStashSeconds),
  },
  sweetheartSurplus: {
    label: "Sweetheart Surplus",
    color: COLOR.chairGiveawayBrown,
    image: "crits/romance/sweetheartSurplus.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  cheekPeckProfit: {
    label: "Cheek Peck Profit",
    color: COLOR.cyan,
    image: "crits/romance/cheekPeckProfit.webp",
    description: "Boosts every worker for 43s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.cheekPeckProfitBoostSeconds, balance.cheekPeckProfitExtraWorkers),
  },
  kissKissCash: {
    label: "Kiss Kiss Cash",
    color: COLOR.overflowBlue,
    image: "crits/romance/kissKissCash.webp",
    description: "Repeats the crit on the floor above, 62% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.kissKissCashContinueChance),
  },
  lipBalmBonus: {
    label: "Lip Balm Bonus",
    color: COLOR.sameBoatCoral,
    image: "crits/romance/lipBalmBonus.webp",
    description: "Two tier promotions and thirty-three upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.lipBalmBonusTierSteps, balance.lipBalmBonusUpgrades),
  },
  lovebirdLoot: {
    label: "Lovebird Loot",
    color: COLOR.amberMuted,
    image: "crits/romance/lovebirdLoot.webp",
    description: "Cuts every price in this building by 10.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.lovebirdLootDiscount),
  },
  poutPower: {
    label: "Pout Power",
    color: COLOR.gold,
    image: "crits/romance/poutPower.webp",
    description: "Adds 6.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.poutPowerShare),
  },
  smackDabSavings: {
    label: "Smack Dab Savings",
    color: COLOR.summerSaleOrange,
    image: "crits/romance/smackDabSavings.webp",
    description: "Boosts every worker for 44s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.smackDabSavingsBoostSeconds, balance.smackDabSavingsExtraWorkers),
  },
  scaleSmooch: {
    label: "Scale Smooch",
    color: COLOR.fullHouseCrimson,
    image: "crits/romance/scaleSmooch.webp",
    description: "Repeats the crit on the floor above, 86% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.scaleSmoochContinueChance),
  },
  hornLockKiss: {
    label: "Horn Lock Kiss",
    color: COLOR.fullHouseCrimson,
    image: "crits/romance/hornLockKiss.webp",
    description: "Cuts every price in this building by 18.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.hornLockKissDiscount),
  },
  fireAndFrostKiss: {
    label: "Fire And Frost Kiss",
    color: COLOR.headhunterRust,
    image: "crits/romance/fireAndFrostKiss.webp",
    description: "Adds 47s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.fireAndFrostKissSeconds),
  },
  sapphireEmberSmooch: {
    label: "Sapphire Ember Smooch",
    color: COLOR.overflowBlue,
    image: "crits/romance/sapphireEmberSmooch.webp",
    description: "Boosts every worker for 136s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.sapphireEmberSmoochBoostSeconds, balance.sapphireEmberSmoochExtraWorkers),
  },
  fangKissFling: {
    label: "Fang Kiss Fling",
    color: COLOR.doubleDownCrimson,
    image: "crits/romance/fangKissFling.webp",
    description: "Boosts every worker for 140s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.fangKissFlingBoostSeconds, balance.fangKissFlingExtraWorkers),
  },
  neckNibbleKiss: {
    label: "Neck Nibble Kiss",
    color: COLOR.chairGiveawayBrown,
    image: "crits/romance/neckNibbleKiss.webp",
    description: "Repeats the crit on the floor above, 88% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.neckNibbleKissContinueChance),
  },
  baldAndBeautiful: {
    label: "Bald And Beautiful",
    color: COLOR.paydayEmerald,
    image: "crits/romance/baldAndBeautiful.webp",
    description: "Boosts every worker for 149s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.baldAndBeautifulBoostSeconds, balance.baldAndBeautifulExtraWorkers),
  },
  battleScarBeau: {
    label: "Battle Scar Beau",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/battleScarBeau.webp",
    description: "Repeats the crit on the floor above, 92% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.battleScarBeauContinueChance),
  },
  boneBunBesties: {
    label: "Bone Bun Besties",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/boneBunBesties.webp",
    description: "Cuts every price in this building by 19.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.boneBunBestiesDiscount),
  },
  brunetteBliss: {
    label: "Brunette Bliss",
    color: COLOR.bullMarketGreen,
    image: "crits/romance/brunetteBliss.webp",
    description: "Adds 20.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.brunetteBlissShare),
  },
  bunBraidBond: {
    label: "Bun Braid Bond",
    color: COLOR.bullMarketGreen,
    image: "crits/romance/bunBraidBond.webp",
    description: "Boosts every worker for 150s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.bunBraidBondBoostSeconds, balance.bunBraidBondExtraWorkers),
  },
  buzzcutBesos: {
    label: "Buzzcut Besos",
    color: COLOR.luckyCloverGreen,
    image: "crits/romance/buzzcutBesos.webp",
    description: "Repeats the crit on the floor below, 92% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.buzzcutBesosContinueChance),
  },
  cheekToCheek: {
    label: "Cheek To Cheek",
    color: COLOR.disabledGray,
    image: "crits/romance/cheekToCheek.webp",
    description: "Cuts every price in this building by 19.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.cheekToCheekDiscount),
  },
  cobaltCrush: {
    label: "Cobalt Crush",
    color: COLOR.bullMarketGreen,
    image: "crits/romance/cobaltCrush.webp",
    description: "Adds 20.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.cobaltCrushShare),
  },
  cropTopCuddle: {
    label: "Crop Top Cuddle",
    color: COLOR.luckyCloverGreen,
    image: "crits/romance/cropTopCuddle.webp",
    description: "Boosts every worker for 151s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.cropTopCuddleBoostSeconds, balance.cropTopCuddleExtraWorkers),
  },
  crownedCrush: {
    label: "Crowned Crush",
    color: COLOR.moneyGreen,
    image: "crits/romance/crownedCrush.webp",
    description: "Repeats the crit on the floor above, 93% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.crownedCrushContinueChance),
  },
  doubleCheekDividend: {
    label: "Double Cheek Dividend",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/doubleCheekDividend.webp",
    description: "Cuts every price in this building by 19.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.doubleCheekDividendDiscount),
  },
  flexAndPeck: {
    label: "Flex And Peck",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/flexAndPeck.webp",
    description: "Adds 20.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.flexAndPeckShare),
  },
  frostHairFlirt: {
    label: "Frost Hair Flirt",
    color: COLOR.springCleaningMint,
    image: "crits/romance/frostHairFlirt.webp",
    description: "Boosts every worker for 152s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.frostHairFlirtBoostSeconds, balance.frostHairFlirtExtraWorkers),
  },
  gildedEmbrace: {
    label: "Gilded Embrace",
    color: COLOR.threeOfAKindGreen,
    image: "crits/romance/gildedEmbrace.webp",
    description: "Repeats the crit on the floor below, 93% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.gildedEmbraceContinueChance),
  },
  goldChainSmooch: {
    label: "Gold Chain Smooch",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/goldChainSmooch.webp",
    description: "Cuts every price in this building by 19.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.goldChainSmoochDiscount),
  },
  goldenNecklaceNuzzle: {
    label: "Golden Necklace Nuzzle",
    color: COLOR.luckyCloverGreen,
    image: "crits/romance/goldenNecklaceNuzzle.webp",
    description: "Adds 21% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldenNecklaceNuzzleShare),
  },
  goldHoopTrio: {
    label: "Gold Hoop Trio",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/goldHoopTrio.webp",
    description: "Boosts every worker for 153s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.goldHoopTrioBoostSeconds, balance.goldHoopTrioExtraWorkers),
  },
  handInHandHustle: {
    label: "Hand In Hand Hustle",
    color: COLOR.disabledGray,
    image: "crits/romance/handInHandHustle.webp",
    description: "Repeats the crit on the floor above, 94% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.handInHandHustleContinueChance),
  },
  ironShoulderKiss: {
    label: "Iron Shoulder Kiss",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/ironShoulderKiss.webp",
    description: "Cuts every price in this building by 19.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.ironShoulderKissDiscount),
  },
  ivoryManeKiss: {
    label: "Ivory Mane Kiss",
    color: COLOR.dressCodeGreen,
    image: "crits/romance/ivoryManeKiss.webp",
    description: "Adds 21.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.ivoryManeKissShare),
  },
  leanInLoot: {
    label: "Lean In Loot",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/leanInLoot.webp",
    description: "Boosts every worker for 154s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.leanInLootBoostSeconds, balance.leanInLootExtraWorkers),
  },
  limelightKiss: {
    label: "Limelight Kiss",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/limelightKiss.webp",
    description: "Repeats the crit on the floor below, 94% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.limelightKissContinueChance),
  },
  mohawkMakeout: {
    label: "Mohawk Makeout",
    color: COLOR.springCleaningMint,
    image: "crits/romance/mohawkMakeout.webp",
    description: "Cuts every price in this building by 19.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.mohawkMakeoutDiscount),
  },
  pinkLipPact: {
    label: "Pink Lip Pact",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/pinkLipPact.webp",
    description: "Adds 21.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pinkLipPactShare),
  },
  ponytailParade: {
    label: "Ponytail Parade",
    color: COLOR.luckyCloverGreen,
    image: "crits/romance/ponytailParade.webp",
    description: "Boosts every worker for 155s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.ponytailParadeBoostSeconds, balance.ponytailParadeExtraWorkers),
  },
  rainbowHairHuddle: {
    label: "Rainbow Hair Huddle",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/rainbowHairHuddle.webp",
    description: "Repeats the crit on the floor above, 95% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.rainbowHairHuddleContinueChance),
  },
  rubyLipRendezvous: {
    label: "Ruby Lip Rendezvous",
    color: COLOR.paydayEmerald,
    image: "crits/romance/rubyLipRendezvous.webp",
    description: "Cuts every price in this building by 19.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.rubyLipRendezvousDiscount),
  },
  sandwichSmooch: {
    label: "Sandwich Smooch",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/sandwichSmooch.webp",
    description: "Adds 21.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sandwichSmoochShare),
  },
  scarletPucker: {
    label: "Scarlet Pucker",
    color: COLOR.moneyGreen,
    image: "crits/romance/scarletPucker.webp",
    description: "Boosts every worker for 156s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.scarletPuckerBoostSeconds, balance.scarletPuckerExtraWorkers),
  },
  scarredSweetheart: {
    label: "Scarred Sweetheart",
    color: COLOR.luckyCloverGreen,
    image: "crits/romance/scarredSweetheart.webp",
    description: "Repeats the crit on the floor below, 95% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.scarredSweetheartContinueChance),
  },
  silverHairSnuggle: {
    label: "Silver Hair Snuggle",
    color: COLOR.luckyCloverGreen,
    image: "crits/romance/silverHairSnuggle.webp",
    description: "Boosts every worker for 157s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.silverHairSnuggleBoostSeconds, balance.silverHairSnuggleExtraWorkers),
  },
  sixPackSmooch: {
    label: "Six Pack Smooch",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/sixPackSmooch.webp",
    description: "Cuts every price in this building by 20%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.sixPackSmoochDiscount),
  },
  spikySweetheart: {
    label: "Spiky Sweetheart",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/spikySweetheart.webp",
    description: "Adds 21.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.spikySweetheartShare),
  },
  swoleMates: {
    label: "Swole Mates",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/swoleMates.webp",
    description: "Boosts every worker for 158s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.swoleMatesBoostSeconds, balance.swoleMatesExtraWorkers),
  },
  tealBunBlush: {
    label: "Teal Bun Blush",
    color: COLOR.paydayEmerald,
    image: "crits/romance/tealBunBlush.webp",
    description: "Cuts every price in this building by 20.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.tealBunBlushDiscount),
  },
  thirdWheelWindfall: {
    label: "Third Wheel Windfall",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/thirdWheelWindfall.webp",
    description: "Adds 21.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.thirdWheelWindfallShare),
  },
  tripleSmoochSyndicate: {
    label: "Triple Smooch Syndicate",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/tripleSmoochSyndicate.webp",
    description: "Boosts every worker for 159s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.tripleSmoochSyndicateBoostSeconds, balance.tripleSmoochSyndicateExtraWorkers),
  },
  tuskTango: {
    label: "Tusk Tango",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/tuskTango.webp",
    description: "Cuts every price in this building by 20.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.tuskTangoDiscount),
  },
  tuskTouchKiss: {
    label: "Tusk Touch Kiss",
    color: COLOR.luckyCloverGreen,
    image: "crits/romance/tuskTouchKiss.webp",
    description: "Adds 21.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.tuskTouchKissShare),
  },
  tuskTrioTreaty: {
    label: "Tusk Trio Treaty",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/tuskTrioTreaty.webp",
    description: "Boosts every worker for 160s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.tuskTrioTreatyBoostSeconds, balance.tuskTrioTreatyExtraWorkers),
  },
  crushHour: {
    label: "Crush Hour",
    color: COLOR.amberMuted,
    image: "crits/romance/crushHour.webp",
    description: "Cuts every price in this building by 20.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.crushHourDiscount),
  },
  earResistibleTrio: {
    label: "Ear Resistible Trio",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/romance/earResistibleTrio.webp",
    description: "Adds 22.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.earResistibleTrioShare),
  },
  evergreenEmbrace: {
    label: "Evergreen Embrace",
    color: COLOR.summerSaleOrange,
    image: "crits/romance/evergreenEmbrace.webp",
    description: "Boosts every worker for 167s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.evergreenEmbraceBoostSeconds, balance.evergreenEmbraceExtraWorkers),
  },
  fangClub: {
    label: "Fang Club",
    color: COLOR.sameBoatCoral,
    image: "crits/romance/fangClub.webp",
    description: "Cuts every price in this building by 21%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.fangClubDiscount),
  },
  goldenBraidBond: {
    label: "Golden Braid Bond",
    color: COLOR.summerSaleOrange,
    image: "crits/romance/goldenBraidBond.webp",
    description: "Adds 22.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldenBraidBondShare),
  },
  greenWithEnvy: {
    label: "Green With Envy",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/greenWithEnvy.webp",
    description: "Boosts every worker for 168s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.greenWithEnvyBoostSeconds, balance.greenWithEnvyExtraWorkers),
  },
  moonbeamHuddle: {
    label: "Moonbeam Huddle",
    color: COLOR.teaBreakBrown,
    image: "crits/romance/moonbeamHuddle.webp",
    description: "Cuts every price in this building by 21.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.moonbeamHuddleDiscount),
  },
  nightAndDay: {
    label: "Night And Day",
    color: COLOR.coinGold,
    image: "crits/romance/nightAndDay.webp",
    description: "Adds 22.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.nightAndDayShare),
  },
  topKnotTrio: {
    label: "Top Knot Trio",
    color: COLOR.amberMuted,
    image: "crits/romance/topKnotTrio.webp",
    description: "Boosts every worker for 169s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.topKnotTrioBoostSeconds, balance.topKnotTrioExtraWorkers),
  },
  vestedInterest: {
    label: "Vested Interest",
    color: COLOR.amberMuted,
    image: "crits/romance/vestedInterest.webp",
    description: "Cuts every price in this building by 21.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.vestedInterestDiscount),
  },
  bridalCarryBonus: {
    label: "Bridal Carry Bonus",
    color: COLOR.amberMuted,
    image: "crits/romance/bridalCarryBonus.webp",
    description: "Thirty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.bridalCarryBonusPayouts),
  },
  cheekToCheekCash: {
    label: "Cheek to Cheek Cash",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/romance/cheekToCheekCash.webp",
    description: "Fifty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.cheekToCheekCashPayouts),
  },
  embraceEquity: {
    label: "Embrace Equity",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/romance/embraceEquity.webp",
    description: "Fifty-three free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.embraceEquityUpgrades),
  },
  eyeToEyeEarnings: {
    label: "Eye to Eye Earnings",
    color: COLOR.fastForwardBlue,
    image: "crits/romance/eyeToEyeEarnings.webp",
    description: "Adds 24.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.eyeToEyeEarningsShare),
  },
  goblinSmoochSavings: {
    label: "Goblin Smooch Savings",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/goblinSmoochSavings.webp",
    description: "Adds 24.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goblinSmoochSavingsShare),
  },
  greenbackKiss: {
    label: "Greenback Kiss",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/greenbackKiss.webp",
    description: "Fifty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.greenbackKissPayouts),
  },
  hugItOutIncome: {
    label: "Hug It Out Income",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/romance/hugItOutIncome.webp",
    description: "Adds 24.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.hugItOutIncomeShare),
  },
  kissAndMakeMoney: {
    label: "Kiss and Make Money",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/kissAndMakeMoney.webp",
    description: "Fifty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.kissAndMakeMoneyPayouts),
  },
  noseToNoseNetWorth: {
    label: "Nose to Nose Net Worth",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/romance/noseToNoseNetWorth.webp",
    description: "Adds 24.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.noseToNoseNetWorthShare),
  },
  orcKissAccount: {
    label: "Orc Kiss Account",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/orcKissAccount.webp",
    description: "Adds 24.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.orcKissAccountShare),
  },
  silverFoxFund: {
    label: "Silver Fox Fund",
    color: COLOR.teaBreakBrown,
    image: "crits/romance/silverFoxFund.webp",
    description: "Adds 24.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.silverFoxFundShare),
  },
  slowDanceDividend: {
    label: "Slow Dance Dividend",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/romance/slowDanceDividend.webp",
    description: "Fifty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.slowDanceDividendPayouts),
  },
  sweptAwaySalary: {
    label: "Swept Away Salary",
    color: COLOR.summerSaleOrange,
    image: "crits/romance/sweptAwaySalary.webp",
    description: "Fifty-five instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.sweptAwaySalaryPayouts),
  },
  tangoTycoons: {
    label: "Tango Tycoons",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/romance/tangoTycoons.webp",
    description: "Fifty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.tangoTycoonsUpgrades),
  },
  tieBreakerBonus: {
    label: "Tie Breaker Bonus",
    color: COLOR.amberMuted,
    image: "crits/romance/tieBreakerBonus.webp",
    description: "Fifty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tieBreakerBonusPayouts),
  },
  twoStepTreasury: {
    label: "Two Step Treasury",
    color: COLOR.amberMuted,
    image: "crits/romance/twoStepTreasury.webp",
    description: "Adds 25% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.twoStepTreasuryShare),
  },
  warmWelcomeWages: {
    label: "Warm Welcome Wages",
    color: COLOR.coinGold,
    image: "crits/romance/warmWelcomeWages.webp",
    description: "Fifty-seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.warmWelcomeWagesPayouts),
  },
  blondeGoblinBankroll: {
    label: "Blonde Goblin Bankroll",
    color: COLOR.threeOfAKindGreen,
    image: "crits/romance/blondeGoblinBankroll.webp",
    description: "Ninety-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.blondeGoblinBankrollPayouts),
  },
  braidedGoblinBonus: {
    label: "Braided Goblin Bonus",
    color: COLOR.paydayEmerald,
    image: "crits/romance/braidedGoblinBonus.webp",
    description: "Ninety-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.braidedGoblinBonusPayouts),
  },
  emeraldKissEarnings: {
    label: "Emerald Kiss Earnings",
    color: COLOR.luckyCloverGreen,
    image: "crits/romance/emeraldKissEarnings.webp",
    description: "Adds 78s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.emeraldKissEarningsSeconds),
  },
  goblinKissGold: {
    label: "Goblin Kiss Gold",
    color: COLOR.luckyCloverGreen,
    image: "crits/romance/goblinKissGold.webp",
    description: "Ninety-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.goblinKissGoldPayouts),
  },
  greenQueenGains: {
    label: "Green Queen Gains",
    color: COLOR.paydayEmerald,
    image: "crits/romance/greenQueenGains.webp",
    description: "Eleven free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.greenQueenGainsUpgrades),
  },
  hoopEarringHoldings: {
    label: "Hoop Earring Holdings",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/romance/hoopEarringHoldings.webp",
    description: "Adds 79s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.hoopEarringHoldingsSeconds),
  },
  pointyEarPay: {
    label: "Pointy Ear Pay",
    color: COLOR.amberMuted,
    image: "crits/romance/pointyEarPay.webp",
    description: "Ninety-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.pointyEarPayPayouts),
  },
  punkGoblinPayout: {
    label: "Punk Goblin Payout",
    color: COLOR.bullMarketGreen,
    image: "crits/romance/punkGoblinPayout.webp",
    description: "Ninety-five instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.punkGoblinPayoutPayouts),
  },
  swampSmoochStash: {
    label: "Swamp Smooch Stash",
    color: COLOR.paydayEmerald,
    image: "crits/romance/swampSmoochStash.webp",
    description: "Adds 80s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.swampSmoochStashSeconds),
  },
  tuskKissTally: {
    label: "Tusk Kiss Tally",
    color: COLOR.bullMarketGreen,
    image: "crits/romance/tuskKissTally.webp",
    description: "Ninety-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tuskKissTallyPayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
