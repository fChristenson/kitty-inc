import type { FRUITS_CRITS } from "../../critData/fruits";
import type { FeaturedRewards } from "./types";

export const FRUITS_REWARDS = {
  watermelonWindfall: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.watermelonWindfallBoostSeconds,
      balance.watermelonWindfallExtraWorkers,
    ),
  papayaPayroll: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.papayaPayrollPayouts),
  kiwiKickback: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.kiwiKickbackFloors),
  topBanana: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.topBananaBoostSeconds,
      balance.topBananaExtraWorkers,
    ),
  cherryOnTop: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.cherryOnTopDiscount),
  peachPerfect: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.peachPerfectTierSteps,
      balance.peachPerfectUpgrades,
    ),
  plumJob: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.plumJobDiscount),
  dragonfruitDynasty: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.dragonfruitDynastyDiscount,
    ),
  grapeExpectations: (context, { actions, balance, alternating }) =>
    actions.upgrade(alternating(context), balance.grapeExpectationsUpgrades),
  pomegranatePortfolio: (context, { actions, balance, lowestLevel }) => {
    const lowest = lowestLevel(context);
    actions.upgrade([context.floor], balance.pomegranatePortfolioUpgrades);
    if (lowest !== context.floor)
      actions.upgrade([lowest], balance.pomegranatePortfolioUpgrades);
  },
} satisfies FeaturedRewards<typeof FRUITS_CRITS>;
