import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const COSMOS_CRITS = {
  blackHole: {
    label: "Black Hole",
    color: COLOR.royalFlushPurple,
    image: "crits/cosmos/blackHole.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  bottledNebula: {
    label: "Bottled Nebula",
    color: COLOR.halloweenSalePurple,
    image: "crits/cosmos/bottledNebula.webp",
    description: "One tier promotion and sixteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.bottledNebulaTierSteps,
        balance.bottledNebulaUpgrades,
      ),
  },
  eclipse: {
    label: "Eclipse",
    color: COLOR.orange,
    image: "crits/cosmos/eclipse.webp",
    description: "Arms the lowest-level floor's next click as an x5 crit",
    reward: (context, { actions, lowestLevel }) =>
      actions.armCrit([lowestLevel(context)], "crit"),
  },
  joinTheDots: {
    label: "Join The Dots",
    color: COLOR.fastForwardBlue,
    image: "crits/cosmos/joinTheDots.webp",
    description: "Grows this floor's level by 19.9% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.joinTheDotsGrowth),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
