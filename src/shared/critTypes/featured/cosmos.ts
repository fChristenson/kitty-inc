import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const COSMOS_CRITS = {
  blackHole: {
    label: "Black Hole",
    color: COLOR.royalFlushPurple,
    image: "crits/cosmos/blackHole.png",
    description: "Twenty-six payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.blackHolePayouts),
  },
  bottledNebula: {
    label: "Bottled Nebula",
    color: COLOR.halloweenSalePurple,
    image: "crits/cosmos/bottledNebula.png",
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
    image: "crits/cosmos/eclipse.png",
    description: "Twenty-seven upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.eclipseUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
