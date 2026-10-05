import type { COSMOS_CRITS } from "../../critData/cosmos";
import type { FeaturedRewards } from "./types";

export const COSMOS_REWARDS = {
  blackHole: (context, { actions }) => actions.hireManagers([context.floor]),
  bottledNebula: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.bottledNebulaTierSteps,
      balance.bottledNebulaUpgrades,
    ),
  eclipse: (context, { actions, lowestLevel }) =>
    actions.armCrit([lowestLevel(context)], "crit"),
  joinTheDots: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.joinTheDotsGrowth),
} satisfies FeaturedRewards<typeof COSMOS_CRITS>;
