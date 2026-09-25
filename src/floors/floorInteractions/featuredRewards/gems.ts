import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createGemsRewards({
  actions,
  balance,
}: RewardHelpers) {
  return {
    amethyst: (context) =>
      actions.payCycles([context.floor], balance.amethystPayouts),
    diamond: (context) =>
      actions.payCycles([context.floor], balance.diamondPayouts),
    emerald: (context) =>
      actions.payCycles([context.floor], balance.emeraldPayouts),
    goldNugget: (context) =>
      actions.payCycles([context.floor], balance.goldNuggetPayouts),
    goldRush: (context) =>
      actions.payCycles(context.floors, balance.goldRushPayouts),
    ruby: (context) => actions.payCycles([context.floor], balance.rubyPayouts),
    saphire: (context) =>
      actions.payCycles([context.floor], balance.saphirePayouts),
    silverRush: (context) =>
      actions.payCycles(context.floors, balance.silverRushPayouts),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
