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
    browniePoints: (context) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.browniePointsUpgrades,
        balance.browniePointsPayouts,
      ),
    torteReform: (context) =>
      actions.upgrade([highestFloor(context)], balance.torteReformUpgrades),
    justDesserts: (context) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.justDessertsUpgrades,
        balance.justDessertsPayouts,
      ),
    sweetVerdict: (context) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.sweetVerdictPayouts,
      ),
    operaCakeOverture: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.operaCakeOvertureTierSteps,
        balance.operaCakeOvertureUpgrades,
      ),
    sacherStockpile: (context) =>
      actions.payCycles([highestFloor(context)], balance.sacherStockpilePayouts),
    tripleLayerTreasury: (context) =>
      actions.upgrade(context.floors, balance.tripleLayerTreasuryUpgrades),
    layeredSecurity: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.layeredSecurityUpgrades,
        balance.layeredSecurityPayouts,
      ),
    mississippiMudMillionaire: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.mississippiMudMillionairePayouts,
      ),
    swissRollRollover: (context) =>
      actions.payCycles(alternating(context), balance.swissRollRolloverPayouts),
    chocolateDripDynamo: (context) =>
      actions.payCycles([lowestLevel(context)], balance.chocolateDripDynamoPayouts),
    marbleCakeMargin: (context) => {
      const highest = highestFloor(context);
      actions.upgrade([context.floor], balance.marbleCakeMarginUpgrades);
      if (highest !== context.floor)
        actions.upgrade([highest], balance.marbleCakeMarginUpgrades);
    },
    souffleSurplus: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.souffleSurplusUpgrades,
      ),
    onTheRise: (context) =>
      actions.upgrade([highestFloor(context)], balance.onTheRiseUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
