import type { GOTH_GIRLS_CRITS } from "../../critData/gothGirls";
import type { FeaturedRewards } from "./types";

export const GOTH_GIRLS_REWARDS = {
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
} satisfies FeaturedRewards<typeof GOTH_GIRLS_CRITS>;
