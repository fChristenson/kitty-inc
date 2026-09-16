import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";
import { nextCritTier, type FeaturedCritKind } from "../../shared/critTypes";
import { gt, type BigNumber } from "../../shared/bigNumber";
import type { CritRewardContext } from "./index";

interface FeaturedRewardActions {
  upgrade: (floors: Floor[], count: number) => void;
  payCycles: (floors: Floor[], count: number) => void;
  incomeRate: (floor: Floor, now: number) => BigNumber;
}

export function createFeaturedCritRewards(actions: FeaturedRewardActions) {
  const balance = CONFIG.crit;
  const highestFloor = (context: CritRewardContext) =>
    context.floors.filter((floor) => floor.unlocked).at(-1) ?? context.floor;

  return {
    ballerina: (context) => {
      actions.upgrade([context.floor], balance.ballerinaUpgrades);
      actions.payCycles([context.floor], balance.ballerinaPayouts);
    },
    cowboy: (context) => {
      const lowest = context.floors
        .filter((floor) => floor.unlocked)
        .reduce(
          (best, floor) =>
            floor.upgradeCount < best.upgradeCount ? floor : best,
          context.floor,
        );
      actions.upgrade([lowest], balance.cowboyUpgrades);
    },
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
    obelisk: (context) => {
      for (let step = 0; step < balance.obeliskTierSteps; step++) {
        context.floor.critMultiplierTier = nextCritTier(
          context.floor.critMultiplierTier,
        );
      }
      actions.upgrade([context.floor], balance.obeliskUpgrades);
    },
    sharpShooter: (context) => {
      const now = Date.now();
      const best = context.floors
        .filter((floor) => floor.unlocked)
        .reduce(
          (best, floor) =>
            gt(actions.incomeRate(floor, now), actions.incomeRate(best, now))
              ? floor
              : best,
          context.floor,
        );
      actions.payCycles([best], balance.sharpShooterPayouts);
    },
    space: (context) =>
      actions.upgrade([highestFloor(context)], balance.spaceUpgrades),
    yesChef: (context) =>
      actions.payCycles(context.floors, balance.yesChefPayouts),
  } satisfies Record<FeaturedCritKind, (context: CritRewardContext) => void>;
}
