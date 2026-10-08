import type { DRINKS_CRITS } from "../critData/drinks";
import type { FeaturedRewards } from "./types";

export const DRINKS_REWARDS = {
  berrySmoothie: (context, { actions, highestFloor }) =>
    actions.armCrit([highestFloor(context)], "crit"),
  spicedChai: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.spicedChaiPayouts),
  mochaFroth: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.mochaFrothPayouts),
  treasureTeapot: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.treasureTeapotSeconds),
  berrySmoothie2: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.berrySmoothie2ContinueChance),
  berrySmoothie3: (context, { actions, lowestLevel }) =>
    actions.armCrit([lowestLevel(context)], "crit"),
  berrySmoothie4: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.berrySmoothie4TierSteps,
      balance.berrySmoothie4Upgrades,
    ),
  icedCoffee: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.icedCoffeeBoostSeconds,
      balance.icedCoffeeExtraWorkers,
    ),
  tropicalLemonade: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.tropicalLemonadeFloors),
  tropicalLemonade2: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tropicalLemonade2Payouts),
  hotChocolate: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.hotChocolateUpgrades),
  hotChocolate2: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.hotChocolate2Payouts),
  sunsetMargarita: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.sunsetMargaritaFloors),
  blueLagoonCocktail: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.blueLagoonCocktailFloors),
  blueLagoonCocktail2: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.blueLagoonCocktail2Workers),
  blueLagoonCocktail3: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.blueLagoonCocktail3BoostSeconds,
      balance.blueLagoonCocktail3ExtraWorkers,
    ),
  strawberryDaiquiri: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.strawberryDaiquiriBoostSeconds,
      balance.strawberryDaiquiriExtraWorkers,
    ),
  mangoMojito: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.mangoMojitoUpgrades),
  mangoMojito2: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.mangoMojito2Payouts),
  espressoMartini: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.espressoMartiniBoostSeconds,
      balance.espressoMartiniExtraWorkers,
    ),
  beerBelly: (context, { actions }) => actions.hireManagers([context.floor]),
  bottomsUp: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.bottomsUpBoostSeconds,
      balance.bottomsUpExtraWorkers,
    ),
  wineCountry: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.wineCountryContinueChance),
  ponyKeg: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  vodkaWhiskers: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.vodkaWhiskersBoostSeconds,
      balance.vodkaWhiskersExtraWorkers,
    ),
  emptyGlass: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.emptyGlassPayouts),
  amberSpritz: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.amberSpritzWorkers),
  copperMugMule2: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.copperMugMule2Payouts),
  negroniNightfall2: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.negroniNightfall2Seconds),
  blackberryBramble: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.blackberryBrambleDiscount),
  blackberryBramble2: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blackberryBramble2Share),
  singaporeSling: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.singaporeSlingPayouts),
  derbyDayJulep: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.derbyDayJulepContinueChance),
  derbyDayJulep2: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.derbyDayJulep2Discount),
  hurricaneHour: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.hurricaneHourFloors),
  cosmoCashout: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cosmoCashoutSeconds),
  frenchSeventyFive: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  sidecarSurge: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.sidecarSurgeBoostSeconds,
      balance.sidecarSurgeExtraWorkers,
    ),
  hurricaneHour2: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.hurricaneHour2ContinueChance),
  copperMugMule: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  pineappleParadise: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.pineappleParadiseFloors),
  negroniNightfall: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.negroniNightfallDiscount),
  oldFashionedFortune: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.oldFashionedFortuneShare),
  tikiZombie: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.tikiZombiePayouts),
  tikiZombie2: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.tikiZombie2ContinueChance),
  longIslandLandslide: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.longIslandLandslidePayouts),
  popCulture: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.popCultureBoostSeconds,
      balance.popCultureExtraWorkers,
    ),
} satisfies FeaturedRewards<typeof DRINKS_CRITS>;
