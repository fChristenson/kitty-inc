import type { FIREFIGHTERS_CRITS } from "../../critData/firefighters";
import type { FeaturedRewards } from "./types";

export const FIREFIGHTERS_REWARDS = {
  blazeBusters: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blazeBustersShare),
  fireBrigade: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.fireBrigadeShare),
  helmetHeroes: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.helmetHeroesShare),
} satisfies FeaturedRewards<typeof FIREFIGHTERS_CRITS>;
