import type { GOLDEN_ANIMALS_CRITS } from "../../critData/goldenAnimals";
import type { FeaturedRewards } from "./types";

export const GOLDEN_ANIMALS_REWARDS = {
  goldLion: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldLionSeconds),
  goldElephant: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldElephantShare),
  goldBear: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldBearSeconds),
  goldWolf: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldWolfShare),
  goldOwl: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldOwlSeconds),
  goldRam: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldRamShare),
  goldRabbit: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldRabbitSeconds),
  goldCat: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldCatShare),
  goldenLion: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, 1, balance.goldenLionUpgrades),
  platinumPaw: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.platinumPawTierSteps,
      balance.platinumPawUpgrades,
    ),
  gildedWyrm: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.gildedWyrmShare),
  bullionDrake: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(lowestLevel(context), balance.bullionDrakeTierSteps, balance.bullionDrakeUpgrades),
  slowAndGold: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], Math.floor(topLevel(context) / 2)),
  platinumPlume: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
} satisfies FeaturedRewards<typeof GOLDEN_ANIMALS_CRITS>;
