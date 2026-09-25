import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createDrinksRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
}: RewardHelpers) {
  return {
    berrySmoothie: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.berrySmoothiePayouts,
      ),
    spicedChai: (context) =>
      actions.payCycles([context.floor], balance.spicedChaiPayouts),
    mochaFroth: (context) =>
      actions.payCycles([context.floor], balance.mochaFrothPayouts),
    treasureTeapot: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.treasureTeapotPayouts,
      ),
    berrySmoothie2: (context) =>
      actions.payCycles([context.floor], balance.berrySmoothie2Payouts),
    berrySmoothie3: (context) =>
      actions.upgrade([context.floor], balance.berrySmoothie3Upgrades),
    berrySmoothie4: (context) =>
      actions.payCycles(context.floors, balance.berrySmoothie4Payouts),
    icedCoffee: (context) =>
      actions.payCycles([context.floor], balance.icedCoffeePayouts),
    tropicalLemonade: (context) =>
      actions.upgrade([context.floor], balance.tropicalLemonadeUpgrades),
    tropicalLemonade2: (context) =>
      actions.payCycles([context.floor], balance.tropicalLemonade2Payouts),
    hotChocolate: (context) =>
      actions.upgrade([context.floor], balance.hotChocolateUpgrades),
    hotChocolate2: (context) =>
      actions.payCycles(context.floors, balance.hotChocolate2Payouts),
    sunsetMargarita: (context) =>
      actions.upgrade([context.floor], balance.sunsetMargaritaUpgrades),
    blueLagoonCocktail: (context) =>
      actions.upgrade([context.floor], balance.blueLagoonCocktailUpgrades),
    blueLagoonCocktail2: (context) =>
      actions.payCycles([context.floor], balance.blueLagoonCocktail2Payouts),
    blueLagoonCocktail3: (context) =>
      actions.upgrade([context.floor], balance.blueLagoonCocktail3Upgrades),
    strawberryDaiquiri: (context) =>
      actions.payCycles([context.floor], balance.strawberryDaiquiriPayouts),
    mangoMojito: (context) =>
      actions.upgrade([context.floor], balance.mangoMojitoUpgrades),
    mangoMojito2: (context) =>
      actions.payCycles([context.floor], balance.mangoMojito2Payouts),
    espressoMartini: (context) =>
      actions.payCycles(context.floors, balance.espressoMartiniPayouts),
    beerBelly: (context) =>
      actions.payCycles([context.floor], balance.beerBellyPayouts),
    bottomsUp: (context) =>
      actions.upgrade([context.floor], balance.bottomsUpUpgrades),
    wineCountry: (context) =>
      actions.payCycles(alternating(context), balance.wineCountryPayouts),
    ponyKeg: (context) =>
      actions.payCycles([lowestLevel(context)], balance.ponyKegPayouts),
    vodkaWhiskers: (context) =>
      actions.upgrade([highestFloor(context)], balance.vodkaWhiskersUpgrades),
    emptyGlass: (context) =>
      actions.payCycles([context.floor], balance.emptyGlassPayouts),
    amberSpritz: (context) =>
      actions.payCycles([context.floor], balance.amberSpritzPayouts),
    copperMugMule2: (context) =>
      actions.payCycles([context.floor], balance.copperMugMule2Payouts),
    negroniNightfall2: (context) =>
      actions.payCycles([context.floor], balance.negroniNightfall2Payouts),
    blackberryBramble: (context) =>
      actions.upgrade([context.floor], balance.blackberryBrambleUpgrades),
    blackberryBramble2: (context) =>
      actions.upgrade(alternating(context), balance.blackberryBramble2Upgrades),
    singaporeSling: (context) =>
      actions.payCycles(alternating(context), balance.singaporeSlingPayouts),
    derbyDayJulep: (context) =>
      actions.upgrade([context.floor], balance.derbyDayJulepUpgrades),
    derbyDayJulep2: (context) =>
      actions.payCycles([lowestLevel(context)], balance.derbyDayJulep2Payouts),
    hurricaneHour: (context) =>
      actions.upgrade([context.floor], balance.hurricaneHourUpgrades),
    cosmoCashout: (context) =>
      actions.upgrade([context.floor], balance.cosmoCashoutUpgrades),
    frenchSeventyFive: (context) =>
      actions.upgrade(alternating(context), balance.frenchSeventyFiveUpgrades),
    sidecarSurge: (context) =>
      actions.upgrade([highestFloor(context)], balance.sidecarSurgeUpgrades),
    hurricaneHour2: (context) =>
      actions.payCycles(alternating(context), balance.hurricaneHour2Payouts),
    copperMugMule: (context) =>
      actions.upgrade(context.floors, balance.copperMugMuleUpgrades),
    pineappleParadise: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.pineappleParadiseUpgrades,
      ),
    negroniNightfall: (context) => {
      actions.upgrade([context.floor], balance.negroniNightfallUpgrades);
      actions.upgrade(
        [highestFloor(context)],
        balance.negroniNightfallUpgrades,
      );
    },
    oldFashionedFortune: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.oldFashionedFortunePayouts,
      ),
    tikiZombie: (context) =>
      actions.payCycles(context.floors, balance.tikiZombiePayouts),
    tikiZombie2: (context) => {
      actions.upgrade([context.floor], balance.tikiZombie2Upgrades);
      actions.payCycles([context.floor], balance.tikiZombie2Payouts);
    },
    longIslandLandslide: (context) =>
      actions.payCycles(context.floors, balance.longIslandLandslidePayouts),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
