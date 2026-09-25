import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createShowtimeRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    ballerina: (context) => {
      actions.upgrade([context.floor], balance.ballerinaUpgrades);
      actions.payCycles([context.floor], balance.ballerinaPayouts);
    },
    cowboy: (context) =>
      actions.upgrade([lowestLevel(context)], balance.cowboyUpgrades),
    dinnerTime: (context) =>
      actions.payCycles(context.floors, balance.dinnerTimePayouts),
    fingerGuns: (context) => {
      actions.upgrade([context.floor], balance.fingerGunsUpgrades);
      actions.upgrade([highestFloor(context)], balance.fingerGunsUpgrades);
    },
    flamenco: (context) =>
      actions.upgrade(context.floors, balance.flamencoUpgrades),
    milestone: (context) => {
      const count =
        balance.milestoneStep -
        (context.floor.upgradeCount % balance.milestoneStep);
      actions.upgrade([context.floor], count);
    },
    moonwalker: (context) => {
      const targets = context.floors.slice(
        0,
        context.floors.indexOf(context.floor) + 1,
      );
      actions.upgrade(targets, balance.moonwalkerUpgrades);
    },
    ninja: (context) => actions.upgrade([context.floor], balance.ninjaUpgrades),
    obelisk: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.obeliskTierSteps,
        balance.obeliskUpgrades,
      ),
    sharpShooter: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.sharpShooterPayouts,
      ),
    space: (context) =>
      actions.upgrade([highestFloor(context)], balance.spaceUpgrades),
    yesChef: (context) =>
      actions.payCycles(context.floors, balance.yesChefPayouts),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
