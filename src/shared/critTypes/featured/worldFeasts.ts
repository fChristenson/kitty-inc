import type { WORLD_FEASTS_CRITS } from "../../critData/worldFeasts";
import type { FeaturedRewards } from "./types";

export const WORLD_FEASTS_REWARDS = {
  bananaFishPlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.bananaFishPlateShare, 1),
  barbecuePot: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.barbecuePotShare, 1),
  basilBanquet: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.basilBanquetShare, 1),
  batteredBrunch: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.batteredBrunchShare, 1),
  beerHallPlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.beerHallPlateShare, 1),
  bentoBox: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.bentoBoxMultiple),
  berryDumplings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.berryDumplingsShare, 1),
  blackBeanPlatter: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.blackBeanPlatterMultiple),
  bluePlatterStew: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.bluePlatterStewShare, 1),
  blueSnapper: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.blueSnapperMultiple),
  borschtBrunch: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.borschtBrunchShare, 1),
  burritoFiesta: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.burritoFiestaMultiple),
  charcuterieBoard: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.charcuterieBoardShare, 1),
  charredSkewer: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.charredSkewerMultiple),
  cheesyGreens: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cheesyGreensShare, 1),
  chickenRiceMound: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.chickenRiceMoundMultiple),
  chocolateTruffleWaffle: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.chocolateTruffleWaffleShare, 1),
  chopstickDumplings: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.chopstickDumplingsMultiple),
  chutneyPlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.chutneyPlateShare, 1),
  citrusChicken: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.citrusChickenMultiple),
  coconutBrunch: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.coconutBrunchShare, 1),
  coffeeBreak: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.coffeeBreakMultiple),
  cornCobCookout: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cornCobCookoutShare, 1),
  curryRound: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.curryRoundMultiple),
  cutletAndCake: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cutletAndCakeShare, 1),
  dimSumTea: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.dimSumTeaMultiple),
  drumstickDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.drumstickDuoShare, 1),
  eggplantCurry: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.eggplantCurryMultiple),
  eggTopRice: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.eggTopRiceShare, 1),
  figAndOlivePlatter: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.figAndOlivePlatterMultiple),
  fishAndWings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.fishAndWingsShare, 1),
  friedRiceSkewers: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.friedRiceSkewersMultiple),
  giantCrepe: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.giantCrepeShare, 1),
  glazedPorkPlate: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.glazedPorkPlateMultiple),
  goldenCakeGrill: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goldenCakeGrillShare, 1),
  goldenNaan: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.goldenNaanMultiple),
  goldenPiePlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goldenPiePlateShare, 1),
  grilledFishRice: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.grilledFishRiceMultiple),
  layeredPastrySpread: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.layeredPastrySpreadShare, 1),
  lemonMussels: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.lemonMusselsMultiple),
  limeTacoPlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.limeTacoPlateShare, 1),
  littlePlates: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.littlePlatesMultiple),
  lobsterCrown: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.lobsterCrownShare, 1),
  lobsterTail: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.lobsterTailMultiple),
  mangoPlatter: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.mangoPlatterUpgrades),
  meatballMezze: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.meatballMezzeShare, 1),
  meatballNoodles: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.meatballNoodlesMultiple),
  mustardJarSalmon: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.mustardJarSalmonUpgrades),
  nigiriRainbow: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.nigiriRainbowShare, 1),
  okraStew: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.okraStewMultiple),
  oktoberfest: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.oktoberfestUpgrades),
  oliveOilTrio: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.oliveOilTrioShare, 1),
  onigiriParty: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.onigiriPartyMultiple),
  paellaPicnic: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.paellaPicnicUpgrades),
  pepperoniTwirl: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.pepperoniTwirlShare, 1),
  pickleAndSteakBoard: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.pickleAndSteakBoardMultiple),
  plantainPlatter: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.plantainPlatterUpgrades),
  polentaMountain: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.polentaMountainShare, 1),
  pomegranateKebab: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.pomegranateKebabMultiple),
  prawnAndRoast: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.prawnAndRoastUpgrades),
  pretzelBangers: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.pretzelBangersShare, 1),
  pretzelPileup: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.pretzelPileupMultiple),
  puddingCupMussels: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.puddingCupMusselsUpgrades),
  redBeanCatch: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.redBeanCatchShare, 1),
  redPorkBowl: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.redPorkBowlMultiple),
  redRimFish: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.redRimFishUpgrades),
  rolledWrapSkewers: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.rolledWrapSkewersShare, 1),
  royalBuffet: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.royalBuffetMultiple),
  saffronSpread: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.saffronSpreadUpgrades),
  salmonGreens: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.salmonGreensShare, 1),
  salmonSquareSnacks: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.salmonSquareSnacksMultiple),
  samosaCurry: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.samosaCurryUpgrades),
  sausagePotLunch: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.sausagePotLunchShare, 1),
  sausageToastRice: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.sausageToastRiceMultiple),
  shrimpTray: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.shrimpTrayUpgrades),
  silverFishSupper: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.silverFishSupperShare, 1),
  smorgasbord: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.smorgasbordMultiple),
  sourCreamPancakes: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.sourCreamPancakesUpgrades),
  steakTacoNight: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.steakTacoNightShare, 1),
  steamingHotPot: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.steamingHotPotMultiple),
  stuffedGrapeLeaves: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.stuffedGrapeLeavesUpgrades),
  stuffedPastryPicnic: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.stuffedPastryPicnicShare, 1),
  stuffedRollRoast: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.stuffedRollRoastMultiple),
  surfAndTurfPan: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.surfAndTurfPanUpgrades),
  tacoTuesday: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tacoTuesdayShare, 1),
  tagineTable: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.tagineTableMultiple),
  teaHouseLunch: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.teaHouseLunchUpgrades),
  tempuraTray: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tempuraTrayShare, 1),
  tortillaStew: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.tortillaStewMultiple),
  twinLobsters: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.twinLobstersUpgrades),
  twoGlassTapas: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.twoGlassTapasShare, 1),
  umbrellaDrink: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.umbrellaDrinkMultiple),
  wickerBasketBites: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.wickerBasketBitesUpgrades),
  woodenMugGrill: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.woodenMugGrillMultiple),
  yellowSpoonRice: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.yellowSpoonRiceUpgrades),
  acaiBoard: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.acaiBoardMultiple),
  baklavaMezze: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.baklavaMezzeUpgrades),
  bambooTraySatay: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.bambooTraySatayMultiple),
  bananaLeafSatay: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.bananaLeafSatayUpgrades),
  bunAndFillet: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.bunAndFilletMultiple),
  cevapiEspresso: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.cevapiEspressoUpgrades),
  clayPotYogurt: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.clayPotYogurtMultiple),
  copperPotKebabs: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.copperPotKebabsUpgrades),
  cucumberSoupMeze: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.cucumberSoupMezeMultiple),
  ebaAndOkra: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.ebaAndOkraUpgrades),
  feijoadaFiesta: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.feijoadaFiestaMultiple),
  flatbreadFingers: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.flatbreadFingersUpgrades),
  fufuMound: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.fufuMoundMultiple),
  grilledPorkNoodles: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.grilledPorkNoodlesUpgrades),
  honeyPotBanitsa: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.honeyPotBanitsaUpgrades),
  islandTwinFish: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.islandTwinFishUpgrades),
  leafCupCurry: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.leafCupCurryUpgrades),
  mapleSyrupBagel: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.mapleSyrupBagelUpgrades),
  nanaimoPoutine: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.nanaimoPoutineUpgrades),
  puffPuffSpread: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.puffPuffSpreadUpgrades),
  quesoFritoPlate: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.quesoFritoPlateGrowth),
  roastedPepperFeast: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.roastedPepperFeastUpgrades),
  sambalDrumstick: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.sambalDrumstickGrowth),
  stickyRiceCloud: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.stickyRiceCloudUpgrades),
  sunnyEggFishFry: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.sunnyEggFishFryGrowth),
  tomatoRiceCatch: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.tomatoRiceCatchUpgrades),
  waakyePlate: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.waakyePlateGrowth),
  wovenTrayGrill: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.wovenTrayGrillUpgrades),
  suyaAndStew: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.suyaAndStewGrowth),
} satisfies FeaturedRewards<typeof WORLD_FEASTS_CRITS>;
