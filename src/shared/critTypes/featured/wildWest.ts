import type { WILD_WEST_CRITS } from "../../critData/wildWest";
import type { FeaturedRewards } from "./types";

export const WILD_WEST_REWARDS = {
  doubleDenim: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.doubleDenimShare),
  lassoLadies: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.lassoLadiesShare),
  rodeoPals: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rodeoPalsShare),
} satisfies FeaturedRewards<typeof WILD_WEST_CRITS>;
