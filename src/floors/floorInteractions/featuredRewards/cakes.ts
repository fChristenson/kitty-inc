import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createCakesRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
  upgradeAndPay,
  cascadeDown,
}: RewardHelpers) {
  return {
    blackForestFortune: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.blackForestFortuneUpgrades,
        balance.blackForestFortunePayouts,
      ),
    redVelvetRope: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.redVelvetRopeTierSteps,
        balance.redVelvetRopeUpgrades,
      ),
    tiramisuTycoon: (context) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.tiramisuTycoonUpgrades,
        balance.tiramisuTycoonPayouts,
      ),
    cheesecakeChairman: (context) =>
      actions.upgrade([context.floor], balance.cheesecakeChairmanUpgrades),
    carrotCakeCapital: (context) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.carrotCakeCapitalUpgrades,
        balance.carrotCakeCapitalPayouts,
      ),
    angelFoodAscension: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.angelFoodAscensionTierSteps,
        balance.angelFoodAscensionUpgrades,
      ),
    poundCakeProfits: (context) =>
      actions.payCycles([context.floor], balance.poundCakeProfitsPayouts),
    bundtFund: (context) =>
      actions.payCycles(alternating(context), balance.bundtFundPayouts),
    lavaCakeLiquidity: (context) =>
      actions.payCycles([highestFloor(context)], balance.lavaCakeLiquidityPayouts),
    upsideDownUpswing: (context) =>
      actions.upgrade(cascadeDown(context), balance.upsideDownUpswingUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
