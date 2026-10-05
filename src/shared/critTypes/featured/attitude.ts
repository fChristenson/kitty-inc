import type { ATTITUDE_CRITS } from "../../critData/attitude";
import type { FeaturedRewards } from "./types";

export const ATTITUDE_REWARDS = {
  goldenSkull: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldenSkullShare),
  lordOfMurder: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.lordOfMurderTierSteps,
      balance.lordOfMurderUpgrades,
    ),
  speedDemon: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.speedDemonBoostSeconds,
      balance.speedDemonExtraWorkers,
    ),
  badonkadonk: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  demonicBuns: (context, { actions, balance }) => {
    actions.upgrade([context.floor], balance.demonicBunsUpgrades);
    actions.payCycles([context.floor], balance.demonicBunsPayouts);
  },
  infernalInterest: (context, { actions, balance }) =>
    actions.boostWorkers([context.floor], balance.infernalInterestBoostSeconds, balance.infernalInterestExtraWorkers),
  dropItLow: (context, { actions, balance, lowestLevel }) => {
    const floor = lowestLevel(context);
    actions.upgrade([floor], balance.dropItLowUpgrades);
    actions.payCycles([floor], balance.dropItLowPayouts);
  },
  kittyWagon: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.kittyWagonWorkers),
  madeYouLook: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.madeYouLookBoostSeconds,
      balance.madeYouLookExtraWorkers,
    ),
  wagonWarrior: (context, { actions, balance }) => {
    actions.upgrade(context.floors, balance.wagonWarriorUpgrades);
    actions.payCycles(context.floors, balance.wagonWarriorPayouts);
  },
  bubbleButt: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.bubbleButtBoostSeconds,
      balance.bubbleButtExtraWorkers,
    ),
  canNotLie: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.canNotLieBoostSeconds,
      balance.canNotLieExtraWorkers,
    ),
  demonGirl: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.demonGirlDiscount),
  partnersInCrime: (context, { actions }) =>
    actions.armCrit(context.floors, "crit"),
} satisfies FeaturedRewards<typeof ATTITUDE_CRITS>;
