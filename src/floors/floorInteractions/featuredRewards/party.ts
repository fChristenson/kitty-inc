import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createPartyRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    doughDivision: (context) =>
      actions.upgrade([context.floor], balance.doughDivisionUpgrades),
    profitPopcorn: (context) =>
      actions.payCycles(context.floors, balance.profitPopcornPayouts),
    donutDisturb: (context) => {
      actions.upgrade([context.floor], balance.donutDisturbUpgrades);
      actions.payCycles([context.floor], balance.donutDisturbPayouts);
    },
    cakeDay: (context) =>
      actions.upgrade([lowestLevel(context)], balance.cakeDayUpgrades),
    champagneProblems: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.champagneProblemsPayouts,
      ),
    bonusBurrito: (context) => {
      actions.upgrade([context.floor], balance.bonusBurritoUpgrades);
      actions.payCycles([context.floor], balance.bonusBurritoPayouts);
    },
    sundaeBest: (context) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.sundaeBestPayouts,
      ),
    popTheQuestion: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.popTheQuestionTierSteps,
        balance.popTheQuestionUpgrades,
      ),
    partyCrasher: (context) => {
      actions.upgrade([context.floor], balance.partyCrasherUpgrades);
      actions.upgrade([highestFloor(context)], balance.partyCrasherUpgrades);
    },
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
