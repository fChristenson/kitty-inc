import type { COW_GIRLS_CRITS } from "../../critData/cowGirls";
import type { FeaturedRewards } from "./types";

export const COW_GIRLS_REWARDS = {
  bullRunBelle: (context, { actions }) =>
    actions.armCrit(context.floors, "crit"),
  cowbellCashout: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.cowbellCashoutWorkers),
  grazingGains: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.grazingGainsContinueChance),
  herdMentality: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.herdMentalityTierSteps, balance.herdMentalityUpgrades),
  moolahMaiden: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.moolahMaidenFloors),
  pasturePrime: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.pasturePrimeDiscount),
  rodeoReturns: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.rodeoReturnsSeconds),
  barnyardBullion: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.barnyardBullionTierSteps, balance.barnyardBullionUpgrades),
  bovineBonus: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bovineBonusDiscount),
  butterBarons: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.butterBaronsSeconds),
  cattleCall: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  cudChewerCash: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.cudChewerCashFloors),
  heiferHedgeFund: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.heiferHedgeFundBoostSeconds, balance.heiferHedgeFundExtraWorkers),
  hornOfPlenty: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  lassoLoot: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.lassoLootContinueChance),
  milkmaidMargin: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.milkmaidMarginTierSteps, balance.milkmaidMarginUpgrades),
  mooMentum: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.mooMentumDiscount),
  prairiePayday: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.prairiePaydayShare),
  spottedFortune: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  stampedeStocks: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.stampedeStocksFloors),
  coneLick: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.coneLickGrowth),
  softServeShare: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.softServeShareGrowth),
  strawberryScoop: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.strawberryScoopGrowth),
} satisfies FeaturedRewards<typeof COW_GIRLS_CRITS>;
