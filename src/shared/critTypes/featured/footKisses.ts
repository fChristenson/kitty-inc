import type { FOOT_KISSES_CRITS } from "../../critData/footKisses";
import type { FeaturedRewards } from "./types";

export const FOOT_KISSES_REWARDS = {
  armsWideKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.armsWideKissMultiple),
  bicepBunKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bicepBunKissUpgrades),
  blueBuzzCutKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.blueBuzzCutKissMultiple),
  blueManeSmooch: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.blueManeSmoochUpgrades),
  bobCutSmooch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bobCutSmoochGrowth),
  bothFeetPucker: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bothFeetPuckerUpgrades),
  closeUpKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.closeUpKissGrowth),
  coralSoleSmooch: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.coralSoleSmoochUpgrades),
  crouchKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.crouchKissUpgrades),
  curlyManeMwah: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.curlyManeMwahMultiple),
  doubleBunPucker: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.doubleBunPuckerGrowth),
  fingerPointPeck: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.fingerPointPeckUpgrades),
  flatTopPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.flatTopPuckerMultiple),
  flexAndPucker: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.flexAndPuckerGrowth),
  handOnHipKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.handOnHipKissGrowth),
  lemonArchKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.lemonArchKissGrowth),
  messyBunMwah: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.messyBunMwahUpgrades),
  muscleQueenSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.muscleQueenSmoochMultiple),
  paleArchPeck: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.paleArchPeckUpgrades),
  pinkSleevePucker: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pinkSleevePuckerUpgrades),
  pointDownPucker: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pointDownPuckerUpgrades),
  redTopSmooch: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.redTopSmoochUpgrades),
  salmonSoleSmooch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.salmonSoleSmoochGrowth),
  shortCropKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.shortCropKissMultiple),
  sidePointSmooch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.sidePointSmoochGrowth),
  spikyHairSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.spikyHairSmoochMultiple),
  tealCropKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.tealCropKissUpgrades),
  thunderThighSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.thunderThighSmoochMultiple),
  waggingFingerKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.waggingFingerKissGrowth),
  whiteCropKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.whiteCropKissUpgrades),
  cuddleClanComfort: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.cuddleClanComfortBoostSeconds, balance.cuddleClanComfortExtraWorkers),
  leanInKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.leanInKissMultiple),
} satisfies FeaturedRewards<typeof FOOT_KISSES_CRITS>;
