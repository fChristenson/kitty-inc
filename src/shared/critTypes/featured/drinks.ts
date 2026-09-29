import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const DRINKS_CRITS = {
  berrySmoothie: {
    label: "Berry Smoothie",
    color: COLOR.peppermintPink,
    image: "crits/drinks/berrySmoothie.webp",
    description: "Arms the highest floor's next click as an x5 crit",
    reward: (context, { actions, highestFloor }) =>
      actions.armCrit([highestFloor(context)], "crit"),
  },
  spicedChai: {
    label: "Spiced Chai",
    color: COLOR.autumnSaleAmber,
    image: "crits/drinks/spicedChai.webp",
    description: "Thirty-five instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.spicedChaiPayouts),
  },
  mochaFroth: {
    label: "Mocha Froth",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/mochaFroth.webp",
    description: "Twenty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.mochaFrothPayouts),
  },
  treasureTeapot: {
    label: "Treasure Teapot",
    color: COLOR.gold,
    image: "crits/drinks/treasureTeapot.webp",
    description: "Adds 21s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.treasureTeapotSeconds),
  },
  berrySmoothie2: {
    label: "Berry Blast",
    color: COLOR.springSalePink,
    image: "crits/drinks/berrySmoothie2.webp",
    description:
      "Repeats the crit above and below, 43% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.berrySmoothie2ContinueChance),
  },
  berrySmoothie3: {
    label: "Berry Velvet",
    color: COLOR.blue,
    image: "crits/drinks/berrySmoothie3.webp",
    description: "Arms the lowest-level floor's next click as an x5 crit",
    reward: (context, { actions, lowestLevel }) =>
      actions.armCrit([lowestLevel(context)], "crit"),
  },
  berrySmoothie4: {
    label: "Berry Royale",
    color: COLOR.luckyCloverGreen,
    image: "crits/drinks/berrySmoothie4.webp",
    description: "One tier promotion and 16 upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(
        lowestLevel(context),
        balance.berrySmoothie4TierSteps,
        balance.berrySmoothie4Upgrades,
      ),
  },
  icedCoffee: {
    label: "Iced Coffee",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/icedCoffee.webp",
    description: "Boosts every worker for 16s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.icedCoffeeBoostSeconds,
        balance.icedCoffeeExtraWorkers,
      ),
  },
  tropicalLemonade: {
    label: "Tropical Lemonade",
    color: COLOR.sunshineGold,
    image: "crits/drinks/tropicalLemonade.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.tropicalLemonadeFloors),
  },
  tropicalLemonade2: {
    label: "Citrus Fizz",
    color: COLOR.luckyCloverGreen,
    image: "crits/drinks/tropicalLemonade2.webp",
    description: "Twenty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tropicalLemonade2Payouts),
  },
  hotChocolate: {
    label: "Hot Chocolate",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/hotChocolate.webp",
    description: "Nineteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.hotChocolateUpgrades),
  },
  hotChocolate2: {
    label: "Marshmallow Melt",
    color: COLOR.gold,
    image: "crits/drinks/hotChocolate2.webp",
    description: "Twenty-one instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.hotChocolate2Payouts),
  },
  sunsetMargarita: {
    label: "Sunset Margarita",
    color: COLOR.orange,
    image: "crits/drinks/sunsetMargarita.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.sunsetMargaritaFloors),
  },
  blueLagoonCocktail: {
    label: "Blue Lagoon",
    color: COLOR.blue,
    image: "crits/drinks/blueLagoonCocktail.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.blueLagoonCocktailFloors),
  },
  blueLagoonCocktail2: {
    label: "Lagoon Fizz",
    color: COLOR.blue,
    image: "crits/drinks/blueLagoonCocktail2.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.blueLagoonCocktail2Workers),
  },
  blueLagoonCocktail3: {
    label: "Azure Splash",
    color: COLOR.springSalePink,
    image: "crits/drinks/blueLagoonCocktail3.webp",
    description: "Boosts every worker for 17s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.blueLagoonCocktail3BoostSeconds,
        balance.blueLagoonCocktail3ExtraWorkers,
      ),
  },
  strawberryDaiquiri: {
    label: "Strawberry Daiquiri",
    color: COLOR.springSalePink,
    image: "crits/drinks/strawberryDaiquiri.webp",
    description: "Boosts every worker for 17s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.strawberryDaiquiriBoostSeconds,
        balance.strawberryDaiquiriExtraWorkers,
      ),
  },
  mangoMojito: {
    label: "Mango Mojito",
    color: COLOR.sunshineGold,
    image: "crits/drinks/mangoMojito.webp",
    description: "Twenty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.mangoMojitoUpgrades),
  },
  mangoMojito2: {
    label: "Mango Mint",
    color: COLOR.luckyCloverGreen,
    image: "crits/drinks/mangoMojito2.webp",
    description: "Twenty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.mangoMojito2Payouts),
  },
  espressoMartini: {
    label: "Espresso Martini",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/espressoMartini.webp",
    description: "Boosts every worker for 19s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.espressoMartiniBoostSeconds,
        balance.espressoMartiniExtraWorkers,
      ),
  },
  beerBelly: {
    label: "Beer Belly",
    color: COLOR.amber,
    image: "crits/drinks/beerBelly.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  bottomsUp: {
    label: "Bottoms Up",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/bottomsUp.webp",
    description: "Boosts every worker for 17s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.bottomsUpBoostSeconds,
        balance.bottomsUpExtraWorkers,
      ),
  },
  wineCountry: {
    label: "Wine Country",
    color: COLOR.fullHouseCrimson,
    image: "crits/drinks/wineCountry.webp",
    description:
      "Repeats the crit on the floor below, 31% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.wineCountryContinueChance),
  },
  ponyKeg: {
    label: "Pony Keg",
    color: COLOR.chairGiveawayBrown,
    image: "crits/drinks/ponyKeg.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  vodkaWhiskers: {
    label: "Top Shelf",
    color: COLOR.pairBlue,
    image: "crits/drinks/vodkaWhiskers.webp",
    description: "Boosts every worker for 18s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.vodkaWhiskersBoostSeconds,
        balance.vodkaWhiskersExtraWorkers,
      ),
  },
  emptyGlass: {
    label: "On the Rocks",
    color: COLOR.snowdayFrost,
    image: "crits/drinks/emptyGlass.webp",
    description: "Nineteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.emptyGlassPayouts),
  },
  amberSpritz: {
    label: "Amber Spritz",
    color: COLOR.summerSaleOrange,
    image: "crits/drinks/amberSpritz.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.amberSpritzWorkers),
  },
  copperMugMule2: {
    label: "Mule Kick",
    color: COLOR.roundUpOrange,
    image: "crits/drinks/copperMugMule2.webp",
    description: "Twenty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.copperMugMule2Payouts),
  },
  negroniNightfall2: {
    label: "Bitter Bounty",
    color: COLOR.fullHouseCrimson,
    image: "crits/drinks/negroniNightfall2.webp",
    description: "Adds 13s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.negroniNightfall2Seconds),
  },
  blackberryBramble: {
    label: "Blackberry Bramble",
    color: COLOR.purple,
    image: "crits/drinks/blackberryBramble.webp",
    description: "Cuts every price in this building by 2.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.blackberryBrambleDiscount),
  },
  blackberryBramble2: {
    label: "Bramble Bounty",
    color: COLOR.halloweenSalePurple,
    image: "crits/drinks/blackberryBramble2.webp",
    description: "Adds 6.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.blackberryBramble2Share),
  },
  singaporeSling: {
    label: "Singapore Sling",
    color: COLOR.springSalePink,
    image: "crits/drinks/singaporeSling.webp",
    description: "Twenty-five instant payouts on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.singaporeSlingPayouts),
  },
  derbyDayJulep: {
    label: "Derby Day Julep",
    color: COLOR.luckyCloverGreen,
    image: "crits/drinks/derbyDayJulep.webp",
    description:
      "Repeats the crit on the floor above, 33% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.derbyDayJulepContinueChance),
  },
  derbyDayJulep2: {
    label: "Frostcup Julep",
    color: COLOR.silverTicketGray,
    image: "crits/drinks/derbyDayJulep2.webp",
    description: "Cuts every price in this building by 2.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.derbyDayJulep2Discount),
  },
  hurricaneHour: {
    label: "Hurricane Hour",
    color: COLOR.red,
    image: "crits/drinks/hurricaneHour.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.hurricaneHourFloors),
  },
  cosmoCashout: {
    label: "Cosmo Cashout",
    color: COLOR.peppermintPink,
    image: "crits/drinks/cosmoCashout.webp",
    description: "Adds 14s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.cosmoCashoutSeconds),
  },
  frenchSeventyFive: {
    label: "French Seventy-Five",
    color: COLOR.sunshineGold,
    image: "crits/drinks/frenchSeventyFive.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  sidecarSurge: {
    label: "Sidecar Surge",
    color: COLOR.amber,
    image: "crits/drinks/sidecarSurge.webp",
    description: "Boosts every worker for 18s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.sidecarSurgeBoostSeconds,
        balance.sidecarSurgeExtraWorkers,
      ),
  },
  hurricaneHour2: {
    label: "Eye of the Storm",
    color: COLOR.grandOpeningRose,
    image: "crits/drinks/hurricaneHour2.webp",
    description:
      "Repeats the crit on the floor below, 35% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.hurricaneHour2ContinueChance),
  },
  copperMugMule: {
    label: "Copper Mug Mule",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/drinks/copperMugMule.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  pineappleParadise: {
    label: "Pineapple Paradise",
    color: COLOR.sunshineGold,
    image: "crits/drinks/pineappleParadise.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.pineappleParadiseFloors),
  },
  negroniNightfall: {
    label: "Negroni Nightfall",
    color: COLOR.redActive,
    image: "crits/drinks/negroniNightfall.webp",
    description: "Cuts every price in this building by 3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.negroniNightfallDiscount),
  },
  oldFashionedFortune: {
    label: "Old Fashioned Fortune",
    color: COLOR.goldStandardAmber,
    image: "crits/drinks/oldFashionedFortune.webp",
    description: "Adds 7.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.oldFashionedFortuneShare),
  },
  tikiZombie: {
    label: "Tiki Zombie",
    color: COLOR.chairGiveawayBrown,
    image: "crits/drinks/tikiZombie.webp",
    description: "Thirty-three instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.tikiZombiePayouts),
  },
  tikiZombie2: {
    label: "Tiki Torch",
    color: COLOR.orange,
    image: "crits/drinks/tikiZombie2.webp",
    description:
      "Repeats the crit on the floor below, 50% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.tikiZombie2ContinueChance),
  },
  longIslandLandslide: {
    label: "Long Island Landslide",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/longIslandLandslide.webp",
    description: "Thirty-six instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.longIslandLandslidePayouts),
  },
  popCulture: {
    label: "Pop Culture",
    color: COLOR.roundUpOrange,
    image: "crits/drinks/popCulture.webp",
    description: "Boosts every worker for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.popCultureBoostSeconds,
        balance.popCultureExtraWorkers,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
