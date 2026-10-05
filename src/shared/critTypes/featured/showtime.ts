import type { SHOWTIME_CRITS } from "../../critData/showtime";
import type { FeaturedRewards } from "./types";

export const SHOWTIME_REWARDS = {
  ballerina: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  cowboy: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.cowboyUpgrades),
  dinnerTime: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.dinnerTimePayouts),
  fingerGuns: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  flamenco: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.flamencoBoostSeconds,
      balance.flamencoExtraWorkers,
    ),
  milestone: (context, { actions, balance }) => {
    const count =
      balance.milestoneStep -
      (context.floor.upgradeCount % balance.milestoneStep);
    actions.upgrade([context.floor], count);
  },
  moonwalker: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.moonwalkerBoostSeconds,
      balance.moonwalkerExtraWorkers,
    ),
  ninja: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.ninjaBoostSeconds,
      balance.ninjaExtraWorkers,
    ),
  obelisk: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.obeliskTierSteps,
      balance.obeliskUpgrades,
    ),
  sharpShooter: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.sharpShooterBoostSeconds,
      balance.sharpShooterExtraWorkers,
    ),
  space: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.spaceUpgrades),
  yesChef: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.yesChefPayouts),
  curtainCall: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.curtainCallSeconds),
  showgirlStrut: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.showgirlStrutSeconds),
} satisfies FeaturedRewards<typeof SHOWTIME_CRITS>;
