import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const COMFORT_FOOD_CRITS = {
  breadyOrNot: {
    label: "Bready or Not",
    color: COLOR.goldenHandshakeGold,
    image: "crits/comfortFood/breadyOrNot.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.breadyOrNotFloors),
  },
  eggcellentWork: {
    label: "Egg-cellent Work",
    color: COLOR.sunshineGold,
    image: "crits/comfortFood/eggcellentWork.webp",
    description: "One tier promotion and eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.eggcellentWorkTierSteps,
        balance.eggcellentWorkUpgrades,
      ),
  },
  holyGuacamole: {
    label: "Holy Guacamole",
    color: COLOR.dressCodeGreen,
    image: "crits/comfortFood/holyGuacamole.webp",
    description: "Nineteen instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.holyGuacamolePayouts),
  },
  loafActually: {
    label: "Loaf Actually",
    color: COLOR.espressoShotBrown,
    image: "crits/comfortFood/loafActually.webp",
    description:
      "Repeats the crit on the floor above, 11% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.loafActuallyContinueChance),
  },
  pastaLaVista: {
    label: "Pasta La Vista",
    color: COLOR.orange,
    image: "crits/comfortFood/pastaLaVista.webp",
    description: "Sixteen payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.pastaLaVistaPayouts),
  },
  souperStar: {
    label: "Souper Star",
    color: COLOR.amberMuted,
    image: "crits/comfortFood/souperStar.webp",
    description: "Sixteen payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.souperStarPayouts,
      ),
  },
  tacoBoutIt: {
    label: "Taco 'Bout It",
    color: COLOR.autumnSaleAmber,
    image: "crits/comfortFood/tacoBoutIt.webp",
    description: "Four upgrades here and four on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      actions.upgrade([context.floor], balance.tacoBoutItUpgrades);
      actions.upgrade([lowestLevel(context)], balance.tacoBoutItUpgrades);
    },
  },
  theGreatPancakeStack: {
    label: "The Great Pancake Stack",
    color: COLOR.supplyRunTan,
    image: "crits/comfortFood/theGreatPancakeStack.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
  wokAndRoll: {
    label: "Wok and Roll",
    color: COLOR.summerSaleOrange,
    image: "crits/comfortFood/wokAndRoll.webp",
    description: "Boosts this floor's workers for 23s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.wokAndRollBoostSeconds,
        balance.wokAndRollExtraWorkers,
      ),
  },
  avocardio: {
    label: "Avocardio",
    color: COLOR.bullMarketGreen,
    image: "crits/comfortFood/avocardio.webp",
    description: "Boosts this floor's workers for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.avocardioBoostSeconds,
        balance.avocardioExtraWorkers,
      ),
  },
  butterBelieveIt: {
    label: "Butter Believe It",
    color: COLOR.sunshineGold,
    image: "crits/comfortFood/butterBelieveIt.webp",
    description: "Eighteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.butterBelieveItPayouts),
  },
  cheesePullChampion: {
    label: "Cheese Pull Champion",
    color: COLOR.goldenHandshakeGold,
    image: "crits/comfortFood/cheesePullChampion.webp",
    description: "One tier promotion and 12 upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(
        lowestLevel(context),
        balance.cheesePullChampionTierSteps,
        balance.cheesePullChampionUpgrades,
      ),
  },
  grillSergeant: {
    label: "Grill Sergeant",
    color: COLOR.red,
    image: "crits/comfortFood/grillSergeant.webp",
    description: "Boosts this floor's workers for 24s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.grillSergeantBoostSeconds,
        balance.grillSergeantExtraWorkers,
      ),
  },
  noodleNap: {
    label: "Noodle Nap",
    color: COLOR.autumnSaleAmber,
    image: "crits/comfortFood/noodleNap.webp",
    description: "Cuts every price in this building by 1.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.noodleNapDiscount),
  },
  picklePredicament: {
    label: "Pickle Predicament",
    color: COLOR.dressCodeGreen,
    image: "crits/comfortFood/picklePredicament.webp",
    description:
      "Repeats the crit on the floor below, 11% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "down",
        balance.picklePredicamentContinueChance,
      ),
  },
  hotPotato: {
    label: "Hot Potato",
    color: COLOR.roundUpOrange,
    image: "crits/comfortFood/hotPotato.webp",
    description: "Eighteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.hotPotatoPayouts),
  },
  brunchBoss: {
    label: "Brunch Boss",
    color: COLOR.supplyRunTan,
    image: "crits/comfortFood/brunchBoss.webp",
    description:
      "Repeats the crit on the floor above, 13% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.brunchBossContinueChance),
  },
  curryFavour: {
    label: "Curry Favour",
    color: COLOR.halloweenSalePurple,
    image: "crits/comfortFood/curryFavour.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  dimSumDynasty: {
    label: "Dim Sum Dynasty",
    color: COLOR.goldenHandshakeGold,
    image: "crits/comfortFood/dimSumDynasty.webp",
    description: "Fifteen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.dimSumDynastyUpgrades),
  },
  soupDumplingSurgeon: {
    label: "Soup Dumpling Surgeon",
    color: COLOR.teaBreakBrown,
    image: "crits/comfortFood/soupDumplingSurgeon.webp",
    description: "Boosts this floor's workers for 25s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.soupDumplingSurgeonBoostSeconds,
        balance.soupDumplingSurgeonExtraWorkers,
      ),
  },
  cheeseWheel: {
    label: "Cheese Wheel",
    color: COLOR.gold,
    image: "crits/comfortFood/cheeseWheel.webp",
    description: "Thirty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.cheeseWheelPayouts),
  },
  honeyToast: {
    label: "Honey Toast",
    color: COLOR.goldenTicketYellow,
    image: "crits/comfortFood/honeyToast.webp",
    description: "Twenty-three free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.honeyToastUpgrades),
  },
  sushiPlatter: {
    label: "Sushi Platter",
    color: COLOR.red,
    image: "crits/comfortFood/sushiPlatter.webp",
    description:
      "Repeats the crit on the floor below, 28% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.sushiPlatterContinueChance),
  },
  sayCheese: {
    label: "Say Cheese",
    color: COLOR.moneyGreen,
    image: "crits/comfortFood/sayCheese.webp",
    description: "Cuts every price in this building by 2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.sayCheeseDiscount),
  },
  pickleParade: {
    label: "Pickle Parade",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/comfortFood/pickleParade.webp",
    description: "One tier promotion and eleven upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(lowestLevel(context), balance.pickleParadeTierSteps, balance.pickleParadeUpgrades),
  },
  ramenCrown: {
    label: "Ramen Crown",
    color: COLOR.goldenHandshakeGold,
    image: "crits/comfortFood/ramenCrown.webp",
    description: "One tier promotion and 15 upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.ramenCrownTierSteps,
        balance.ramenCrownUpgrades,
      ),
  },
  thunderNachos: {
    label: "Thunder Nachos",
    color: COLOR.orange,
    image: "crits/comfortFood/thunderNachos.webp",
    description: "Boosts every worker for 18s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.thunderNachosBoostSeconds,
        balance.thunderNachosExtraWorkers,
      ),
  },
  loadedBurger: {
    label: "Loaded Burger",
    color: COLOR.orange,
    image: "crits/comfortFood/loadedBurger.webp",
    description: "Twenty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.loadedBurgerUpgrades),
  },
  tacoFeast: {
    label: "Taco Feast",
    color: COLOR.red,
    image: "crits/comfortFood/tacoFeast.webp",
    description:
      "Repeats the crit on the floor above, 29% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.tacoFeastContinueChance),
  },
  pizzaSupreme: {
    label: "Pizza Supreme",
    color: COLOR.sunshineGold,
    image: "crits/comfortFood/pizzaSupreme.webp",
    description: "One tier promotion and 15 upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(
        lowestLevel(context),
        balance.pizzaSupremeTierSteps,
        balance.pizzaSupremeUpgrades,
      ),
  },
  sushiPlatter2: {
    label: "Sushi Deluxe",
    color: COLOR.blue,
    image: "crits/comfortFood/sushiPlatter2.webp",
    description: "Twenty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.sushiPlatter2Payouts),
  },
  sushiPlatter3: {
    label: "Sushi Surge",
    color: COLOR.luckyCloverGreen,
    image: "crits/comfortFood/sushiPlatter3.webp",
    description: "Boosts every worker for 16s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.sushiPlatter3BoostSeconds,
        balance.sushiPlatter3ExtraWorkers,
      ),
  },
  sushiPlatter4: {
    label: "Sushi Royal",
    color: COLOR.starYellow,
    image: "crits/comfortFood/sushiPlatter4.webp",
    description: "One tier promotion and 13 upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.sushiPlatter4TierSteps,
        balance.sushiPlatter4Upgrades,
      ),
  },
  ramenBowl: {
    label: "Ramen Bowl",
    color: COLOR.teaBreakBrown,
    image: "crits/comfortFood/ramenBowl.webp",
    description: "Twenty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.ramenBowlUpgrades),
  },
  extraToppings: {
    label: "Extra Toppings",
    color: COLOR.headhunterRust,
    image: "crits/comfortFood/extraToppings.webp",
    description: "Cuts every price in this building by 6.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.extraToppingsDiscount),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
