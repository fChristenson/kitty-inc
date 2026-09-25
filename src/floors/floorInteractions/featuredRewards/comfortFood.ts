import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createComfortFoodRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    breadyOrNot: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.breadyOrNotUpgrades,
      ),
    eggcellentWork: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.eggcellentWorkTierSteps,
        balance.eggcellentWorkUpgrades,
      ),
    holyGuacamole: (context) =>
      actions.payCycles(context.floors, balance.holyGuacamolePayouts),
    loafActually: (context) =>
      actions.upgrade(context.floors, balance.loafActuallyUpgrades),
    pastaLaVista: (context) =>
      actions.payCycles(alternating(context), balance.pastaLaVistaPayouts),
    souperStar: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.souperStarPayouts,
      ),
    tacoBoutIt: (context) => {
      actions.upgrade([context.floor], balance.tacoBoutItUpgrades);
      actions.upgrade([lowestLevel(context)], balance.tacoBoutItUpgrades);
    },
    theGreatPancakeStack: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.theGreatPancakeStackUpgrades,
      ),
    wokAndRoll: (context) =>
      actions.upgrade([highestFloor(context)], balance.wokAndRollUpgrades),
    avocardio: (context) =>
      actions.upgrade([context.floor], balance.avocardioUpgrades),
    butterBelieveIt: (context) =>
      actions.payCycles([context.floor], balance.butterBelieveItPayouts),
    cheesePullChampion: (context) => {
      actions.upgrade([context.floor], balance.cheesePullChampionUpgrades);
      actions.payCycles([context.floor], balance.cheesePullChampionPayouts);
    },
    grillSergeant: (context) =>
      actions.upgrade(context.floors, balance.grillSergeantUpgrades),
    noodleNap: (context) =>
      actions.payCycles(alternating(context), balance.noodleNapPayouts),
    picklePredicament: (context) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.picklePredicamentUpgrades,
      ),
    hotPotato: (context) =>
      actions.payCycles([context.floor], balance.hotPotatoPayouts),
    brunchBoss: (context) => {
      actions.upgrade([context.floor], balance.brunchBossUpgrades);
      actions.payCycles([context.floor], balance.brunchBossPayouts);
    },
    curryFavour: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.curryFavourPayouts,
      ),
    dimSumDynasty: (context) =>
      actions.upgrade(context.floors, balance.dimSumDynastyUpgrades),
    soupDumplingSurgeon: (context) => {
      actions.upgrade([context.floor], balance.soupDumplingSurgeonUpgrades);
      actions.payCycles([context.floor], balance.soupDumplingSurgeonPayouts);
    },
    cheeseWheel: (context) =>
      actions.payCycles([context.floor], balance.cheeseWheelPayouts),
    honeyToast: (context) =>
      actions.upgrade([lowestLevel(context)], balance.honeyToastUpgrades),
    sushiPlatter: (context) =>
      actions.payCycles(alternating(context), balance.sushiPlatterPayouts),
    comfortFood: (context) =>
      actions.upgrade([lowestLevel(context)], balance.comfortFoodUpgrades),
    pickleParade: (context) =>
      actions.upgrade([lowestLevel(context)], balance.pickleParadeUpgrades),
    ramenCrown: (context) =>
      actions.payCycles(context.floors, balance.ramenCrownPayouts),
    thunderNachos: (context) =>
      actions.upgrade(context.floors, balance.thunderNachosUpgrades),
    loadedBurger: (context) =>
      actions.upgrade([context.floor], balance.loadedBurgerUpgrades),
    tacoFeast: (context) =>
      actions.payCycles(context.floors, balance.tacoFeastPayouts),
    pizzaSupreme: (context) =>
      actions.upgrade([context.floor], balance.pizzaSupremeUpgrades),
    sushiPlatter2: (context) =>
      actions.payCycles([context.floor], balance.sushiPlatter2Payouts),
    sushiPlatter3: (context) =>
      actions.upgrade([context.floor], balance.sushiPlatter3Upgrades),
    sushiPlatter4: (context) =>
      actions.payCycles(context.floors, balance.sushiPlatter4Payouts),
    ramenBowl: (context) =>
      actions.upgrade([context.floor], balance.ramenBowlUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
