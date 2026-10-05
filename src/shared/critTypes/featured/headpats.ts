import type { HEADPATS_CRITS } from "../../critData/headpats";
import type { FeaturedRewards } from "./types";

export const HEADPATS_REWARDS = {
  ribbonRub: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.ribbonRubDiscount),
  blushPat: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blushPatShare),
  sleepyPat: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.sleepyPatBoostSeconds, balance.sleepyPatExtraWorkers),
  gratefulPat: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.gratefulPatContinueChance),
  gigglePat: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.gigglePatDiscount),
  beamingPat: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.beamingPatShare),
} satisfies FeaturedRewards<typeof HEADPATS_CRITS>;
