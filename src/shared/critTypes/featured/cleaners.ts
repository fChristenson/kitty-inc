import type { CLEANERS_CRITS } from "../../critData/cleaners";
import type { FeaturedRewards } from "./types";

export const CLEANERS_REWARDS = {
  bandanaSquad: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bandanaSquadGrowth),
  hiVisDuo: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.hiVisDuoGrowth),
  overallReady: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.overallReadyGrowth),
  blueBobs: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blueBobsShare),
  featherDuster: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.featherDusterShare),
  maidCafe: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.maidCafeShare),
  ravenTwins: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.ravenTwinsShare),
} satisfies FeaturedRewards<typeof CLEANERS_CRITS>;
