import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const WORLD_FEASTS_CRITS = {
  bananaFishPlate: {
    label: "Banana Fish Plate",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/bananaFishPlate.webp",
    description: "Promotes 80.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.bananaFishPlateShare, 1),
  },
  barbecuePot: {
    label: "Barbecue Pot",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/barbecuePot.webp",
    description: "Promotes 81% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.barbecuePotShare, 1),
  },
  basilBanquet: {
    label: "Basil Banquet",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/basilBanquet.webp",
    description: "Promotes 81.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.basilBanquetShare, 1),
  },
  batteredBrunch: {
    label: "Battered Brunch",
    color: COLOR.gold,
    image: "crits/worldFeasts/batteredBrunch.webp",
    description: "Promotes 82% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.batteredBrunchShare, 1),
  },
  beerHallPlate: {
    label: "Beer Hall Plate",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/beerHallPlate.webp",
    description: "Promotes 82.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.beerHallPlateShare, 1),
  },
  bentoBox: {
    label: "Bento Box",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/bentoBox.webp",
    description: "Pays 31 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.bentoBoxMultiple),
  },
  berryDumplings: {
    label: "Berry Dumplings",
    color: COLOR.gold,
    image: "crits/worldFeasts/berryDumplings.webp",
    description: "Promotes 83% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.berryDumplingsShare, 1),
  },
  blackBeanPlatter: {
    label: "Black Bean Platter",
    color: COLOR.starYellow,
    image: "crits/worldFeasts/blackBeanPlatter.webp",
    description: "Pays 32 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.blackBeanPlatterMultiple),
  },
  bluePlatterStew: {
    label: "Blue Platter Stew",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/bluePlatterStew.webp",
    description: "Promotes 83.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.bluePlatterStewShare, 1),
  },
  blueSnapper: {
    label: "Blue Snapper",
    color: COLOR.disabledGray,
    image: "crits/worldFeasts/blueSnapper.webp",
    description: "Pays 33 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.blueSnapperMultiple),
  },
  borschtBrunch: {
    label: "Borscht Brunch",
    color: COLOR.gold,
    image: "crits/worldFeasts/borschtBrunch.webp",
    description: "Promotes 84% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.borschtBrunchShare, 1),
  },
  burritoFiesta: {
    label: "Burrito Fiesta",
    color: COLOR.amber,
    image: "crits/worldFeasts/burritoFiesta.webp",
    description: "Pays 34 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.burritoFiestaMultiple),
  },
  charcuterieBoard: {
    label: "Charcuterie Board",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/charcuterieBoard.webp",
    description: "Promotes 84.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.charcuterieBoardShare, 1),
  },
  charredSkewer: {
    label: "Charred Skewer",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/charredSkewer.webp",
    description: "Pays 35 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.charredSkewerMultiple),
  },
  cheesyGreens: {
    label: "Cheesy Greens",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/cheesyGreens.webp",
    description: "Promotes 85% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.cheesyGreensShare, 1),
  },
  chickenRiceMound: {
    label: "Chicken Rice Mound",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/chickenRiceMound.webp",
    description: "Pays 36 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.chickenRiceMoundMultiple),
  },
  chocolateTruffleWaffle: {
    label: "Chocolate Truffle Waffle",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/chocolateTruffleWaffle.webp",
    description: "Promotes 85.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.chocolateTruffleWaffleShare, 1),
  },
  chopstickDumplings: {
    label: "Chopstick Dumplings",
    color: COLOR.gold,
    image: "crits/worldFeasts/chopstickDumplings.webp",
    description: "Pays 37 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.chopstickDumplingsMultiple),
  },
  chutneyPlate: {
    label: "Chutney Plate",
    color: COLOR.gold,
    image: "crits/worldFeasts/chutneyPlate.webp",
    description: "Promotes 86% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.chutneyPlateShare, 1),
  },
  citrusChicken: {
    label: "Citrus Chicken",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/citrusChicken.webp",
    description: "Pays 38 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.citrusChickenMultiple),
  },
  coconutBrunch: {
    label: "Coconut Brunch",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/worldFeasts/coconutBrunch.webp",
    description: "Promotes 86.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.coconutBrunchShare, 1),
  },
  coffeeBreak: {
    label: "Coffee Break",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/coffeeBreak.webp",
    description: "Pays 39 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.coffeeBreakMultiple),
  },
  cornCobCookout: {
    label: "Corn Cob Cookout",
    color: COLOR.amber,
    image: "crits/worldFeasts/cornCobCookout.webp",
    description: "Promotes 87% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.cornCobCookoutShare, 1),
  },
  curryRound: {
    label: "Curry Round",
    color: COLOR.gold,
    image: "crits/worldFeasts/curryRound.webp",
    description: "Pays 40 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.curryRoundMultiple),
  },
  cutletAndCake: {
    label: "Cutlet And Cake",
    color: COLOR.gold,
    image: "crits/worldFeasts/cutletAndCake.webp",
    description: "Promotes 87.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.cutletAndCakeShare, 1),
  },
  dimSumTea: {
    label: "Dim Sum Tea",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/dimSumTea.webp",
    description: "Pays 41 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.dimSumTeaMultiple),
  },
  drumstickDuo: {
    label: "Drumstick Duo",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/drumstickDuo.webp",
    description: "Promotes 88% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.drumstickDuoShare, 1),
  },
  eggplantCurry: {
    label: "Eggplant Curry",
    color: COLOR.amber,
    image: "crits/worldFeasts/eggplantCurry.webp",
    description: "Pays 42 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.eggplantCurryMultiple),
  },
  eggTopRice: {
    label: "Egg Top Rice",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/eggTopRice.webp",
    description: "Promotes 88.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.eggTopRiceShare, 1),
  },
  figAndOlivePlatter: {
    label: "Fig And Olive Platter",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/figAndOlivePlatter.webp",
    description: "Pays 43 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.figAndOlivePlatterMultiple),
  },
  fishAndWings: {
    label: "Fish And Wings",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/fishAndWings.webp",
    description: "Promotes 89% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.fishAndWingsShare, 1),
  },
  friedRiceSkewers: {
    label: "Fried Rice Skewers",
    color: COLOR.gold,
    image: "crits/worldFeasts/friedRiceSkewers.webp",
    description: "Pays 44 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.friedRiceSkewersMultiple),
  },
  giantCrepe: {
    label: "Giant Crepe",
    color: COLOR.gold,
    image: "crits/worldFeasts/giantCrepe.webp",
    description: "Promotes 89.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.giantCrepeShare, 1),
  },
  glazedPorkPlate: {
    label: "Glazed Pork Plate",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/glazedPorkPlate.webp",
    description: "Pays 60 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.glazedPorkPlateMultiple),
  },
  goldenCakeGrill: {
    label: "Golden Cake Grill",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/goldenCakeGrill.webp",
    description: "Promotes 90% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.goldenCakeGrillShare, 1),
  },
  goldenNaan: {
    label: "Golden Naan",
    color: COLOR.gold,
    image: "crits/worldFeasts/goldenNaan.webp",
    description: "Pays 61 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.goldenNaanMultiple),
  },
  goldenPiePlate: {
    label: "Golden Pie Plate",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/goldenPiePlate.webp",
    description: "Promotes 90.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.goldenPiePlateShare, 1),
  },
  grilledFishRice: {
    label: "Grilled Fish Rice",
    color: COLOR.gold,
    image: "crits/worldFeasts/grilledFishRice.webp",
    description: "Pays 62 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.grilledFishRiceMultiple),
  },
  layeredPastrySpread: {
    label: "Layered Pastry Spread",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/layeredPastrySpread.webp",
    description: "Promotes 91% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.layeredPastrySpreadShare, 1),
  },
  lemonMussels: {
    label: "Lemon Mussels",
    color: COLOR.gold,
    image: "crits/worldFeasts/lemonMussels.webp",
    description: "Pays 63 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.lemonMusselsMultiple),
  },
  limeTacoPlate: {
    label: "Lime Taco Plate",
    color: COLOR.gold,
    image: "crits/worldFeasts/limeTacoPlate.webp",
    description: "Promotes 91.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.limeTacoPlateShare, 1),
  },
  littlePlates: {
    label: "Little Plates",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/littlePlates.webp",
    description: "Pays 64 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.littlePlatesMultiple),
  },
  lobsterCrown: {
    label: "Lobster Crown",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/lobsterCrown.webp",
    description: "Promotes 92% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.lobsterCrownShare, 1),
  },
  lobsterTail: {
    label: "Lobster Tail",
    color: COLOR.gold,
    image: "crits/worldFeasts/lobsterTail.webp",
    description: "Pays 65 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.lobsterTailMultiple),
  },
  mangoPlatter: {
    label: "Mango Platter",
    color: COLOR.starYellow,
    image: "crits/worldFeasts/mangoPlatter.webp",
    description: "Spreads 76 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.mangoPlatterUpgrades),
  },
  meatballMezze: {
    label: "Meatball Mezze",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/meatballMezze.webp",
    description: "Promotes 92.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.meatballMezzeShare, 1),
  },
  meatballNoodles: {
    label: "Meatball Noodles",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/meatballNoodles.webp",
    description: "Pays 66 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.meatballNoodlesMultiple),
  },
  mustardJarSalmon: {
    label: "Mustard Jar Salmon",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/mustardJarSalmon.webp",
    description: "Spreads 77 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.mustardJarSalmonUpgrades),
  },
  nigiriRainbow: {
    label: "Nigiri Rainbow",
    color: COLOR.coinGold,
    image: "crits/worldFeasts/nigiriRainbow.webp",
    description: "Promotes 93% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.nigiriRainbowShare, 1),
  },
  okraStew: {
    label: "Okra Stew",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/okraStew.webp",
    description: "Pays 67 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.okraStewMultiple),
  },
  oktoberfest: {
    label: "Oktoberfest",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/oktoberfest.webp",
    description: "Spreads 78 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.oktoberfestUpgrades),
  },
  oliveOilTrio: {
    label: "Olive Oil Trio",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/oliveOilTrio.webp",
    description: "Promotes 93.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.oliveOilTrioShare, 1),
  },
  onigiriParty: {
    label: "Onigiri Party",
    color: COLOR.coinGold,
    image: "crits/worldFeasts/onigiriParty.webp",
    description: "Pays 68 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.onigiriPartyMultiple),
  },
  paellaPicnic: {
    label: "Paella Picnic",
    color: COLOR.gold,
    image: "crits/worldFeasts/paellaPicnic.webp",
    description: "Spreads 79 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.paellaPicnicUpgrades),
  },
  pepperoniTwirl: {
    label: "Pepperoni Twirl",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/pepperoniTwirl.webp",
    description: "Promotes 94% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.pepperoniTwirlShare, 1),
  },
  pickleAndSteakBoard: {
    label: "Pickle And Steak Board",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/pickleAndSteakBoard.webp",
    description: "Pays 69 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.pickleAndSteakBoardMultiple),
  },
  plantainPlatter: {
    label: "Plantain Platter",
    color: COLOR.gold,
    image: "crits/worldFeasts/plantainPlatter.webp",
    description: "Spreads 80 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.plantainPlatterUpgrades),
  },
  polentaMountain: {
    label: "Polenta Mountain",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/polentaMountain.webp",
    description: "Promotes 94.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.polentaMountainShare, 1),
  },
  pomegranateKebab: {
    label: "Pomegranate Kebab",
    color: COLOR.gold,
    image: "crits/worldFeasts/pomegranateKebab.webp",
    description: "Pays 70 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.pomegranateKebabMultiple),
  },
  prawnAndRoast: {
    label: "Prawn And Roast",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/prawnAndRoast.webp",
    description: "Spreads 81 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.prawnAndRoastUpgrades),
  },
  pretzelBangers: {
    label: "Pretzel Bangers",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/pretzelBangers.webp",
    description: "Promotes 95% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.pretzelBangersShare, 1),
  },
  pretzelPileup: {
    label: "Pretzel Pileup",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/pretzelPileup.webp",
    description: "Pays 71 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.pretzelPileupMultiple),
  },
  puddingCupMussels: {
    label: "Pudding Cup Mussels",
    color: COLOR.gold,
    image: "crits/worldFeasts/puddingCupMussels.webp",
    description: "Spreads 82 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.puddingCupMusselsUpgrades),
  },
  redBeanCatch: {
    label: "Red Bean Catch",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/redBeanCatch.webp",
    description: "Promotes 95.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.redBeanCatchShare, 1),
  },
  redPorkBowl: {
    label: "Red Pork Bowl",
    color: COLOR.redActive,
    image: "crits/worldFeasts/redPorkBowl.webp",
    description: "Pays 72 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.redPorkBowlMultiple),
  },
  redRimFish: {
    label: "Red Rim Fish",
    color: COLOR.sameBoatCoral,
    image: "crits/worldFeasts/redRimFish.webp",
    description: "Spreads 83 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.redRimFishUpgrades),
  },
  rolledWrapSkewers: {
    label: "Rolled Wrap Skewers",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/rolledWrapSkewers.webp",
    description: "Promotes 96% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.rolledWrapSkewersShare, 1),
  },
  royalBuffet: {
    label: "Royal Buffet",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/royalBuffet.webp",
    description: "Pays 73 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.royalBuffetMultiple),
  },
  saffronSpread: {
    label: "Saffron Spread",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/saffronSpread.webp",
    description: "Spreads 84 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.saffronSpreadUpgrades),
  },
  salmonGreens: {
    label: "Salmon Greens",
    color: COLOR.starYellow,
    image: "crits/worldFeasts/salmonGreens.webp",
    description: "Promotes 96.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.salmonGreensShare, 1),
  },
  salmonSquareSnacks: {
    label: "Salmon Square Snacks",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/salmonSquareSnacks.webp",
    description: "Pays 74 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.salmonSquareSnacksMultiple),
  },
  samosaCurry: {
    label: "Samosa Curry",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/samosaCurry.webp",
    description: "Spreads 85 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.samosaCurryUpgrades),
  },
  sausagePotLunch: {
    label: "Sausage Pot Lunch",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/sausagePotLunch.webp",
    description: "Promotes 97% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.sausagePotLunchShare, 1),
  },
  sausageToastRice: {
    label: "Sausage Toast Rice",
    color: COLOR.coinGold,
    image: "crits/worldFeasts/sausageToastRice.webp",
    description: "Pays 75 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.sausageToastRiceMultiple),
  },
  shrimpTray: {
    label: "Shrimp Tray",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/shrimpTray.webp",
    description: "Spreads 86 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.shrimpTrayUpgrades),
  },
  silverFishSupper: {
    label: "Silver Fish Supper",
    color: COLOR.starYellow,
    image: "crits/worldFeasts/silverFishSupper.webp",
    description: "Promotes 97.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.silverFishSupperShare, 1),
  },
  smorgasbord: {
    label: "Smorgasbord",
    color: COLOR.teaBreakBrown,
    image: "crits/worldFeasts/smorgasbord.webp",
    description: "Pays 76 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.smorgasbordMultiple),
  },
  sourCreamPancakes: {
    label: "Sour Cream Pancakes",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/sourCreamPancakes.webp",
    description: "Spreads 87 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.sourCreamPancakesUpgrades),
  },
  steakTacoNight: {
    label: "Steak Taco Night",
    color: COLOR.coinGold,
    image: "crits/worldFeasts/steakTacoNight.webp",
    description: "Promotes 98% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.steakTacoNightShare, 1),
  },
  steamingHotPot: {
    label: "Steaming Hot Pot",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/steamingHotPot.webp",
    description: "Pays 77 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.steamingHotPotMultiple),
  },
  stuffedGrapeLeaves: {
    label: "Stuffed Grape Leaves",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/stuffedGrapeLeaves.webp",
    description: "Spreads 88 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.stuffedGrapeLeavesUpgrades),
  },
  stuffedPastryPicnic: {
    label: "Stuffed Pastry Picnic",
    color: COLOR.starYellow,
    image: "crits/worldFeasts/stuffedPastryPicnic.webp",
    description: "Promotes 98.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.stuffedPastryPicnicShare, 1),
  },
  stuffedRollRoast: {
    label: "Stuffed Roll Roast",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/stuffedRollRoast.webp",
    description: "Pays 78 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.stuffedRollRoastMultiple),
  },
  surfAndTurfPan: {
    label: "Surf And Turf Pan",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/surfAndTurfPan.webp",
    description: "Spreads 89 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.surfAndTurfPanUpgrades),
  },
  tacoTuesday: {
    label: "Taco Tuesday",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/worldFeasts/tacoTuesday.webp",
    description: "Promotes 99% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.tacoTuesdayShare, 1),
  },
  tagineTable: {
    label: "Tagine Table",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/tagineTable.webp",
    description: "Pays 79 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.tagineTableMultiple),
  },
  teaHouseLunch: {
    label: "Tea House Lunch",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/teaHouseLunch.webp",
    description: "Spreads 90 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.teaHouseLunchUpgrades),
  },
  tempuraTray: {
    label: "Tempura Tray",
    color: COLOR.orange,
    image: "crits/worldFeasts/tempuraTray.webp",
    description: "Promotes 99.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.tempuraTrayShare, 1),
  },
  tortillaStew: {
    label: "Tortilla Stew",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/tortillaStew.webp",
    description: "Pays 80 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.tortillaStewMultiple),
  },
  twinLobsters: {
    label: "Twin Lobsters",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/twinLobsters.webp",
    description: "Spreads 91 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.twinLobstersUpgrades),
  },
  twoGlassTapas: {
    label: "Two Glass Tapas",
    color: COLOR.gold,
    image: "crits/worldFeasts/twoGlassTapas.webp",
    description: "Promotes 100% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.twoGlassTapasShare, 1),
  },
  umbrellaDrink: {
    label: "Umbrella Drink",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/umbrellaDrink.webp",
    description: "Pays 81 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.umbrellaDrinkMultiple),
  },
  wickerBasketBites: {
    label: "Wicker Basket Bites",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/wickerBasketBites.webp",
    description: "Spreads 92 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.wickerBasketBitesUpgrades),
  },
  woodenMugGrill: {
    label: "Wooden Mug Grill",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/woodenMugGrill.webp",
    description: "Pays 82 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.woodenMugGrillMultiple),
  },
  yellowSpoonRice: {
    label: "Yellow Spoon Rice",
    color: COLOR.gold,
    image: "crits/worldFeasts/yellowSpoonRice.webp",
    description: "Spreads 93 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.yellowSpoonRiceUpgrades),
  },
  acaiBoard: {
    label: "Acai Board",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/acaiBoard.webp",
    description: "Pays 83 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.acaiBoardMultiple),
  },
  baklavaMezze: {
    label: "Baklava Mezze",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/baklavaMezze.webp",
    description: "Spreads 94 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.baklavaMezzeUpgrades),
  },
  bambooTraySatay: {
    label: "Bamboo Tray Satay",
    color: COLOR.amberMuted,
    image: "crits/worldFeasts/bambooTraySatay.webp",
    description: "Pays 84 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.bambooTraySatayMultiple),
  },
  bananaLeafSatay: {
    label: "Banana Leaf Satay",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/bananaLeafSatay.webp",
    description: "Spreads 95 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.bananaLeafSatayUpgrades),
  },
  bunAndFillet: {
    label: "Bun And Fillet",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/bunAndFillet.webp",
    description: "Pays 85 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.bunAndFilletMultiple),
  },
  cevapiEspresso: {
    label: "Cevapi Espresso",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/cevapiEspresso.webp",
    description: "Spreads 96 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.cevapiEspressoUpgrades),
  },
  clayPotYogurt: {
    label: "Clay Pot Yogurt",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/clayPotYogurt.webp",
    description: "Pays 86 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.clayPotYogurtMultiple),
  },
  copperPotKebabs: {
    label: "Copper Pot Kebabs",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/copperPotKebabs.webp",
    description: "Spreads 97 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.copperPotKebabsUpgrades),
  },
  cucumberSoupMeze: {
    label: "Cucumber Soup Meze",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/cucumberSoupMeze.webp",
    description: "Pays 87 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.cucumberSoupMezeMultiple),
  },
  ebaAndOkra: {
    label: "Eba And Okra",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/ebaAndOkra.webp",
    description: "Spreads 98 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.ebaAndOkraUpgrades),
  },
  feijoadaFiesta: {
    label: "Feijoada Fiesta",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/feijoadaFiesta.webp",
    description: "Pays 88 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.feijoadaFiestaMultiple),
  },
  flatbreadFingers: {
    label: "Flatbread Fingers",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/flatbreadFingers.webp",
    description: "Spreads 99 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.flatbreadFingersUpgrades),
  },
  fufuMound: {
    label: "Fufu Mound",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/fufuMound.webp",
    description: "Pays 89 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.fufuMoundMultiple),
  },
  grilledPorkNoodles: {
    label: "Grilled Pork Noodles",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/grilledPorkNoodles.webp",
    description: "Spreads 100 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.grilledPorkNoodlesUpgrades),
  },
  honeyPotBanitsa: {
    label: "Honey Pot Banitsa",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/honeyPotBanitsa.webp",
    description: "Spreads 101 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.honeyPotBanitsaUpgrades),
  },
  islandTwinFish: {
    label: "Island Twin Fish",
    color: COLOR.overflowBlue,
    image: "crits/worldFeasts/islandTwinFish.webp",
    description: "Spreads 102 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.islandTwinFishUpgrades),
  },
  leafCupCurry: {
    label: "Leaf Cup Curry",
    color: COLOR.payoutOlive,
    image: "crits/worldFeasts/leafCupCurry.webp",
    description: "Spreads 103 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.leafCupCurryUpgrades),
  },
  mapleSyrupBagel: {
    label: "Maple Syrup Bagel",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/mapleSyrupBagel.webp",
    description: "Spreads 104 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.mapleSyrupBagelUpgrades),
  },
  nanaimoPoutine: {
    label: "Nanaimo Poutine",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/nanaimoPoutine.webp",
    description: "Spreads 105 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.nanaimoPoutineUpgrades),
  },
  puffPuffSpread: {
    label: "Puff Puff Spread",
    color: COLOR.amber,
    image: "crits/worldFeasts/puffPuffSpread.webp",
    description: "Spreads 106 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.puffPuffSpreadUpgrades),
  },
  quesoFritoPlate: {
    label: "Queso Frito Plate",
    color: COLOR.starYellow,
    image: "crits/worldFeasts/quesoFritoPlate.webp",
    description: "Grows every unlocked floor's level by 10.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.quesoFritoPlateGrowth),
  },
  roastedPepperFeast: {
    label: "Roasted Pepper Feast",
    color: COLOR.redActive,
    image: "crits/worldFeasts/roastedPepperFeast.webp",
    description: "Spreads 107 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.roastedPepperFeastUpgrades),
  },
  sambalDrumstick: {
    label: "Sambal Drumstick",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/sambalDrumstick.webp",
    description: "Grows every unlocked floor's level by 10.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.sambalDrumstickGrowth),
  },
  stickyRiceCloud: {
    label: "Sticky Rice Cloud",
    color: COLOR.amber,
    image: "crits/worldFeasts/stickyRiceCloud.webp",
    description: "Spreads 108 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.stickyRiceCloudUpgrades),
  },
  sunnyEggFishFry: {
    label: "Sunny Egg Fish Fry",
    color: COLOR.supplyRunTan,
    image: "crits/worldFeasts/sunnyEggFishFry.webp",
    description: "Grows every unlocked floor's level by 10.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.sunnyEggFishFryGrowth),
  },
  tomatoRiceCatch: {
    label: "Tomato Rice Catch",
    color: COLOR.headhunterRust,
    image: "crits/worldFeasts/tomatoRiceCatch.webp",
    description: "Spreads 109 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.tomatoRiceCatchUpgrades),
  },
  waakyePlate: {
    label: "Waakye Plate",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/waakyePlate.webp",
    description: "Grows every unlocked floor's level by 10.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.waakyePlateGrowth),
  },
  wovenTrayGrill: {
    label: "Woven Tray Grill",
    color: COLOR.gold,
    image: "crits/worldFeasts/wovenTrayGrill.webp",
    description: "Spreads 110 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.wovenTrayGrillUpgrades),
  },
  suyaAndStew: {
    label: "Suya And Stew",
    color: COLOR.chairGiveawayBrown,
    image: "crits/worldFeasts/suyaAndStew.webp",
    description: "Grows every unlocked floor's level by 10.5% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.suyaAndStewGrowth),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
