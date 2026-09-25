import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createOceanRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  cascadeDown,
}: RewardHelpers) {
  return {
    treasureMap: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.treasureMapPayouts,
      ),
    captainLeFluff: (context) =>
      actions.upgrade([highestFloor(context)], balance.captainLeFluffUpgrades),
    divingBell: (context) =>
      actions.upgrade(cascadeDown(context), balance.divingBellUpgrades),
    flooringInspector: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.flooringInspectorUpgrades,
      ),
    kraken: (context) =>
      actions.payCycles(context.floors, balance.krakenPayouts),
    messageInABottle: (context) =>
      actions.upgrade([lowestLevel(context)], balance.messageInABottleUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
