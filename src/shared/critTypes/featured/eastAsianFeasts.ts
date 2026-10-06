import type { EAST_ASIAN_FEASTS_CRITS } from "../../critData/eastAsianFeasts";
import type { FeaturedRewards } from "./types";

export const EAST_ASIAN_FEASTS_REWARDS = {
  bentoBox: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.bentoBoxMultiple),
  charredSkewer: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.charredSkewerMultiple),
  chickenRiceMound: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.chickenRiceMoundMultiple),
  chopstickDumplings: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.chopstickDumplingsMultiple),
  cutletAndCake: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cutletAndCakeShare, 1),
  dimSumTea: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.dimSumTeaMultiple),
  eggTopRice: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.eggTopRiceShare, 1),
  friedRiceSkewers: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.friedRiceSkewersMultiple),
  glazedPorkPlate: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.glazedPorkPlateMultiple),
  goldenCakeGrill: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goldenCakeGrillShare, 1),
  grilledFishRice: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.grilledFishRiceMultiple),
  meatballNoodles: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.meatballNoodlesMultiple),
  nigiriRainbow: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.nigiriRainbowShare, 1),
  onigiriParty: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.onigiriPartyMultiple),
  puddingCupMussels: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.puddingCupMusselsUpgrades),
  redBeanCatch: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.redBeanCatchShare, 1),
  redPorkBowl: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.redPorkBowlMultiple),
  salmonSquareSnacks: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.salmonSquareSnacksMultiple),
  sausageToastRice: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.sausageToastRiceMultiple),
  silverFishSupper: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.silverFishSupperShare, 1),
  steamingHotPot: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.steamingHotPotMultiple),
  teaHouseLunch: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.teaHouseLunchUpgrades),
  tempuraTray: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tempuraTrayShare, 1),
  bunAndFillet: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.bunAndFilletMultiple),
  stickyRiceCloud: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.stickyRiceCloudUpgrades),
} satisfies FeaturedRewards<typeof EAST_ASIAN_FEASTS_CRITS>;
