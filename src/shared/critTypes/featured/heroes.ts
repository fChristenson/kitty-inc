import type { HEROES_CRITS } from "../../critData/heroes";
import type { FeaturedRewards } from "./types";

export const HEROES_REWARDS = {
  blessed: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.blessedTierSteps,
      balance.blessedUpgrades,
    ),
  centurion: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.centurionBoostSeconds,
      balance.centurionExtraWorkers,
    ),
  checkUp: (context, { actions, balance, lowestLevel }) => {
    const floor = lowestLevel(context);
    actions.upgrade([floor], balance.checkUpUpgrades);
    actions.payCycles([floor], balance.checkUpPayouts);
  },
  fireman: (context, { actions, balance }) => {
    actions.upgrade(context.floors, balance.firemanUpgrades);
    actions.payCycles(context.floors, balance.firemanPayouts);
  },
  forTheEmperor: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.forTheEmperorUpgrades),
  forTheKing: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  hammerTime: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  robinHood: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  roman: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.romanBoostSeconds,
      balance.romanExtraWorkers,
    ),
  samurai: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.samuraiDiscount),
  spy: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.spyBoostSeconds,
      balance.spyExtraWorkers,
    ),
  theLawWon: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.theLawWonDiscount),
  victorian: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.victorianBoostSeconds,
      balance.victorianExtraWorkers,
    ),
  uchihaItachi: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.uchihaItachiGrowth),
  geralt: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.geraltGrowth),
} satisfies FeaturedRewards<typeof HEROES_CRITS>;
