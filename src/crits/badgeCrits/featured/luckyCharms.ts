import type { LUCKY_CHARMS_CRITS } from "../critData/luckyCharms";
import type { FeaturedRewards } from "./types";

export const LUCKY_CHARMS_REWARDS = {
  bubbleEconomy: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.bubbleEconomyPayouts),
  cloudNineToFive: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.cloudNineToFiveFloors),
  luckyLaundromat: (context, { actions, balance }) => {
    actions.upgrade(context.floors, balance.luckyLaundromatUpgrades);
    actions.payCycles(context.floors, balance.luckyLaundromatPayouts);
  },
  moneyMagnet: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.moneyMagnetShare),
  overTheRainbow: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  pocketDimension: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  shootingStarEmployee: (context, { actions, balance, highestFloor }) =>
    actions.upgrade(
      [highestFloor(context)],
      balance.shootingStarEmployeeUpgrades,
    ),
  treasureMeasure: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.treasureMeasureSeconds),
  wishfulBanking: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.wishfulBankingTierSteps,
      balance.wishfulBankingUpgrades,
    ),
  amethyst: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  diamond: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.diamondShare),
  emerald: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.emeraldSeconds),
  goldNugget: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldNuggetShare),
  goldRush: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.goldRushBoostSeconds,
      balance.goldRushExtraWorkers,
    ),
  ruby: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.rubySeconds),
  saphire: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  silverRush: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.silverRushBoostSeconds,
      balance.silverRushExtraWorkers,
    ),
  rainbowGems: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.rainbowGemsGrowth),
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
} satisfies FeaturedRewards<typeof LUCKY_CHARMS_CRITS>;
