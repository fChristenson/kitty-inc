import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const WILD_WEST_CRITS = {
  doubleDenim: {
    label: "Double Denim",
    color: COLOR.amberMuted,
    image: "crits/wildWest/doubleDenim.webp",
    description: "Adds 63.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.doubleDenimShare),
  },
  lassoLadies: {
    label: "Lasso Ladies",
    color: COLOR.supplyRunTan,
    image: "crits/wildWest/lassoLadies.webp",
    description: "Adds 63.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.lassoLadiesShare),
  },
  rodeoPals: {
    label: "Rodeo Pals",
    color: COLOR.nightShiftIndigo,
    image: "crits/wildWest/rodeoPals.webp",
    description: "Adds 63.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rodeoPalsShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
