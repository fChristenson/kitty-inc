import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const VAMPIRES_CRITS = {
  nosferatuSquat: {
    label: "Nosferatu Squat",
    color: COLOR.doubleDownCrimson,
    image: "crits/vampires/nosferatuSquat.webp",
    description: "Cuts every price in this building by 18.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.nosferatuSquatDiscount),
  },
  violetCapeCrusher: {
    label: "Violet Cape Crusher",
    color: COLOR.doubleDownCrimson,
    image: "crits/vampires/violetCapeCrusher.webp",
    description: "Adds 52s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.violetCapeCrusherSeconds),
  },
  countCrouch: {
    label: "Count Crouch",
    color: COLOR.nightShiftIndigo,
    image: "crits/vampires/countCrouch.webp",
    description: "Boosts every worker for 141s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.countCrouchBoostSeconds, balance.countCrouchExtraWorkers),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
