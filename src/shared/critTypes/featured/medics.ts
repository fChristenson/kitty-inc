import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const MEDICS_CRITS = {
  bedsideManner: {
    label: "Bedside Manner",
    color: COLOR.overflowBlue,
    image: "crits/medics/bedsideManner.webp",
    description: "Adds 43.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.bedsideMannerShare),
  },
  houseCall: {
    label: "House Call",
    color: COLOR.summerSaleOrange,
    image: "crits/medics/houseCall.webp",
    description: "Adds 44% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.houseCallShare),
  },
  scrubsUp: {
    label: "Scrubs Up",
    color: COLOR.sameBoatCoral,
    image: "crits/medics/scrubsUp.webp",
    description: "Adds 44.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.scrubsUpShare),
  },
  stethoscopes: {
    label: "Stethoscopes",
    color: COLOR.overflowBlue,
    image: "crits/medics/stethoscopes.webp",
    description: "Adds 44.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.stethoscopesShare),
  },
  pinkScrubs: {
    label: "Pink Scrubs",
    color: COLOR.fastForwardBlue,
    image: "crits/medics/pinkScrubs.webp",
    description: "Adds 63.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pinkScrubsShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
