import type { DARK_BEAUTIES_CRITS } from "../critData/darkBeauties";
import type { FeaturedRewards } from "./types";

export const DARK_BEAUTIES_REWARDS = {
  fishnetSleeves: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.fishnetSleevesUpgrades),
  greenEyeshadow: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.greenEyeshadowMultiple),
  heartTattoo: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.heartTattooGrowth),
  lilacBiceps: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.lilacBicepsUpgrades),
  moonPendant: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.moonPendantMultiple),
  motoJacket: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.motoJacketGrowth),
  noseStudSmirk: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.noseStudSmirkUpgrades),
  operaGloves: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.operaGlovesMultiple),
  pinkEdgeBangs: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.pinkEdgeBangsGrowth),
  plumMiniskirt: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.plumMiniskirtUpgrades),
  ringChoker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.ringChokerMultiple),
  septumSiren: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.septumSirenGrowth),
  skullBarrette: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.skullBarretteUpgrades),
  studdedVestFlex: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.studdedVestFlexMultiple),
  tealStreakBob: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tealStreakBobGrowth),
  violetCropTop: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.violetCropTopUpgrades),
  nosferatuSquat: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.nosferatuSquatDiscount),
  violetCapeCrusher: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.violetCapeCrusherSeconds),
  countCrouch: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.countCrouchBoostSeconds, balance.countCrouchExtraWorkers),
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
} satisfies FeaturedRewards<typeof DARK_BEAUTIES_CRITS>;
