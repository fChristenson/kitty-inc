import { CONFIG } from "../../../config";
import type { Floor } from "../../../gameState";
import {
  nextCritTier,
  BOUNCE_CRIT_CONTINUE_CHANCE,
  type CritTier,
} from "../index";
import { gt, lt, type BigNumber } from "../../bigNumber";
import type { FeaturedRewardContext } from "./types";

// a timed event a featured crit can start (the same ones legacy procs start)
export type FeaturedEventKind =
  | "sale"
  | "frozen"
  | "spendingFreeze"
  | "rushHour";

// every game operation a featured reward can use, one or more per effect
// group in docs/critEffectGroups.md; bound to the real game by floorInteractions
export interface FeaturedRewardActions {
  upgrade: (floors: Floor[], count: number) => void;
  payCycles: (floors: Floor[], count: number) => void;
  incomeRate: (floor: Floor, now: number) => BigNumber;
  // adds `fraction` of the company's banked total income
  addIncomeShare: (fraction: number) => void;
  // adds `seconds` of the company's combined income rate
  addIncomeSeconds: (seconds: number) => void;
  // repeats the landed crit's upgrades onto the next floor that way, then
  // keeps going with continueChance per extra floor
  repeatCrit: (
    context: FeaturedRewardContext,
    direction: "up" | "down" | "both",
    continueChance: number,
  ) => void;
  // arms each floor's button with a crit of at least `tier`, right now
  armCrit: (floors: Floor[], tier: CritTier) => void;
  // unlocks the next `count` locked floors above the crit floor for free
  unlockFloors: (context: FeaturedRewardContext, count: number) => void;
  hireWorkers: (floors: Floor[], count: number) => void;
  hireManagers: (floors: Floor[]) => void;
  giveOfficeChairs: (floors: Floor[]) => void;
  giveOfficeSupplies: (floors: Floor[]) => void;
  // boosts every worker on the floors for `seconds`, plus extraWorkers virtual ones
  boostWorkers: (
    floors: Floor[],
    seconds: number,
    extraWorkers: number,
  ) => void;
  // permanently cuts the floors' upgrade, staff and unlock prices by `fraction`
  discountPrices: (floors: Floor[], fraction: number) => void;
  // raises each floor still below `level` up to it
  raiseLevels: (floors: Floor[], level: number) => void;
  // adds `multiple` times each floor's current upgrade price as cash
  addUpgradePriceCash: (floors: Floor[], multiple: number) => void;
  // gives each floor free upgrades worth `fraction` of its level (at least 1)
  growLevels: (floors: Floor[], fraction: number) => void;
  // hands out `total` free upgrades one by one to the lowest-level floor
  spreadUpgrades: (floors: Floor[], total: number) => void;
  // promotes `share` (at least one) of the floors' climbable workers `steps` perma tiers each
  raiseWorkerTiers: (floors: Floor[], share: number, steps: number) => void;
  startEvent: (floors: Floor[], event: FeaturedEventKind) => void;
}

// the targeting/reward building blocks every featured crit's reward shares
export function createRewardHelpers(actions: FeaturedRewardActions) {
  const balance = CONFIG.crit;
  const highestFloor = (context: FeaturedRewardContext) =>
    context.floors.filter((floor) => floor.unlocked).at(-1) ?? context.floor;
  const lowestLevel = (context: FeaturedRewardContext) =>
    context.floors
      .filter((floor) => floor.unlocked)
      .reduce(
        (best, floor) =>
          floor.upgradeCount < best.upgradeCount ? floor : best,
        context.floor,
      );
  const selectByRate = (context: FeaturedRewardContext, highest: boolean) => {
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
  const alternating = (context: FeaturedRewardContext) =>
    context.floors.filter((floor, index) => floor.unlocked && index % 2 === 0);
  const cheapest = (context: FeaturedRewardContext) =>
    context.floors
      .filter((floor) => floor.unlocked)
      .reduce(
        (best, floor) =>
          lt(floor.upgradeCost, best.upgradeCost) ? floor : best,
        context.floor,
      );
  const belowAndHere = (context: FeaturedRewardContext) =>
    context.floors.slice(0, context.floors.indexOf(context.floor) + 1);
  // the building's highest floor level
  const topLevel = (context: FeaturedRewardContext) =>
    Math.max(
      ...context.floors.filter((f) => f.unlocked).map((f) => f.upgradeCount),
      context.floor.upgradeCount,
    );
  // a second target that turns out to be this floor only counts once
  const hereAnd = (context: FeaturedRewardContext, other: Floor) =>
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
  // every element crit's shape: upgrades here, then payouts on the highest floor
  const upgradeHereAndPayHighest = (
    context: FeaturedRewardContext,
    upgrades: number,
    payouts: number,
  ) => {
    actions.upgrade([context.floor], upgrades);
    actions.payCycles([highestFloor(context)], payouts);
  };
  // the same walk applyBounceCrit does: always fall one floor, then roll to
  // keep falling. Returning the targets rather than applying per step keeps it
  // on the cheap bulk-upgrade path the other featured rewards use. On the
  // ground floor there's nothing below to reach, so it lands where it started
  // instead of paying out nothing.
  const cascadeDown = (context: FeaturedRewardContext) => {
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
    topLevel,
    hereAnd,
    promoteAndUpgrade,
    upgradeAndPay,
    upgradeHereAndPayHighest,
    cascadeDown,
  };
}

export type RewardHelpers = ReturnType<typeof createRewardHelpers>;
