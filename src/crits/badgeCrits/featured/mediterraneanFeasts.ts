import type {
  MEDITERRANEAN_FEASTS_CRITS,
} from "../critData/mediterraneanFeasts";
import type { FeaturedRewards } from "./types";

export const MEDITERRANEAN_FEASTS_REWARDS = {
  batteredBrunch: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.batteredBrunchShare, 1),
  beerHallPlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.beerHallPlateShare, 1),
  berryDumplings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.berryDumplingsShare, 1),
  borschtBrunch: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.borschtBrunchShare, 1),
  charcuterieBoard: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.charcuterieBoardShare, 1),
  cheesyGreens: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cheesyGreensShare, 1),
  chocolateTruffleWaffle: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.chocolateTruffleWaffleShare, 1),
  coffeeBreak: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.coffeeBreakMultiple),
  figAndOlivePlatter: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.figAndOlivePlatterMultiple),
  giantCrepe: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.giantCrepeShare, 1),
  goldenPiePlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goldenPiePlateShare, 1),
  layeredPastrySpread: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.layeredPastrySpreadShare, 1),
  lemonMussels: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.lemonMusselsMultiple),
  littlePlates: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.littlePlatesMultiple),
  meatballMezze: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.meatballMezzeShare, 1),
  mustardJarSalmon: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.mustardJarSalmonUpgrades),
  oktoberfest: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.oktoberfestUpgrades),
  oliveOilTrio: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.oliveOilTrioShare, 1),
  paellaPicnic: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.paellaPicnicUpgrades),
  pepperoniTwirl: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.pepperoniTwirlShare, 1),
  polentaMountain: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.polentaMountainShare, 1),
  pomegranateKebab: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.pomegranateKebabMultiple),
  pretzelBangers: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.pretzelBangersShare, 1),
  pretzelPileup: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.pretzelPileupMultiple),
  sausagePotLunch: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.sausagePotLunchShare, 1),
  smorgasbord: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.smorgasbordMultiple),
  sourCreamPancakes: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.sourCreamPancakesUpgrades),
  stuffedGrapeLeaves: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.stuffedGrapeLeavesUpgrades),
  tagineTable: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.tagineTableMultiple),
  twoGlassTapas: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.twoGlassTapasShare, 1),
  woodenMugGrill: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.woodenMugGrillMultiple),
  baklavaMezze: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.baklavaMezzeUpgrades),
  cevapiEspresso: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.cevapiEspressoUpgrades),
  cucumberSoupMeze: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.cucumberSoupMezeMultiple),
  flatbreadFingers: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.flatbreadFingersUpgrades),
  honeyPotBanitsa: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.honeyPotBanitsaUpgrades),
  roastedPepperFeast: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.roastedPepperFeastUpgrades),
} satisfies FeaturedRewards<typeof MEDITERRANEAN_FEASTS_CRITS>;
