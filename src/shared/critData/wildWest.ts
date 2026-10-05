import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const WILD_WEST_CRITS = {
  doubleDenim: {
    label: "Double Denim",
    color: COLOR.amberMuted,
    image: "crits/wildWest/doubleDenim.webp",
    description: "Adds 63.3% of your total income",
  },
  lassoLadies: {
    label: "Lasso Ladies",
    color: COLOR.supplyRunTan,
    image: "crits/wildWest/lassoLadies.webp",
    description: "Adds 63.4% of your total income",
  },
  rodeoPals: {
    label: "Rodeo Pals",
    color: COLOR.nightShiftIndigo,
    image: "crits/wildWest/rodeoPals.webp",
    description: "Adds 63.5% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
