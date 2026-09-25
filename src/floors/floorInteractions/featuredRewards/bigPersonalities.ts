import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createBigPersonalitiesRewards({
  actions,
  balance,
  highestFloor,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    abraCashDabra: (context) =>
      actions.payCycles([context.floor], balance.abraCashDabraPayouts),
    captainOfIndustry: (context) =>
      actions.upgrade(context.floors, balance.captainOfIndustryUpgrades),
    clowningAround: (context) => {
      actions.upgrade(context.floors, balance.clowningAroundUpgrades);
      actions.payCycles(context.floors, balance.clowningAroundPayouts);
    },
    discoDividend: (context) =>
      actions.payCycles(alternating(context), balance.discoDividendPayouts),
    mimeYourBusiness: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.mimeYourBusinessUpgrades,
      ),
    redCarpetTreatment: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.redCarpetTreatmentPayouts,
      ),
    rockTheStock: (context) =>
      actions.upgrade([context.floor], balance.rockTheStockUpgrades),
    strongReturn: (context) =>
      actions.upgrade([highestFloor(context)], balance.strongReturnUpgrades),
    theBigCheese: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.theBigCheeseTierSteps,
        balance.theBigCheeseUpgrades,
      ),
    queenOfQueens: (context) =>
      actions.upgrade(context.floors, balance.queenOfQueensUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
