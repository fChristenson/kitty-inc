import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createFruitsRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
  upgradeAndPay,
}: RewardHelpers) {
  return {
    watermelonWindfall: (context) =>
      actions.upgrade(context.floors, balance.watermelonWindfallUpgrades),
    papayaPayroll: (context) =>
      actions.payCycles(context.floors, balance.papayaPayrollPayouts),
    kiwiKickback: (context) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.kiwiKickbackPayouts,
      ),
    topBanana: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.topBananaPayouts,
      ),
    cherryOnTop: (context) =>
      actions.upgrade([highestFloor(context)], balance.cherryOnTopUpgrades),
    peachPerfect: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.peachPerfectTierSteps,
        balance.peachPerfectUpgrades,
      ),
    plumJob: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.plumJobUpgrades,
        balance.plumJobPayouts,
      ),
    dragonfruitDynasty: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.dragonfruitDynastyUpgrades,
      ),
    grapeExpectations: (context) =>
      actions.upgrade(alternating(context), balance.grapeExpectationsUpgrades),
    pomegranatePortfolio: (context) => {
      const lowest = lowestLevel(context);
      actions.upgrade([context.floor], balance.pomegranatePortfolioUpgrades);
      if (lowest !== context.floor)
        actions.upgrade([lowest], balance.pomegranatePortfolioUpgrades);
    },
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
