import type { SOUTH_ASIAN_FEASTS_CRITS } from "../critData/southAsianFeasts";
import type { FeaturedRewards } from "./types";

export const SOUTH_ASIAN_FEASTS_REWARDS = {
  bananaFishPlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.bananaFishPlateShare, 1),
  basilBanquet: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.basilBanquetShare, 1),
  chutneyPlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.chutneyPlateShare, 1),
  coconutBrunch: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.coconutBrunchShare, 1),
  curryRound: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.curryRoundMultiple),
  eggplantCurry: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.eggplantCurryMultiple),
  goldenNaan: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.goldenNaanMultiple),
  mangoPlatter: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.mangoPlatterUpgrades),
  prawnAndRoast: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.prawnAndRoastUpgrades),
  redRimFish: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.redRimFishUpgrades),
  rolledWrapSkewers: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.rolledWrapSkewersShare, 1),
  royalBuffet: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.royalBuffetMultiple),
  saffronSpread: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.saffronSpreadUpgrades),
  samosaCurry: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.samosaCurryUpgrades),
  shrimpTray: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.shrimpTrayUpgrades),
  wickerBasketBites: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.wickerBasketBitesUpgrades),
  yellowSpoonRice: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.yellowSpoonRiceUpgrades),
  bambooTraySatay: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.bambooTraySatayMultiple),
  bananaLeafSatay: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.bananaLeafSatayUpgrades),
  clayPotYogurt: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.clayPotYogurtMultiple),
  copperPotKebabs: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.copperPotKebabsUpgrades),
  grilledPorkNoodles: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.grilledPorkNoodlesUpgrades),
  leafCupCurry: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.leafCupCurryUpgrades),
  sambalDrumstick: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.sambalDrumstickGrowth),
  sunnyEggFishFry: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.sunnyEggFishFryGrowth),
} satisfies FeaturedRewards<typeof SOUTH_ASIAN_FEASTS_CRITS>;
