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
} as const satisfies Record<string, FeaturedCritDefinition>;
