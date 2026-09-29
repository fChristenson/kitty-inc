import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const COW_GIRLS_CRITS = {
  bullRunBelle: {
    label: "Bull Run Belle",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cowGirls/bullRunBelle.webp",
    description: "Arms every floor's next click as an x5 crit",
    reward: (context, { actions }) =>
      actions.armCrit(context.floors, "crit"),
  },
  cashCow: {
    label: "Cash Cow",
    color: COLOR.nightOwlIndigo,
    image: "crits/cowGirls/cashCow.webp",
    description: "Boosts every worker for 19s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.cashCowBoostSeconds, balance.cashCowExtraWorkers),
  },
  cowbellCashout: {
    label: "Cowbell Cashout",
    color: COLOR.headhunterRust,
    image: "crits/cowGirls/cowbellCashout.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.cowbellCashoutWorkers),
  },
  grazingGains: {
    label: "Grazing Gains",
    color: COLOR.supplyRunTan,
    image: "crits/cowGirls/grazingGains.webp",
    description: "Repeats the crit on the floor below, 14% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.grazingGainsContinueChance),
  },
  herdMentality: {
    label: "Herd Mentality",
    color: COLOR.amber,
    image: "crits/cowGirls/herdMentality.webp",
    description: "One tier promotion and seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.herdMentalityTierSteps, balance.herdMentalityUpgrades),
  },
  holsteinHustle: {
    label: "Holstein Hustle",
    color: COLOR.springCleaningMint,
    image: "crits/cowGirls/holsteinHustle.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  moolahMaiden: {
    label: "Moolah Maiden",
    color: COLOR.springSalePink,
    image: "crits/cowGirls/moolahMaiden.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.moolahMaidenFloors),
  },
  pasturePrime: {
    label: "Pasture Prime",
    color: COLOR.nightOwlIndigo,
    image: "crits/cowGirls/pasturePrime.webp",
    description: "Cuts every price in this building by 1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.pasturePrimeDiscount),
  },
  rodeoReturns: {
    label: "Rodeo Returns",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cowGirls/rodeoReturns.webp",
    description: "Adds 43s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.rodeoReturnsSeconds),
  },
  barnyardBullion: {
    label: "Barnyard Bullion",
    color: COLOR.overflowBlue,
    image: "crits/cowGirls/barnyardBullion.webp",
    description: "One tier promotion and eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.barnyardBullionTierSteps, balance.barnyardBullionUpgrades),
  },
  bovineBonus: {
    label: "Bovine Bonus",
    color: COLOR.teamBuildingCoral,
    image: "crits/cowGirls/bovineBonus.webp",
    description: "Cuts every price in this building by 1.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.bovineBonusDiscount),
  },
  butterBarons: {
    label: "Butter Barons",
    color: COLOR.teamBuildingCoral,
    image: "crits/cowGirls/butterBarons.webp",
    description: "Adds 5s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.butterBaronsSeconds),
  },
  cattleCall: {
    label: "Cattle Call",
    color: COLOR.amberMuted,
    image: "crits/cowGirls/cattleCall.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  cudChewerCash: {
    label: "Cud Chewer Cash",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cowGirls/cudChewerCash.webp",
    description: "Unlocks the next 5 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.cudChewerCashFloors),
  },
  heiferHedgeFund: {
    label: "Heifer Hedge Fund",
    color: COLOR.nightOwlIndigo,
    image: "crits/cowGirls/heiferHedgeFund.webp",
    description: "Boosts every worker for 30s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.heiferHedgeFundBoostSeconds, balance.heiferHedgeFundExtraWorkers),
  },
  hornOfPlenty: {
    label: "Horn Of Plenty",
    color: COLOR.amberMuted,
    image: "crits/cowGirls/hornOfPlenty.webp",
    description: "Free office supplies for every unlocked floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies(context.floors),
  },
  lassoLoot: {
    label: "Lasso Loot",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/cowGirls/lassoLoot.webp",
    description: "Repeats the crit on the floor above, 12% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.lassoLootContinueChance),
  },
  milkmaidMargin: {
    label: "Milkmaid Margin",
    color: COLOR.overflowBlue,
    image: "crits/cowGirls/milkmaidMargin.webp",
    description: "One tier promotion and nine upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.milkmaidMarginTierSteps, balance.milkmaidMarginUpgrades),
  },
  mooMentum: {
    label: "Moo Mentum",
    color: COLOR.nightOwlIndigo,
    image: "crits/cowGirls/mooMentum.webp",
    description: "Cuts every price in this building by 1.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.mooMentumDiscount),
  },
  prairiePayday: {
    label: "Prairie Payday",
    color: COLOR.teaBreakBrown,
    image: "crits/cowGirls/prairiePayday.webp",
    description: "Adds 10.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.prairiePaydayShare),
  },
  spottedFortune: {
    label: "Spotted Fortune",
    color: COLOR.rainCheckBlue,
    image: "crits/cowGirls/spottedFortune.webp",
    description: "Raises alternating floors to the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(alternating(context), topLevel(context)),
  },
  stampedeStocks: {
    label: "Stampede Stocks",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/cowGirls/stampedeStocks.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.stampedeStocksFloors),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;