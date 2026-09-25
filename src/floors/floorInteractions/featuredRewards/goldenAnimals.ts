import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createGoldenAnimalsRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    goldLion: (context) =>
      actions.payCycles(context.floors, balance.goldLionPayouts),
    goldElephant: (context) =>
      actions.upgrade([context.floor], balance.goldElephantUpgrades),
    goldBear: (context) =>
      actions.payCycles(context.floors, balance.goldBearPayouts),
    goldWolf: (context) =>
      actions.upgrade([highestFloor(context)], balance.goldWolfUpgrades),
    goldOwl: (context) =>
      actions.payCycles([lowestLevel(context)], balance.goldOwlPayouts),
    goldRam: (context) =>
      actions.upgrade(alternating(context), balance.goldRamUpgrades),
    goldRabbit: (context) =>
      actions.payCycles([context.floor], balance.goldRabbitPayouts),
    goldCat: (context) =>
      actions.upgrade([context.floor], balance.goldCatUpgrades),
    goldenLion: (context) =>
      promoteAndUpgrade(context.floor, 1, balance.goldenLionUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
