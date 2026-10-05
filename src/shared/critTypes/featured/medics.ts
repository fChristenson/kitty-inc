import type { MEDICS_CRITS } from "../../critData/medics";
import type { FeaturedRewards } from "./types";

export const MEDICS_REWARDS = {
  bedsideManner: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bedsideMannerShare),
  houseCall: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.houseCallShare),
  scrubsUp: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.scrubsUpShare),
  stethoscopes: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.stethoscopesShare),
  pinkScrubs: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkScrubsShare),
} satisfies FeaturedRewards<typeof MEDICS_CRITS>;
