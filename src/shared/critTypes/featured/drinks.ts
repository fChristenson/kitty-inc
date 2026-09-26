import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const DRINKS_CRITS = {
  berrySmoothie: {
    label: "Berry Smoothie",
    color: COLOR.peppermintPink,
    image: "crits/drinks/berrySmoothie.png",
    description: "Thirty-two payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.berrySmoothiePayouts,
      ),
  },
  spicedChai: {
    label: "Spiced Chai",
    color: COLOR.autumnSaleAmber,
    image: "crits/drinks/spicedChai.png",
    description: "Thirty-five instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.spicedChaiPayouts),
  },
  mochaFroth: {
    label: "Mocha Froth",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/mochaFroth.png",
    description: "Twenty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.mochaFrothPayouts),
  },
  treasureTeapot: {
    label: "Treasure Teapot",
    color: COLOR.gold,
    image: "crits/drinks/treasureTeapot.png",
    description: "Thirty-four payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.treasureTeapotPayouts,
      ),
  },
  berrySmoothie2: {
    label: "Berry Blast",
    color: COLOR.springSalePink,
    image: "crits/drinks/berrySmoothie2.png",
    description: "Twenty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.berrySmoothie2Payouts),
  },
  berrySmoothie3: {
    label: "Berry Velvet",
    color: COLOR.blue,
    image: "crits/drinks/berrySmoothie3.png",
    description: "Twenty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.berrySmoothie3Upgrades),
  },
  berrySmoothie4: {
    label: "Berry Royale",
    color: COLOR.luckyCloverGreen,
    image: "crits/drinks/berrySmoothie4.png",
    description: "Thirty-one instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.berrySmoothie4Payouts),
  },
  icedCoffee: {
    label: "Iced Coffee",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/icedCoffee.png",
    description: "Eighteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.icedCoffeePayouts),
  },
  tropicalLemonade: {
    label: "Tropical Lemonade",
    color: COLOR.sunshineGold,
    image: "crits/drinks/tropicalLemonade.png",
    description: "Twenty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.tropicalLemonadeUpgrades),
  },
  tropicalLemonade2: {
    label: "Citrus Fizz",
    color: COLOR.luckyCloverGreen,
    image: "crits/drinks/tropicalLemonade2.png",
    description: "Twenty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tropicalLemonade2Payouts),
  },
  hotChocolate: {
    label: "Hot Chocolate",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/hotChocolate.png",
    description: "Nineteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.hotChocolateUpgrades),
  },
  hotChocolate2: {
    label: "Marshmallow Melt",
    color: COLOR.gold,
    image: "crits/drinks/hotChocolate2.png",
    description: "Twenty-one instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.hotChocolate2Payouts),
  },
  sunsetMargarita: {
    label: "Sunset Margarita",
    color: COLOR.orange,
    image: "crits/drinks/sunsetMargarita.png",
    description: "Seventeen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.sunsetMargaritaUpgrades),
  },
  blueLagoonCocktail: {
    label: "Blue Lagoon",
    color: COLOR.blue,
    image: "crits/drinks/blueLagoonCocktail.png",
    description: "Twenty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.blueLagoonCocktailUpgrades),
  },
  blueLagoonCocktail2: {
    label: "Lagoon Fizz",
    color: COLOR.blue,
    image: "crits/drinks/blueLagoonCocktail2.png",
    description: "Twenty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.blueLagoonCocktail2Payouts),
  },
  blueLagoonCocktail3: {
    label: "Azure Splash",
    color: COLOR.springSalePink,
    image: "crits/drinks/blueLagoonCocktail3.png",
    description: "Twenty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.blueLagoonCocktail3Upgrades),
  },
  strawberryDaiquiri: {
    label: "Strawberry Daiquiri",
    color: COLOR.springSalePink,
    image: "crits/drinks/strawberryDaiquiri.png",
    description: "Twenty-seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.strawberryDaiquiriPayouts),
  },
  mangoMojito: {
    label: "Mango Mojito",
    color: COLOR.sunshineGold,
    image: "crits/drinks/mangoMojito.png",
    description: "Twenty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.mangoMojitoUpgrades),
  },
  mangoMojito2: {
    label: "Mango Mint",
    color: COLOR.luckyCloverGreen,
    image: "crits/drinks/mangoMojito2.png",
    description: "Twenty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.mangoMojito2Payouts),
  },
  espressoMartini: {
    label: "Espresso Martini",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/espressoMartini.png",
    description: "Thirty-two instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.espressoMartiniPayouts),
  },
  beerBelly: {
    label: "Beer Belly",
    color: COLOR.amber,
    image: "crits/drinks/beerBelly.png",
    description: "Twenty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.beerBellyPayouts),
  },
  bottomsUp: {
    label: "Bottoms Up",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/bottomsUp.png",
    description: "Twenty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.bottomsUpUpgrades),
  },
  wineCountry: {
    label: "Wine ",
    color: COLOR.fullHouseCrimson,
    image: "crits/drinks/wineCountry.png",
    description: "Twenty-seven instant payouts on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.wineCountryPayouts),
  },
  ponyKeg: {
    label: "Pony Keg",
    color: COLOR.chairGiveawayBrown,
    image: "crits/drinks/ponyKeg.png",
    description: "Twenty-eight payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.ponyKegPayouts),
  },
  vodkaWhiskers: {
    label: "Top Shelf",
    color: COLOR.pairBlue,
    image: "crits/drinks/vodkaWhiskers.png",
    description: "Thirty-one free upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.vodkaWhiskersUpgrades),
  },
  emptyGlass: {
    label: "On the Rocks",
    color: COLOR.snowdayFrost,
    image: "crits/drinks/emptyGlass.png",
    description: "Nineteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.emptyGlassPayouts),
  },
  amberSpritz: {
    label: "Amber Spritz",
    color: COLOR.summerSaleOrange,
    image: "crits/drinks/amberSpritz.png",
    description: "Twenty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.amberSpritzPayouts),
  },
  copperMugMule2: {
    label: "Mule Kick",
    color: COLOR.roundUpOrange,
    image: "crits/drinks/copperMugMule2.png",
    description: "Twenty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.copperMugMule2Payouts),
  },
  negroniNightfall2: {
    label: "Bitter Bounty",
    color: COLOR.fullHouseCrimson,
    image: "crits/drinks/negroniNightfall2.png",
    description: "Twenty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.negroniNightfall2Payouts),
  },
  blackberryBramble: {
    label: "Blackberry Bramble",
    color: COLOR.purple,
    image: "crits/drinks/blackberryBramble.png",
    description: "Twenty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.blackberryBrambleUpgrades),
  },
  blackberryBramble2: {
    label: "Bramble Bounty",
    color: COLOR.halloweenSalePurple,
    image: "crits/drinks/blackberryBramble2.png",
    description: "Twenty-one free upgrades on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.blackberryBramble2Upgrades),
  },
  singaporeSling: {
    label: "Singapore Sling",
    color: COLOR.springSalePink,
    image: "crits/drinks/singaporeSling.png",
    description: "Twenty-five instant payouts on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.singaporeSlingPayouts),
  },
  derbyDayJulep: {
    label: "Derby Day Julep",
    color: COLOR.luckyCloverGreen,
    image: "crits/drinks/derbyDayJulep.png",
    description: "Twenty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.derbyDayJulepUpgrades),
  },
  derbyDayJulep2: {
    label: "Frostcup Julep",
    color: COLOR.silverTicketGray,
    image: "crits/drinks/derbyDayJulep2.png",
    description: "Twenty-six payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.derbyDayJulep2Payouts),
  },
  hurricaneHour: {
    label: "Hurricane Hour",
    color: COLOR.red,
    image: "crits/drinks/hurricaneHour.png",
    description: "Twenty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.hurricaneHourUpgrades),
  },
  cosmoCashout: {
    label: "Cosmo Cashout",
    color: COLOR.peppermintPink,
    image: "crits/drinks/cosmoCashout.png",
    description: "Twenty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.cosmoCashoutUpgrades),
  },
  frenchSeventyFive: {
    label: "French Seventy-Five",
    color: COLOR.sunshineGold,
    image: "crits/drinks/frenchSeventyFive.png",
    description: "Twenty-six free upgrades on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.frenchSeventyFiveUpgrades),
  },
  sidecarSurge: {
    label: "Sidecar Surge",
    color: COLOR.amber,
    image: "crits/drinks/sidecarSurge.png",
    description: "Twenty-seven upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.sidecarSurgeUpgrades),
  },
  hurricaneHour2: {
    label: "Eye of the Storm",
    color: COLOR.grandOpeningRose,
    image: "crits/drinks/hurricaneHour2.png",
    description: "Thirty-one instant payouts on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.hurricaneHour2Payouts),
  },
  copperMugMule: {
    label: "Copper Mug Mule",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/drinks/copperMugMule.png",
    description: "Thirty free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.copperMugMuleUpgrades),
  },
  pineappleParadise: {
    label: "Pineapple Paradise",
    color: COLOR.sunshineGold,
    image: "crits/drinks/pineappleParadise.png",
    description: "Thirty-one upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.pineappleParadiseUpgrades,
      ),
  },
  negroniNightfall: {
    label: "Negroni Nightfall",
    color: COLOR.redActive,
    image: "crits/drinks/negroniNightfall.png",
    description: "Thirty upgrades here and on the highest floor",
    reward: (context, { actions, balance, highestFloor }) => {
      actions.upgrade([context.floor], balance.negroniNightfallUpgrades);
      actions.upgrade(
        [highestFloor(context)],
        balance.negroniNightfallUpgrades,
      );
    },
  },
  oldFashionedFortune: {
    label: "Old Fashioned Fortune",
    color: COLOR.goldStandardAmber,
    image: "crits/drinks/oldFashionedFortune.png",
    description: "Thirty-four payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.oldFashionedFortunePayouts,
      ),
  },
  tikiZombie: {
    label: "Tiki Zombie",
    color: COLOR.chairGiveawayBrown,
    image: "crits/drinks/tikiZombie.png",
    description: "Thirty-three instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.tikiZombiePayouts),
  },
  tikiZombie2: {
    label: "Tiki Torch",
    color: COLOR.orange,
    image: "crits/drinks/tikiZombie2.png",
    description: "Twenty upgrades, then twenty payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.tikiZombie2Upgrades);
      actions.payCycles([context.floor], balance.tikiZombie2Payouts);
    },
  },
  longIslandLandslide: {
    label: "Long Island Landslide",
    color: COLOR.teaBreakBrown,
    image: "crits/drinks/longIslandLandslide.png",
    description: "Thirty-six instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.longIslandLandslidePayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
