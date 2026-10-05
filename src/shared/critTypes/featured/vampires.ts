import type { VAMPIRES_CRITS } from "../../critData/vampires";
import type { FeaturedRewards } from "./types";

export const VAMPIRES_REWARDS = {
  nosferatuSquat: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.nosferatuSquatDiscount),
  violetCapeCrusher: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.violetCapeCrusherSeconds),
  countCrouch: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.countCrouchBoostSeconds, balance.countCrouchExtraWorkers),
} satisfies FeaturedRewards<typeof VAMPIRES_CRITS>;
