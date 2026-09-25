import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createSuperheroesRewards({
  actions,
  balance,
  selectByRate,
  alternating,
}: RewardHelpers) {
  return {
    purrfectOrigin: (context) =>
      actions.upgrade([context.floor], balance.purrfectOriginUpgrades),
    capeEscape: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.capeEscapePayouts,
      ),
    thunderPaws: (context) =>
      actions.upgrade(context.floors, balance.thunderPawsUpgrades),
    clawAndOrder: (context) =>
      actions.payCycles([context.floor], balance.clawAndOrderPayouts),
    felineFury: (context) =>
      actions.upgrade([context.floor], balance.felineFuryUpgrades),
    sidekickShuffle: (context) =>
      actions.upgrade(alternating(context), balance.sidekickShuffleUpgrades),
    cosmicCatapult: (context) =>
      actions.payCycles(context.floors, balance.cosmicCatapultPayouts),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
