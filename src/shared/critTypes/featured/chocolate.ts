import type { CHOCOLATE_CRITS } from "../../critData/chocolate";
import type { FeaturedRewards } from "./types";

export const CHOCOLATE_REWARDS = {
  cocoaClout: (context, { balance, upgradeAndPay }) =>
    upgradeAndPay(
      [context.floor],
      balance.cocoaCloutUpgrades,
      balance.cocoaCloutPayouts,
    ),
  shadesOfCocoa: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.shadesOfCocoaPayouts,
    ),
  bigMugEnergy: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.bigMugEnergyBoostSeconds,
      balance.bigMugEnergyExtraWorkers,
    ),
  bonbonBigwig: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.bonbonBigwigTierSteps,
      balance.bonbonBigwigUpgrades,
    ),
  ganacheGains: (context, { actions, balance }) =>
    actions.upgrade(
      context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
      balance.ganacheGainsUpgrades,
    ),
  hazelnutHedgeFund: (context, { actions, balance, lowestLevel }) => {
    const lowest = lowestLevel(context);
    actions.upgrade([context.floor], balance.hazelnutHedgeFundUpgrades);
    if (lowest !== context.floor)
      actions.upgrade([lowest], balance.hazelnutHedgeFundUpgrades);
  },
  spreadTheWealth: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.spreadTheWealthSeconds),
  chocolateBarExam: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.chocolateBarExamContinueChance,
    ),
  darkChocolateDeal: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.darkChocolateDealDiscount),
  mousseMoxie: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  rockyRoadRally: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.rockyRoadRallyUpgrades),
} satisfies FeaturedRewards<typeof CHOCOLATE_CRITS>;
