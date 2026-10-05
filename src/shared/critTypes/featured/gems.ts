import type { GEMS_CRITS } from "../../critData/gems";
import type { FeaturedRewards } from "./types";

export const GEMS_REWARDS = {
  amethyst: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  diamond: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.diamondShare),
  emerald: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.emeraldSeconds),
  goldNugget: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldNuggetShare),
  goldRush: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.goldRushBoostSeconds,
      balance.goldRushExtraWorkers,
    ),
  ruby: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.rubySeconds),
  saphire: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  silverRush: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.silverRushBoostSeconds,
      balance.silverRushExtraWorkers,
    ),
  rainbowGems: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.rainbowGemsGrowth),
} satisfies FeaturedRewards<typeof GEMS_CRITS>;
