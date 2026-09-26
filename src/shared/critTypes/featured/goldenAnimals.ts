import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GOLDEN_ANIMALS_CRITS = {
  goldLion: {
    label: "Golden Lion",
    color: COLOR.gold,
    image: "crits/goldenAnimals/goldLion.png",
    description: "Twenty-seven instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.goldLionPayouts),
  },
  goldElephant: {
    label: "Golden Elephant",
    color: COLOR.sunshineGold,
    image: "crits/goldenAnimals/goldElephant.png",
    description: "Twenty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.goldElephantUpgrades),
  },
  goldBear: {
    label: "Golden Bear",
    color: COLOR.orange,
    image: "crits/goldenAnimals/goldBear.png",
    description: "Twenty-four instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.goldBearPayouts),
  },
  goldWolf: {
    label: "Golden Wolf",
    color: COLOR.blue,
    image: "crits/goldenAnimals/goldWolf.png",
    description: "Twenty-two free upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.goldWolfUpgrades),
  },
  goldOwl: {
    label: "Golden Owl",
    color: COLOR.luckyCloverGreen,
    image: "crits/goldenAnimals/goldOwl.png",
    description: "Twenty instant payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.goldOwlPayouts),
  },
  goldRam: {
    label: "Golden Ram",
    color: COLOR.starYellow,
    image: "crits/goldenAnimals/goldRam.png",
    description: "Eighteen free upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.goldRamUpgrades),
  },
  goldRabbit: {
    label: "Golden Rabbit",
    color: COLOR.springSalePink,
    image: "crits/goldenAnimals/goldRabbit.png",
    description: "Thirteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.goldRabbitPayouts),
  },
  goldCat: {
    label: "Golden Cat",
    color: COLOR.teaBreakBrown,
    image: "crits/goldenAnimals/goldCat.png",
    description: "Fifteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.goldCatUpgrades),
  },
  goldenLion: {
    label: "King of the Jungle",
    color: COLOR.heavenlyGold,
    image: "crits/goldenAnimals/goldenLion.png",
    description: "One tier promotion, then twenty free upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, 1, balance.goldenLionUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
