import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createPlushiesRewards({
  actions,
  balance,
  lowestLevel,
  selectByRate,
  alternating,
}: RewardHelpers) {
  return {
    plushieDog: (context) =>
      actions.payCycles(context.floors, balance.plushieDogPayouts),
    plushieElephant: (context) =>
      actions.upgrade([context.floor], balance.plushieElephantUpgrades),
    plushieHamster: (context) =>
      actions.payCycles([context.floor], balance.plushieHamsterPayouts),
    plushieOtter: (context) =>
      actions.payCycles([context.floor], balance.plushieOtterPayouts),
    plushiePand: (context) =>
      actions.payCycles(context.floors, balance.plushiePandPayouts),
    plushiePenguin: (context) =>
      actions.upgrade([context.floor], balance.plushiePenguinUpgrades),
    plushieRabbit: (context) =>
      actions.upgrade(alternating(context), balance.plushieRabbitUpgrades),
    plushieRacoon: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.plushieRacoonPayouts,
      ),
    plushieSeal: (context) =>
      actions.upgrade([lowestLevel(context)], balance.plushieSealUpgrades),
    plushieTiger: (context) =>
      actions.upgrade([context.floor], balance.plushieTigerUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
