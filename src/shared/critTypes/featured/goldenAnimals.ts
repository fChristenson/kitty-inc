import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GOLDEN_ANIMALS_CRITS = {
  goldLion: {
    label: "Golden Lion",
    color: COLOR.gold,
    image: "crits/goldenAnimals/goldLion.webp",
    description: "Adds 13s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldLionSeconds),
  },
  goldElephant: {
    label: "Golden Elephant",
    color: COLOR.sunshineGold,
    image: "crits/goldenAnimals/goldElephant.webp",
    description: "Adds 6.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldElephantShare),
  },
  goldBear: {
    label: "Golden Bear",
    color: COLOR.orange,
    image: "crits/goldenAnimals/goldBear.webp",
    description: "Adds 13s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldBearSeconds),
  },
  goldWolf: {
    label: "Golden Wolf",
    color: COLOR.blue,
    image: "crits/goldenAnimals/goldWolf.webp",
    description: "Adds 6.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldWolfShare),
  },
  goldOwl: {
    label: "Golden Owl",
    color: COLOR.luckyCloverGreen,
    image: "crits/goldenAnimals/goldOwl.webp",
    description: "Adds 11s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldOwlSeconds),
  },
  goldRam: {
    label: "Golden Ram",
    color: COLOR.starYellow,
    image: "crits/goldenAnimals/goldRam.webp",
    description: "Adds 5.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldRamShare),
  },
  goldRabbit: {
    label: "Golden Rabbit",
    color: COLOR.springSalePink,
    image: "crits/goldenAnimals/goldRabbit.webp",
    description: "Adds 10s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldRabbitSeconds),
  },
  goldCat: {
    label: "Golden Cat",
    color: COLOR.teaBreakBrown,
    image: "crits/goldenAnimals/goldCat.webp",
    description: "Adds 5.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldCatShare),
  },
  goldenLion: {
    label: "King of the Jungle",
    color: COLOR.heavenlyGold,
    image: "crits/goldenAnimals/goldenLion.webp",
    description: "One tier promotion, then twenty free upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, 1, balance.goldenLionUpgrades),
  },
  platinumPaw: {
    label: "Platinum Paw",
    color: COLOR.silverTicketGray,
    image: "crits/goldenAnimals/platinumPaw.webp",
    description: "One tier promotion and forty-one upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.platinumPawTierSteps,
        balance.platinumPawUpgrades,
      ),
  },
  gildedWyrm: {
    label: "Gilded Wyrm",
    color: COLOR.amberMuted,
    image: "crits/goldenAnimals/gildedWyrm.webp",
    description: "Adds 20.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.gildedWyrmShare),
  },
  bullionDrake: {
    label: "Bullion Drake",
    color: COLOR.amber,
    image: "crits/goldenAnimals/bullionDrake.webp",
    description: "One tier promotion and ten upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(lowestLevel(context), balance.bullionDrakeTierSteps, balance.bullionDrakeUpgrades),
  },
  slowAndGold: {
    label: "Slow And Gold",
    color: COLOR.amber,
    image: "crits/goldenAnimals/slowAndGold.webp",
    description: "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], Math.floor(topLevel(context) / 2)),
  },
  platinumPlume: {
    label: "Platinum Plume",
    color: COLOR.amberMuted,
    image: "crits/goldenAnimals/platinumPlume.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
