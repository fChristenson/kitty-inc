import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const COSMOS_CRITS = {
  blackHole: {
    label: "Black Hole",
    color: COLOR.royalFlushPurple,
    image: "crits/cosmos/blackHole.webp",
    description: "Hires a free manager for this floor",
  },
  bottledNebula: {
    label: "Bottled Nebula",
    color: COLOR.halloweenSalePurple,
    image: "crits/cosmos/bottledNebula.webp",
    description: "One tier promotion and sixteen upgrades here",
  },
  eclipse: {
    label: "Eclipse",
    color: COLOR.orange,
    image: "crits/cosmos/eclipse.webp",
    description: "Arms the lowest-level floor's next click as an x5 crit",
  },
  joinTheDots: {
    label: "Join The Dots",
    color: COLOR.fastForwardBlue,
    image: "crits/cosmos/joinTheDots.webp",
    description: "Grows this floor's level by 19.9% in free upgrades",
  },
} as const satisfies Record<string, FeaturedCritData>;
