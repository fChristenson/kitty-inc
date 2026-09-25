import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createGoodLuckRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    bubbleEconomy: (context) =>
      actions.payCycles([context.floor], balance.bubbleEconomyPayouts),
    cloudNineToFive: (context) =>
      actions.payCycles(context.floors, balance.cloudNineToFivePayouts),
    luckyLaundromat: (context) => {
      actions.upgrade(context.floors, balance.luckyLaundromatUpgrades);
      actions.payCycles(context.floors, balance.luckyLaundromatPayouts);
    },
    moneyMagnet: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.moneyMagnetPayouts,
      ),
    overTheRainbow: (context) =>
      actions.payCycles(alternating(context), balance.overTheRainbowPayouts),
    pocketDimension: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.pocketDimensionUpgrades,
      ),
    shootingStarEmployee: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.shootingStarEmployeeUpgrades,
      ),
    treasureMeasure: (context) =>
      actions.upgrade([lowestLevel(context)], balance.treasureMeasureUpgrades),
    wishfulBanking: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.wishfulBankingTierSteps,
        balance.wishfulBankingUpgrades,
      ),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
