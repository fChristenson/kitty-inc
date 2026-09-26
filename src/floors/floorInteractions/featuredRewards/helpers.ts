import { CONFIG } from "../../../config";
import type { Floor } from "../../../gameState";
import {
  nextCritTier,
  BOUNCE_CRIT_CONTINUE_CHANCE,
} from "../../../shared/critTypes";
import { gt, lt, type BigNumber } from "../../../shared/bigNumber";
import type { CritRewardContext } from "../index";

export interface FeaturedRewardActions {
  upgrade: (floors: Floor[], count: number) => void;
  payCycles: (floors: Floor[], count: number) => void;
  incomeRate: (floor: Floor, now: number) => BigNumber;
}

// the targeting/reward building blocks every featured category's rewards share
export function createRewardHelpers(actions: FeaturedRewardActions) {
  const balance = CONFIG.crit;
  const highestFloor = (context: CritRewardContext) =>
    context.floors.filter((floor) => floor.unlocked).at(-1) ?? context.floor;
  const lowestLevel = (context: CritRewardContext) =>
    context.floors
      .filter((floor) => floor.unlocked)
      .reduce(
        (best, floor) =>
          floor.upgradeCount < best.upgradeCount ? floor : best,
        context.floor,
      );
  const selectByRate = (context: CritRewardContext, highest: boolean) => {
    const now = Date.now();
    const compare = highest ? gt : lt;
    return context.floors
      .filter((floor) => floor.unlocked)
      .reduce(
        (best, floor) =>
          compare(actions.incomeRate(floor, now), actions.incomeRate(best, now))
            ? floor
            : best,
        context.floor,
      );
  };
  const alternating = (context: CritRewardContext) =>
    context.floors.filter((floor, index) => floor.unlocked && index % 2 === 0);
  const cheapest = (context: CritRewardContext) =>
    context.floors
      .filter((floor) => floor.unlocked)
      .reduce(
        (best, floor) =>
          lt(floor.upgradeCost, best.upgradeCost) ? floor : best,
        context.floor,
      );
  const belowAndHere = (context: CritRewardContext) =>
    context.floors.slice(0, context.floors.indexOf(context.floor) + 1);
  // a second target that turns out to be this floor only counts once
  const hereAnd = (context: CritRewardContext, other: Floor) =>
    other === context.floor ? [context.floor] : [context.floor, other];
  const promoteAndUpgrade = (floor: Floor, steps: number, upgrades: number) => {
    for (let step = 0; step < steps; step++) {
      floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
    }
    actions.upgrade([floor], upgrades);
  };
  const upgradeAndPay = (
    floors: Floor[],
    upgrades: number,
    payouts: number,
  ) => {
    actions.upgrade(floors, upgrades);
    actions.payCycles(floors, payouts);
  };
  // the same walk applyBounceCrit does: always fall one floor, then roll to
  // keep falling. Returning the targets rather than applying per step keeps it
  // on the cheap bulk-upgrade path the other featured rewards use. On the
  // ground floor there's nothing below to reach, so it lands where it started
  // instead of paying out nothing.
  const cascadeDown = (context: CritRewardContext) => {
    const targets: Floor[] = [];
    let index = context.floors.indexOf(context.floor) - 1;
    for (;;) {
      if (index < 0) break;
      targets.push(context.floors[index]);
      index -= 1;
      if (Math.random() >= BOUNCE_CRIT_CONTINUE_CHANCE) break;
    }
    return targets.length > 0 ? targets : [context.floor];
  };

  return {
    actions,
    balance,
    highestFloor,
    lowestLevel,
    selectByRate,
    alternating,
    cheapest,
    belowAndHere,
    hereAnd,
    promoteAndUpgrade,
    upgradeAndPay,
    cascadeDown,
  };
}

export type RewardHelpers = ReturnType<typeof createRewardHelpers>;
