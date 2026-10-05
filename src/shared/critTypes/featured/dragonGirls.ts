import type { DRAGON_GIRLS_CRITS } from "../../critData/dragonGirls";
import type { FeaturedRewards } from "./types";

export const DRAGON_GIRLS_REWARDS = {
  crimsonTailCoil: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.crimsonTailCoilContinueChance),
  tangerineTailGrip: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.tangerineTailGripDiscount),
  tealTailSwagger: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.tealTailSwaggerSeconds),
  sapphireTailSway: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.sapphireTailSwayBoostSeconds, balance.sapphireTailSwayExtraWorkers),
  scarletCrouchCoil: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.scarletCrouchCoilContinueChance),
  azureSquatSwish: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.azureSquatSwishDiscount),
  ceruleanCrouch: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.ceruleanCrouchSeconds),
  jadeSquatSpikes: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.jadeSquatSpikesBoostSeconds, balance.jadeSquatSpikesExtraWorkers),
  cherryCrouchWyrm: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.cherryCrouchWyrmContinueChance),
} satisfies FeaturedRewards<typeof DRAGON_GIRLS_CRITS>;
