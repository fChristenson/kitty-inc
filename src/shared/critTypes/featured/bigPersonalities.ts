import type { BIG_PERSONALITIES_CRITS } from "../../critData/bigPersonalities";
import type { FeaturedRewards } from "./types";

export const BIG_PERSONALITIES_REWARDS = {
  abraCashDabra: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.abraCashDabraSeconds),
  captainOfIndustry: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.captainOfIndustryBoostSeconds,
      balance.captainOfIndustryExtraWorkers,
    ),
  clowningAround: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.clowningAroundFloors),
  discoDividend: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  mimeYourBusiness: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  redCarpetTreatment: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.redCarpetTreatmentPayouts,
    ),
  rockTheStock: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rockTheStockShare),
  strongReturn: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  theBigCheese: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.theBigCheeseTierSteps,
      balance.theBigCheeseUpgrades,
    ),
  queenOfQueens: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.queenOfQueensTierSteps,
      balance.queenOfQueensUpgrades,
    ),
} satisfies FeaturedRewards<typeof BIG_PERSONALITIES_CRITS>;
