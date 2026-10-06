import type { AFRICAN_AND_AMERICAS_FEASTS_CRITS } from "../../critData/africanAndAmericasFeasts";
import type { FeaturedRewards } from "./types";

export const AFRICAN_AND_AMERICAS_FEASTS_REWARDS = {
  barbecuePot: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.barbecuePotShare, 1),
  blackBeanPlatter: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.blackBeanPlatterMultiple),
  bluePlatterStew: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.bluePlatterStewShare, 1),
  blueSnapper: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.blueSnapperMultiple),
  burritoFiesta: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.burritoFiestaMultiple),
  citrusChicken: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.citrusChickenMultiple),
  cornCobCookout: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cornCobCookoutShare, 1),
  drumstickDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.drumstickDuoShare, 1),
  fishAndWings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.fishAndWingsShare, 1),
  limeTacoPlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.limeTacoPlateShare, 1),
  lobsterCrown: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.lobsterCrownShare, 1),
  lobsterTail: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.lobsterTailMultiple),
  okraStew: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.okraStewMultiple),
  pickleAndSteakBoard: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.pickleAndSteakBoardMultiple),
  plantainPlatter: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.plantainPlatterUpgrades),
  salmonGreens: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.salmonGreensShare, 1),
  steakTacoNight: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.steakTacoNightShare, 1),
  stuffedPastryPicnic: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.stuffedPastryPicnicShare, 1),
  stuffedRollRoast: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.stuffedRollRoastMultiple),
  surfAndTurfPan: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.surfAndTurfPanUpgrades),
  tacoTuesday: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tacoTuesdayShare, 1),
  tortillaStew: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.tortillaStewMultiple),
  twinLobsters: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.twinLobstersUpgrades),
  umbrellaDrink: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.umbrellaDrinkMultiple),
  acaiBoard: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.acaiBoardMultiple),
  ebaAndOkra: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.ebaAndOkraUpgrades),
  feijoadaFiesta: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.feijoadaFiestaMultiple),
  fufuMound: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.fufuMoundMultiple),
  islandTwinFish: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.islandTwinFishUpgrades),
  mapleSyrupBagel: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.mapleSyrupBagelUpgrades),
  nanaimoPoutine: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.nanaimoPoutineUpgrades),
  puffPuffSpread: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.puffPuffSpreadUpgrades),
  quesoFritoPlate: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.quesoFritoPlateGrowth),
  tomatoRiceCatch: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.tomatoRiceCatchUpgrades),
  waakyePlate: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.waakyePlateGrowth),
  wovenTrayGrill: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.wovenTrayGrillUpgrades),
  suyaAndStew: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.suyaAndStewGrowth),
} satisfies FeaturedRewards<typeof AFRICAN_AND_AMERICAS_FEASTS_CRITS>;
