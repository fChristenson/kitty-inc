import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const FEET_CRITS = {
  ankleAsset: {
    label: "Ankle Asset",
    color: COLOR.springSalePink,
    image: "crits/feet/ankleAsset.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.ankleAssetFloors),
  },
  archEnemyAssets: {
    label: "Arch Enemy Assets",
    color: COLOR.redActive,
    image: "crits/feet/archEnemyAssets.webp",
    description: "Boosts every worker for 38s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.archEnemyAssetsBoostSeconds, balance.archEnemyAssetsExtraWorkers),
  },
  barefootBanker: {
    label: "Barefoot Banker",
    color: COLOR.supplyRunTan,
    image: "crits/feet/barefootBanker.webp",
    description: "Hires 2 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.barefootBankerWorkers);
      actions.hireManagers(context.floors);
    },
  },
  bestFootForward: {
    label: "Best Foot Forward",
    color: COLOR.teaBreakBrown,
    image: "crits/feet/bestFootForward.webp",
    description: "Repeats the crit above and below, 62% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.bestFootForwardContinueChance),
  },
  coldFeetCash: {
    label: "Cold Feet Cash",
    color: COLOR.coinGold,
    image: "crits/feet/coldFeetCash.webp",
    description: "One tier promotion and seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.coldFeetCashTierSteps, balance.coldFeetCashUpgrades),
  },
  footInTheDoor: {
    label: "Foot In The Door",
    color: COLOR.coinGold,
    image: "crits/feet/footInTheDoor.webp",
    description: "Cuts every price in this building by 1.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.footInTheDoorDiscount),
  },
  footlooseFunds: {
    label: "Footloose Funds",
    color: COLOR.chairGiveawayBrown,
    image: "crits/feet/footlooseFunds.webp",
    description: "Adds 10.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.footlooseFundsShare),
  },
  heelTurnHaul: {
    label: "Heel Turn Haul",
    color: COLOR.peppermintPink,
    image: "crits/feet/heelTurnHaul.webp",
    description: "Boosts this floor's workers for 29s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers([context.floor], balance.heelTurnHaulBoostSeconds, balance.heelTurnHaulExtraWorkers),
  },
  pedicurePayout: {
    label: "Pedicure Payout",
    color: COLOR.supplyRunTan,
    image: "crits/feet/pedicurePayout.webp",
    description: "Arms every floor's next click as an x5 crit",
    reward: (context, { actions }) =>
      actions.armCrit(context.floors, "crit"),
  },
  sandalScandal: {
    label: "Sandal Scandal",
    color: COLOR.amberMuted,
    image: "crits/feet/sandalScandal.webp",
    description: "Raises alternating floors to the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(alternating(context), topLevel(context)),
  },
  sockItAway: {
    label: "Sock It Away",
    color: COLOR.teamBuildingCoral,
    image: "crits/feet/sockItAway.webp",
    description: "Boosts every worker for 19s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.sockItAwayBoostSeconds, balance.sockItAwayExtraWorkers),
  },
  soleProprietor: {
    label: "Sole Proprietor",
    color: COLOR.overflowBlue,
    image: "crits/feet/soleProprietor.webp",
    description: "Hires 1 free worker on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.hireWorkers(alternating(context), balance.soleProprietorWorkers),
  },
  stepUpStocks: {
    label: "Step Up Stocks",
    color: COLOR.overflowBlue,
    image: "crits/feet/stepUpStocks.webp",
    description: "Repeats the crit on the floor above, 25% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.stepUpStocksContinueChance),
  },
  tenToeTreasury: {
    label: "Ten Toe Treasury",
    color: COLOR.fastForwardBlue,
    image: "crits/feet/tenToeTreasury.webp",
    description: "One tier promotion and eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.tenToeTreasuryTierSteps, balance.tenToeTreasuryUpgrades),
  },
  tippyToeTycoon: {
    label: "Tippy Toe Tycoon",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/feet/tippyToeTycoon.webp",
    description: "Unlocks the next 5 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.tippyToeTycoonFloors),
  },
  toeRingRiches: {
    label: "Toe Ring Riches",
    color: COLOR.amberMuted,
    image: "crits/feet/toeRingRiches.webp",
    description: "Cuts every price in this building by 2.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.toeRingRichesDiscount),
  },
  toeTally: {
    label: "Toe Tally",
    color: COLOR.fullHouseCrimson,
    image: "crits/feet/toeTally.webp",
    description: "Adds 44s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.toeTallySeconds),
  },
  beanCounterPaws: {
    label: "Bean Counter Paws",
    color: COLOR.gold,
    image: "crits/feet/beanCounterPaws.webp",
    description: "Cuts every price in this building by 7.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.beanCounterPawsDiscount),
  },
  kittyToeCapital: {
    label: "Kitty Toe Capital",
    color: COLOR.fastForwardBlue,
    image: "crits/feet/kittyToeCapital.webp",
    description: "Adds 5.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.kittyToeCapitalShare),
  },
  pawPedicure: {
    label: "Paw Pedicure",
    color: COLOR.coinGold,
    image: "crits/feet/pawPedicure.webp",
    description: "Boosts every worker for 41s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.pawPedicureBoostSeconds, balance.pawPedicureExtraWorkers),
  },
  pawprintProfits: {
    label: "Pawprint Profits",
    color: COLOR.amberMuted,
    image: "crits/feet/pawprintProfits.webp",
    description: "Repeats the crit above and below, 68% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.pawprintProfitsContinueChance),
  },
  toeBeanTreasury: {
    label: "Toe Bean Treasury",
    color: COLOR.gold,
    image: "crits/feet/toeBeanTreasury.webp",
    description: "Two tier promotions and thirty-one upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.toeBeanTreasuryTierSteps, balance.toeBeanTreasuryUpgrades),
  },
  whiskerWalk: {
    label: "Whisker Walk",
    color: COLOR.amberMuted,
    image: "crits/feet/whiskerWalk.webp",
    description: "Cuts every price in this building by 7.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.whiskerWalkDiscount),
  },
  chromeSoleShine: {
    label: "Chrome Sole Shine",
    color: COLOR.overflowBlue,
    image: "crits/feet/chromeSoleShine.webp",
    description: "Repeats the crit above and below, 97% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.chromeSoleShineContinueChance),
  },
  doubleSoleMoo: {
    label: "Double Sole Moo",
    color: COLOR.sameBoatCoral,
    image: "crits/feet/doubleSoleMoo.webp",
    description: "Cuts every price in this building by 16.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.doubleSoleMooDiscount),
  },
  jadeTalonToes: {
    label: "Jade Talon Toes",
    color: COLOR.threeOfAKindGreen,
    image: "crits/feet/jadeTalonToes.webp",
    description: "Repeats the crit on the floor below, 82% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.jadeTalonToesContinueChance),
  },
  magentaScaleSoles: {
    label: "Magenta Scale Soles",
    color: COLOR.grandOpeningRose,
    image: "crits/feet/magentaScaleSoles.webp",
    description: "Cuts every price in this building by 17.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.magentaScaleSolesDiscount),
  },
  rubyWyrmSoles: {
    label: "Ruby Wyrm Soles",
    color: COLOR.redActive,
    image: "crits/feet/rubyWyrmSoles.webp",
    description: "Boosts every worker for 128s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.rubyWyrmSolesBoostSeconds, balance.rubyWyrmSolesExtraWorkers),
  },
  azureDrakeToes: {
    label: "Azure Drake Toes",
    color: COLOR.overflowBlue,
    image: "crits/feet/azureDrakeToes.webp",
    description: "Repeats the crit on the floor above, 83% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.azureDrakeToesContinueChance),
  },
  emberHeelHoard: {
    label: "Ember Heel Hoard",
    color: COLOR.doubleDownCrimson,
    image: "crits/feet/emberHeelHoard.webp",
    description: "Adds 14.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.emberHeelHoardShare),
  },
  pinkPadWyvern: {
    label: "Pink Pad Wyvern",
    color: COLOR.overflowBlue,
    image: "crits/feet/pinkPadWyvern.webp",
    description: "Boosts every worker for 129s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.pinkPadWyvernBoostSeconds, balance.pinkPadWyvernExtraWorkers),
  },
  midnightSoles: {
    label: "Midnight Soles",
    color: COLOR.doubleDownCrimson,
    image: "crits/feet/midnightSoles.webp",
    description: "Cuts every price in this building by 18.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.midnightSolesDiscount),
  },
  crimsonCapeSoles: {
    label: "Crimson Cape Soles",
    color: COLOR.doubleDownCrimson,
    image: "crits/feet/crimsonCapeSoles.webp",
    description: "Adds 51s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.crimsonCapeSolesSeconds),
  },
  bigHoopHustle: {
    label: "Big Hoop Hustle",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/bigHoopHustle.webp",
    description: "Repeats the crit on the floor below, 88% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.bigHoopHustleContinueChance),
  },
  bubblegumTwins: {
    label: "Bubblegum Twins",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/bubblegumTwins.webp",
    description: "Cuts every price in this building by 18.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.bubblegumTwinsDiscount),
  },
  cooldownStretch: {
    label: "Cooldown Stretch",
    color: COLOR.luckyCloverGreen,
    image: "crits/feet/cooldownStretch.webp",
    description: "Adds 53s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.cooldownStretchSeconds),
  },
  cuddleClanComfort: {
    label: "Cuddle Clan Comfort",
    color: COLOR.luckyCloverGreen,
    image: "crits/feet/cuddleClanComfort.webp",
    description: "Boosts every worker for 142s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.cuddleClanComfortBoostSeconds, balance.cuddleClanComfortExtraWorkers),
  },
  cutoffCash: {
    label: "Cutoff Cash",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/cutoffCash.webp",
    description: "Repeats the crit on the floor above, 89% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.cutoffCashContinueChance),
  },
  greenFootRub: {
    label: "Green Foot Rub",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/greenFootRub.webp",
    description: "Cuts every price in this building by 18.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.greenFootRubDiscount),
  },
  hotPinkPads: {
    label: "Hot Pink Pads",
    color: COLOR.sameBoatCoral,
    image: "crits/feet/hotPinkPads.webp",
    description: "Adds 54s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.hotPinkPadsSeconds),
  },
  kickBackCapital: {
    label: "Kick Back Capital",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/kickBackCapital.webp",
    description: "Boosts every worker for 143s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.kickBackCapitalBoostSeconds, balance.kickBackCapitalExtraWorkers),
  },
  lazySundaySoles: {
    label: "Lazy Sunday Soles",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/lazySundaySoles.webp",
    description: "Repeats the crit on the floor below, 89% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.lazySundaySolesContinueChance),
  },
  lemonSole: {
    label: "Lemon Sole",
    color: COLOR.coinGold,
    image: "crits/feet/lemonSole.webp",
    description: "Cuts every price in this building by 18.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.lemonSoleDiscount),
  },
  logLoungeSoles: {
    label: "Log Lounge Soles",
    color: COLOR.luckyCloverGreen,
    image: "crits/feet/logLoungeSoles.webp",
    description: "Adds 55s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.logLoungeSolesSeconds),
  },
  mirrorImageSoles: {
    label: "Mirror Image Soles",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/mirrorImageSoles.webp",
    description: "Boosts every worker for 145s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.mirrorImageSolesBoostSeconds, balance.mirrorImageSolesExtraWorkers),
  },
  muscleToeMogul: {
    label: "Muscle Toe Mogul",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/muscleToeMogul.webp",
    description: "Repeats the crit on the floor above, 90% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.muscleToeMogulContinueChance),
  },
  neonSoleSquad: {
    label: "Neon Sole Squad",
    color: COLOR.moneyGreen,
    image: "crits/feet/neonSoleSquad.webp",
    description: "Cuts every price in this building by 18.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.neonSoleSquadDiscount),
  },
  overallProfits: {
    label: "Overall Profits",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/overallProfits.webp",
    description: "Adds 56s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.overallProfitsSeconds),
  },
  punkRockPedicure: {
    label: "Punk Rock Pedicure",
    color: COLOR.gold,
    image: "crits/feet/punkRockPedicure.webp",
    description: "Boosts every worker for 146s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.punkRockPedicureBoostSeconds, balance.punkRockPedicureExtraWorkers),
  },
  scrapyardSoles: {
    label: "Scrapyard Soles",
    color: COLOR.bullMarketGreen,
    image: "crits/feet/scrapyardSoles.webp",
    description: "Repeats the crit on the floor below, 90% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.scrapyardSolesContinueChance),
  },
  soleSpotlight: {
    label: "Sole Spotlight",
    color: COLOR.luckyCloverGreen,
    image: "crits/feet/soleSpotlight.webp",
    description: "Cuts every price in this building by 19%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.soleSpotlightDiscount),
  },
  sunnySoleSisters: {
    label: "Sunny Sole Sisters",
    color: COLOR.summerSaleOrange,
    image: "crits/feet/sunnySoleSisters.webp",
    description: "Adds 57s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.sunnySoleSistersSeconds),
  },
  tenderTuskRub: {
    label: "Tender Tusk Rub",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/tenderTuskRub.webp",
    description: "Boosts every worker for 147s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.tenderTuskRubBoostSeconds, balance.tenderTuskRubExtraWorkers),
  },
  tickleTax: {
    label: "Tickle Tax",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/tickleTax.webp",
    description: "Repeats the crit on the floor above, 91% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.tickleTaxContinueChance),
  },
  tripleToeThreat: {
    label: "Triple Toe Threat",
    color: COLOR.luckyCloverGreen,
    image: "crits/feet/tripleToeThreat.webp",
    description: "Cuts every price in this building by 19.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.tripleToeThreatDiscount),
  },
  tuskedToeTrade: {
    label: "Tusked Toe Trade",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/tuskedToeTrade.webp",
    description: "Adds 20.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.tuskedToeTradeShare),
  },
  tusksAndToes: {
    label: "Tusks And Toes",
    color: COLOR.luckyCloverGreen,
    image: "crits/feet/tusksAndToes.webp",
    description: "Boosts every worker for 148s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.tusksAndToesBoostSeconds, balance.tusksAndToesExtraWorkers),
  },
  twinBraidTreads: {
    label: "Twin Braid Treads",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/twinBraidTreads.webp",
    description: "Repeats the crit on the floor below, 91% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.twinBraidTreadsContinueChance),
  },
  warbandWiggles: {
    label: "Warband Wiggles",
    color: COLOR.luckyCloverGreen,
    image: "crits/feet/warbandWiggles.webp",
    description: "Cuts every price in this building by 19.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.warbandWigglesDiscount),
  },
  warchiefPedicure: {
    label: "Warchief Pedicure",
    color: COLOR.disabledGray,
    image: "crits/feet/warchiefPedicure.webp",
    description: "Adds 20.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.warchiefPedicureShare),
  },
  barefootRangers: {
    label: "Barefoot Rangers",
    color: COLOR.amberMuted,
    image: "crits/feet/barefootRangers.webp",
    description: "Boosts every worker for 162s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.barefootRangersBoostSeconds, balance.barefootRangersExtraWorkers),
  },
  bloodBank: {
    label: "Blood Bank",
    color: COLOR.doubleDownCrimson,
    image: "crits/feet/bloodBank.webp",
    description: "Cuts every price in this building by 20.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.bloodBankDiscount),
  },
  bloodSisters: {
    label: "Blood Sisters",
    color: COLOR.sameBoatCoral,
    image: "crits/feet/bloodSisters.webp",
    description: "Adds 21.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.bloodSistersShare),
  },
  cryptKeeper: {
    label: "Crypt Keeper",
    color: COLOR.doubleDownCrimson,
    image: "crits/feet/cryptKeeper.webp",
    description: "Boosts every worker for 163s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.cryptKeeperBoostSeconds, balance.cryptKeeperExtraWorkers),
  },
  fangShui: {
    label: "Fang Shui",
    color: COLOR.doubleDownCrimson,
    image: "crits/feet/fangShui.webp",
    description: "Cuts every price in this building by 20.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.fangShuiDiscount),
  },
  feelingBlue: {
    label: "Feeling Blue",
    color: COLOR.overflowBlue,
    image: "crits/feet/feelingBlue.webp",
    description: "Adds 22% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.feelingBlueShare),
  },
  ghostOfAChance: {
    label: "Ghost Of A Chance",
    color: COLOR.doubleDownCrimson,
    image: "crits/feet/ghostOfAChance.webp",
    description: "Boosts every worker for 164s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.ghostOfAChanceBoostSeconds, balance.ghostOfAChanceExtraWorkers),
  },
  nightKicker: {
    label: "Night Kicker",
    color: COLOR.doubleDownCrimson,
    image: "crits/feet/nightKicker.webp",
    description: "Cuts every price in this building by 20.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.nightKickerDiscount),
  },
  oddCouple: {
    label: "Odd Couple",
    color: COLOR.gold,
    image: "crits/feet/oddCouple.webp",
    description: "Adds 22.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.oddCoupleShare),
  },
  onTheBall: {
    label: "On The Ball",
    color: COLOR.amberMuted,
    image: "crits/feet/onTheBall.webp",
    description: "Boosts every worker for 165s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.onTheBallBoostSeconds, balance.onTheBallExtraWorkers),
  },
  redVelvetCape: {
    label: "Red Velvet Cape",
    color: COLOR.nightShiftIndigo,
    image: "crits/feet/redVelvetCape.webp",
    description: "Cuts every price in this building by 20.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.redVelvetCapeDiscount),
  },
  theCountess: {
    label: "The Countess",
    color: COLOR.doubleDownCrimson,
    image: "crits/feet/theCountess.webp",
    description: "Adds 22.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.theCountessShare),
  },
  woodlandWanderers: {
    label: "Woodland Wanderers",
    color: COLOR.amberMuted,
    image: "crits/feet/woodlandWanderers.webp",
    description: "Boosts every worker for 166s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.woodlandWanderersBoostSeconds, balance.woodlandWanderersExtraWorkers),
  },
  ballGownBonus: {
    label: "Ball Gown Bonus",
    color: COLOR.overflowBlue,
    image: "crits/feet/ballGownBonus.webp",
    description: "Adds 22.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.ballGownBonusShare),
  },
  fullCircleCapital: {
    label: "Full Circle Capital",
    color: COLOR.overflowBlue,
    image: "crits/feet/fullCircleCapital.webp",
    description: "Adds 22.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.fullCircleCapitalShare),
  },
  legUpLedger: {
    label: "Leg Up Ledger",
    color: COLOR.sameBoatCoral,
    image: "crits/feet/legUpLedger.webp",
    description: "Adds 22.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.legUpLedgerShare),
  },
  pixieCutPayday: {
    label: "Pixie Cut Payday",
    color: COLOR.nightShiftIndigo,
    image: "crits/feet/pixieCutPayday.webp",
    description: "Adds 22.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pixieCutPaydayShare),
  },
  sunsetSoleSavings: {
    label: "Sunset Sole Savings",
    color: COLOR.rainCheckBlue,
    image: "crits/feet/sunsetSoleSavings.webp",
    description: "Adds 23% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sunsetSoleSavingsShare),
  },
  flexiblePricing: {
    label: "Flexible Pricing",
    color: COLOR.fullHouseCrimson,
    image: "crits/feet/flexiblePricing.webp",
    description: "Cuts every price in this building by 21.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.flexiblePricingDiscount),
  },
  goldenBeltGrind: {
    label: "Golden Belt Grind",
    color: COLOR.overflowBlue,
    image: "crits/feet/goldenBeltGrind.webp",
    description: "Boosts every worker for 170s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.goldenBeltGrindBoostSeconds, balance.goldenBeltGrindExtraWorkers),
  },
  highKickMarkdown: {
    label: "High Kick Markdown",
    color: COLOR.nightShiftIndigo,
    image: "crits/feet/highKickMarkdown.webp",
    description: "Cuts every price in this building by 21.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.highKickMarkdownDiscount),
  },
  petticoatPriceCut: {
    label: "Petticoat Price Cut",
    color: COLOR.summerSaleOrange,
    image: "crits/feet/petticoatPriceCut.webp",
    description: "Cuts every price in this building by 21.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.petticoatPriceCutDiscount),
  },
  pinkCarpetKickoff: {
    label: "Pink Carpet Kickoff",
    color: COLOR.fullHouseCrimson,
    image: "crits/feet/pinkCarpetKickoff.webp",
    description: "Boosts every worker for 171s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.pinkCarpetKickoffBoostSeconds, balance.pinkCarpetKickoffExtraWorkers),
  },
  rainbowRuffleRally: {
    label: "Rainbow Ruffle Rally",
    color: COLOR.fastForwardBlue,
    image: "crits/feet/rainbowRuffleRally.webp",
    description: "Boosts every worker for 172s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.rainbowRuffleRallyBoostSeconds, balance.rainbowRuffleRallyExtraWorkers),
  },
  redCarpetClearance: {
    label: "Red Carpet Clearance",
    color: COLOR.doubleDownCrimson,
    image: "crits/feet/redCarpetClearance.webp",
    description: "Cuts every price in this building by 21.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.redCarpetClearanceDiscount),
  },
  tightLacedTeam: {
    label: "Tight Laced Team",
    color: COLOR.sameBoatCoral,
    image: "crits/feet/tightLacedTeam.webp",
    description: "Boosts every worker for 173s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.tightLacedTeamBoostSeconds, balance.tightLacedTeamExtraWorkers),
  },
  faceValue: {
    label: "Face Value",
    color: COLOR.amberMuted,
    image: "crits/feet/faceValue.webp",
    description: "Adds 23.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.faceValueShare),
  },
  heelDeal: {
    label: "Heel Deal",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/feet/heelDeal.webp",
    description: "Eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.heelDealPayouts),
  },
  soleCustody: {
    label: "Sole Custody",
    color: COLOR.summerSaleOrange,
    image: "crits/feet/soleCustody.webp",
    description: "Adds 23.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.soleCustodyShare),
  },
  splitTheProfits: {
    label: "Split the Profits",
    color: COLOR.chairGiveawayBrown,
    image: "crits/feet/splitTheProfits.webp",
    description: "Adds 23.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.splitTheProfitsShare),
  },
  tickledPinkPayout: {
    label: "Tickled Pink Payout",
    color: COLOR.summerSaleOrange,
    image: "crits/feet/tickledPinkPayout.webp",
    description: "Nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tickledPinkPayoutPayouts),
  },
  emeraldToeEarnings: {
    label: "Emerald Toe Earnings",
    color: COLOR.paydayEmerald,
    image: "crits/feet/emeraldToeEarnings.webp",
    description: "Adds 24.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.emeraldToeEarningsShare),
  },
  footTheBill: {
    label: "Foot the Bill",
    color: COLOR.amberMuted,
    image: "crits/feet/footTheBill.webp",
    description: "Thirty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.footTheBillPayouts),
  },
  greenToeGreenbacks: {
    label: "Green Toe Greenbacks",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/greenToeGreenbacks.webp",
    description: "Thirty-seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.greenToeGreenbacksPayouts),
  },
  lyingLowLedger: {
    label: "Lying Low Ledger",
    color: COLOR.amberMuted,
    image: "crits/feet/lyingLowLedger.webp",
    description: "Adds 24.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.lyingLowLedgerShare),
  },
  toeToToeTrade: {
    label: "Toe to Toe Trade",
    color: COLOR.teaBreakBrown,
    image: "crits/feet/toeToToeTrade.webp",
    description: "Fifty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.toeToToeTradeUpgrades),
  },
  doubleDuel: {
    label: "Double Duel",
    color: COLOR.sameBoatCoral,
    image: "crits/feet/doubleDuel.webp",
    description: "Grows every unlocked floor's level by 6.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.doubleDuelGrowth),
  },
  circleOfToes: {
    label: "Circle of Toes",
    color: COLOR.sunshineGold,
    image: "crits/feet/circleOfToes.webp",
    description: "Spreads 98 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.circleOfToesUpgrades),
  },
  daisyDuel: {
    label: "Daisy Duel",
    color: COLOR.threeOfAKindGreen,
    image: "crits/feet/daisyDuel.webp",
    description: "Pays 17 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.daisyDuelMultiple),
  },
  fullStretch: {
    label: "Full Stretch",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/fullStretch.webp",
    description: "Grows every unlocked floor's level by 2.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.fullStretchGrowth),
  },
  goblinGrins: {
    label: "Goblin Grins",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/feet/goblinGrins.webp",
    description: "Spreads 99 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.goblinGrinsUpgrades),
  },
  solePress: {
    label: "Sole Press",
    color: COLOR.threeOfAKindGreen,
    image: "crits/feet/solePress.webp",
    description: "Pays 11 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.solePressMultiple),
  },
  toeTussle: {
    label: "Toe Tussle",
    color: COLOR.gold,
    image: "crits/feet/toeTussle.webp",
    description: "Grows every unlocked floor's level by 2.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.toeTussleGrowth),
  },
  toeGrip: {
    label: "Toe Grip",
    color: COLOR.amberMuted,
    image: "crits/feet/toeGrip.webp",
    description: "Spreads 12 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.toeGripUpgrades),
  },
  toePyramid: {
    label: "Toe Pyramid",
    color: COLOR.summerSaleOrange,
    image: "crits/feet/toePyramid.webp",
    description: "Pays 18 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.toePyramidMultiple),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
