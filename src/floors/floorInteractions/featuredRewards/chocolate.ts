import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createChocolateRewards({
  actions,
  balance,
  lowestLevel,
  selectByRate,
  alternating,
  cheapest,
  promoteAndUpgrade,
  upgradeAndPay,
  cascadeDown,
}: RewardHelpers) {
  return {
    cocoaClout: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.cocoaCloutUpgrades,
        balance.cocoaCloutPayouts,
      ),
    shadesOfCocoa: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.shadesOfCocoaPayouts,
      ),
    bigMugEnergy: (context) =>
      actions.upgrade(context.floors, balance.bigMugEnergyUpgrades),
    bonbonBigwig: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.bonbonBigwigTierSteps,
        balance.bonbonBigwigUpgrades,
      ),
    ganacheGains: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.ganacheGainsUpgrades,
      ),
    hazelnutHedgeFund: (context) => {
      const lowest = lowestLevel(context);
      actions.upgrade([context.floor], balance.hazelnutHedgeFundUpgrades);
      if (lowest !== context.floor)
        actions.upgrade([lowest], balance.hazelnutHedgeFundUpgrades);
    },
    spreadTheWealth: (context) =>
      actions.payCycles(context.floors, balance.spreadTheWealthPayouts),
    chocolateBarExam: (context) =>
      actions.upgrade(alternating(context), balance.chocolateBarExamUpgrades),
    darkChocolateDeal: (context) =>
      actions.upgrade([cheapest(context)], balance.darkChocolateDealUpgrades),
    mousseMoxie: (context) =>
      actions.upgrade([lowestLevel(context)], balance.mousseMoxieUpgrades),
    rockyRoadRally: (context) =>
      actions.upgrade(cascadeDown(context), balance.rockyRoadRallyUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
