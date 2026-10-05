import type { SUPERHEROES_CRITS } from "../../critData/superheroes";
import type { FeaturedRewards } from "./types";

export const SUPERHEROES_REWARDS = {
  purrfectOrigin: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  capeEscape: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.capeEscapeDiscount),
  thunderPaws: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.thunderPawsBoostSeconds,
      balance.thunderPawsExtraWorkers,
    ),
  clawAndOrder: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  felineFury: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.felineFuryUpgrades),
  sidekickShuffle: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.sidekickShuffleWorkers),
  cosmicCatapult: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
} satisfies FeaturedRewards<typeof SUPERHEROES_CRITS>;
