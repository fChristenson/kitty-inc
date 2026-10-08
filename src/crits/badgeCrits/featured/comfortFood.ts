import type { COMFORT_FOOD_CRITS } from "../critData/comfortFood";
import type { FeaturedRewards } from "./types";

export const COMFORT_FOOD_REWARDS = {
  breadyOrNot: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.breadyOrNotFloors),
  eggcellentWork: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.eggcellentWorkTierSteps,
      balance.eggcellentWorkUpgrades,
    ),
  holyGuacamole: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.holyGuacamolePayouts),
  loafActually: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.loafActuallyContinueChance),
  pastaLaVista: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.pastaLaVistaPayouts),
  souperStar: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.souperStarPayouts,
    ),
  tacoBoutIt: (context, { actions, balance, lowestLevel }) => {
    actions.upgrade([context.floor], balance.tacoBoutItUpgrades);
    actions.upgrade([lowestLevel(context)], balance.tacoBoutItUpgrades);
  },
  theGreatPancakeStack: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  wokAndRoll: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.wokAndRollBoostSeconds,
      balance.wokAndRollExtraWorkers,
    ),
  avocardio: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.avocardioBoostSeconds,
      balance.avocardioExtraWorkers,
    ),
  butterBelieveIt: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.butterBelieveItPayouts),
  cheesePullChampion: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.cheesePullChampionTierSteps,
      balance.cheesePullChampionUpgrades,
    ),
  grillSergeant: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.grillSergeantBoostSeconds,
      balance.grillSergeantExtraWorkers,
    ),
  noodleNap: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.noodleNapDiscount),
  picklePredicament: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "down",
      balance.picklePredicamentContinueChance,
    ),
  hotPotato: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.hotPotatoPayouts),
  brunchBoss: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.brunchBossContinueChance),
  curryFavour: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  dimSumDynasty: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.dimSumDynastyUpgrades),
  soupDumplingSurgeon: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.soupDumplingSurgeonBoostSeconds,
      balance.soupDumplingSurgeonExtraWorkers,
    ),
  cheeseWheel: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.cheeseWheelPayouts),
  honeyToast: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.honeyToastUpgrades),
  sushiPlatter: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.sushiPlatterContinueChance),
  sayCheese: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.sayCheeseDiscount),
  pickleParade: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(lowestLevel(context), balance.pickleParadeTierSteps, balance.pickleParadeUpgrades),
  ramenCrown: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.ramenCrownTierSteps,
      balance.ramenCrownUpgrades,
    ),
  thunderNachos: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.thunderNachosBoostSeconds,
      balance.thunderNachosExtraWorkers,
    ),
  loadedBurger: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.loadedBurgerUpgrades),
  tacoFeast: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.tacoFeastContinueChance),
  pizzaSupreme: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.pizzaSupremeTierSteps,
      balance.pizzaSupremeUpgrades,
    ),
  sushiPlatter2: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.sushiPlatter2Payouts),
  sushiPlatter3: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.sushiPlatter3BoostSeconds,
      balance.sushiPlatter3ExtraWorkers,
    ),
  sushiPlatter4: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.sushiPlatter4TierSteps,
      balance.sushiPlatter4Upgrades,
    ),
  ramenBowl: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.ramenBowlUpgrades),
  extraToppings: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.extraToppingsDiscount),
} satisfies FeaturedRewards<typeof COMFORT_FOOD_CRITS>;
