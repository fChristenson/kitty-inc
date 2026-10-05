import type { MILK_CRITS } from "../../critData/milk";
import type { FeaturedRewards } from "./types";

export const MILK_REWARDS = {
  calciumCapital: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.calciumCapitalTierSteps, balance.calciumCapitalUpgrades),
  creamOfTheCrop: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.creamOfTheCropShare),
  dairyDividend: (context, { actions, lowestLevel }) =>
    actions.armCrit([lowestLevel(context)], "crit"),
  gotMilk: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  lactoseTycoon: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.lactoseTycoonFloors),
  milkMoney: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.milkMoneyDiscount),
  milkshakeMogul: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.milkshakeMogulBoostSeconds, balance.milkshakeMogulExtraWorkers),
  mooJuice: (context, { actions }) =>
    actions.giveOfficeChairs([context.floor]),
  skimProfits: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.skimProfitsContinueChance),
  udderSuccess: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.udderSuccessTierSteps, balance.udderSuccessUpgrades),
  wholeMilkHustle: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.wholeMilkHustleSeconds),
  bottleService: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.bottleServiceContinueChance),
  creameryCredit: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.creameryCreditTierSteps, balance.creameryCreditUpgrades),
  milkRun: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  pintSizedProfits: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.pintSizedProfitsFloors),
  milkMustacheDrake: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.milkMustacheDrakeShare),
  bottleChugWyvern: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.bottleChugWyvernBoostSeconds, balance.bottleChugWyvernExtraWorkers),
  jadeGlassGuzzle: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.jadeGlassGuzzleContinueChance),
  calciumCrusher: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.calciumCrusherDiscount),
  glassHalfFull: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.glassHalfFullSeconds),
} satisfies FeaturedRewards<typeof MILK_CRITS>;
