import type { EMOJIS_CRITS } from "../../critData/emojis";
import type { FeaturedRewards } from "./types";

export const EMOJIS_REWARDS = {
  fedoraFrown: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.fedoraFrownBoostSeconds, balance.fedoraFrownExtraWorkers),
  midnightMobster: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.midnightMobsterContinueChance),
  trenchCoatSquint: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.trenchCoatSquintDiscount),
  crimsonFedora: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.crimsonFedoraShare),
  winkAndBlush: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.winkAndBlushBoostSeconds, balance.winkAndBlushExtraWorkers),
} satisfies FeaturedRewards<typeof EMOJIS_CRITS>;
