import type { MOVIES_CRITS } from "../../critData/movies";
import type { FeaturedRewards } from "./types";

export const MOVIES_REWARDS = {
  backToTheFiscal: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  despicableFees: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.despicableFeesWorkers),
  howToTrainYourManager: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.howToTrainYourManagerDiscount,
    ),
  jurassicPerk: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.jurassicPerkPayouts),
  raidersOfTheLostReceipt: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.raidersOfTheLostReceiptDiscount,
    ),
  theDevilWearsPawda: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  theExpenseMatrix: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.theExpenseMatrixContinueChance),
  theFastAndTheFurriest: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.theFastAndTheFurriestBoostSeconds,
      balance.theFastAndTheFurriestExtraWorkers,
    ),
  theFellowshipOfTheBling: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.theFellowshipOfTheBlingShare),
  theGreatCatsby: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.theGreatCatsbyTierSteps,
      balance.theGreatCatsbyUpgrades,
    ),
  theLordOfTheRingBinders: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  wreckIt: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.wreckItUpgrades),
} satisfies FeaturedRewards<typeof MOVIES_CRITS>;
