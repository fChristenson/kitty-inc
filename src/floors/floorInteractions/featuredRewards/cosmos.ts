import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createCosmosRewards({
  actions,
  balance,
  highestFloor,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    blackHole: (context) =>
      actions.payCycles(context.floors, balance.blackHolePayouts),
    bottledNebula: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.bottledNebulaTierSteps,
        balance.bottledNebulaUpgrades,
      ),
    eclipse: (context) =>
      actions.upgrade([highestFloor(context)], balance.eclipseUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
