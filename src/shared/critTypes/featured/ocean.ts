import type { OCEAN_CRITS } from "../../critData/ocean";
import type { FeaturedRewards } from "./types";

export const OCEAN_REWARDS = {
  treasureMap: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.treasureMapSeconds),
  captainLeFluff: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.captainLeFluffUpgrades),
  divingBell: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.divingBellUpgrades),
  flooringInspector: (context, { actions, balance }) =>
    actions.upgrade(
      context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
      balance.flooringInspectorUpgrades,
    ),
  kraken: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.krakenPayouts),
  messageInABottle: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  lemonSails: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.lemonSailsGrowth),
} satisfies FeaturedRewards<typeof OCEAN_CRITS>;
