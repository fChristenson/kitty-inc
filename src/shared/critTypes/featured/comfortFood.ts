import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const COMFORT_FOOD_CRITS = {
  breadyOrNot: {
    label: "Bready or Not",
    color: COLOR.goldenHandshakeGold,
    image: "crits/comfortFood/breadyOrNot.png",
    description: "Eleven upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.breadyOrNotUpgrades,
      ),
  },
  eggcellentWork: {
    label: "Egg-cellent Work",
    color: COLOR.sunshineGold,
    image: "crits/comfortFood/eggcellentWork.png",
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
    image: "crits/comfortFood/holyGuacamole.png",
    description: "Nineteen instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.holyGuacamolePayouts),
  },
  loafActually: {
    label: "Loaf Actually",
    color: COLOR.espressoShotBrown,
    image: "crits/comfortFood/loafActually.png",
    description: "Twelve free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.loafActuallyUpgrades),
  },
  pastaLaVista: {
    label: "Pasta La Vista",
    color: COLOR.orange,
    image: "crits/comfortFood/pastaLaVista.png",
    description: "Sixteen payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.pastaLaVistaPayouts),
  },
  souperStar: {
    label: "Souper Star",
    color: COLOR.amberMuted,
    image: "crits/comfortFood/souperStar.png",
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
    image: "crits/comfortFood/tacoBoutIt.png",
    description: "Four upgrades here and four on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      actions.upgrade([context.floor], balance.tacoBoutItUpgrades);
      actions.upgrade([lowestLevel(context)], balance.tacoBoutItUpgrades);
    },
  },
  theGreatPancakeStack: {
    label: "The Great Pancake Stack",
    color: COLOR.supplyRunTan,
    image: "crits/comfortFood/theGreatPancakeStack.png",
    description: "Twenty-one upgrades here and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.theGreatPancakeStackUpgrades,
      ),
  },
  wokAndRoll: {
    label: "Wok and Roll",
    color: COLOR.summerSaleOrange,
    image: "crits/comfortFood/wokAndRoll.png",
    description: "Twenty-four free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.wokAndRollUpgrades),
  },
  avocardio: {
    label: "Avocardio",
    color: COLOR.bullMarketGreen,
    image: "crits/comfortFood/avocardio.png",
    description: "Fifteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.avocardioUpgrades),
  },
  butterBelieveIt: {
    label: "Butter Believe It",
    color: COLOR.sunshineGold,
    image: "crits/comfortFood/butterBelieveIt.png",
    description: "Eighteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.butterBelieveItPayouts),
  },
  cheesePullChampion: {
    label: "Cheese Pull Champion",
    color: COLOR.goldenHandshakeGold,
    image: "crits/comfortFood/cheesePullChampion.png",
    description: "Six upgrades and six payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.cheesePullChampionUpgrades);
      actions.payCycles([context.floor], balance.cheesePullChampionPayouts);
    },
  },
  grillSergeant: {
    label: "Grill Sergeant",
    color: COLOR.red,
    image: "crits/comfortFood/grillSergeant.png",
    description: "Twenty free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.grillSergeantUpgrades),
  },
  noodleNap: {
    label: "Noodle Nap",
    color: COLOR.autumnSaleAmber,
    image: "crits/comfortFood/noodleNap.png",
    description: "Twenty-two payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.noodleNapPayouts),
  },
  picklePredicament: {
    label: "Pickle Predicament",
    color: COLOR.dressCodeGreen,
    image: "crits/comfortFood/picklePredicament.png",
    description: "Eight free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.picklePredicamentUpgrades,
      ),
  },
  hotPotato: {
    label: "Hot Potato",
    color: COLOR.roundUpOrange,
    image: "crits/comfortFood/hotPotato.png",
    description: "Eighteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.hotPotatoPayouts),
  },
  brunchBoss: {
    label: "Brunch Boss",
    color: COLOR.supplyRunTan,
    image: "crits/comfortFood/brunchBoss.png",
    description: "Seven upgrades and seven payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.brunchBossUpgrades);
      actions.payCycles([context.floor], balance.brunchBossPayouts);
    },
  },
  curryFavour: {
    label: "Curry Favour",
    color: COLOR.halloweenSalePurple,
    image: "crits/comfortFood/curryFavour.png",
    description: "Fourteen payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.curryFavourPayouts,
      ),
  },
  dimSumDynasty: {
    label: "Dim Sum Dynasty",
    color: COLOR.goldenHandshakeGold,
    image: "crits/comfortFood/dimSumDynasty.png",
    description: "Fifteen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.dimSumDynastyUpgrades),
  },
  soupDumplingSurgeon: {
    label: "Soup Dumpling Surgeon",
    color: COLOR.teaBreakBrown,
    image: "crits/comfortFood/soupDumplingSurgeon.png",
    description: "Five upgrades and ten payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.soupDumplingSurgeonUpgrades);
      actions.payCycles([context.floor], balance.soupDumplingSurgeonPayouts);
    },
  },
  cheeseWheel: {
    label: "Cheese Wheel",
    color: COLOR.gold,
    image: "crits/comfortFood/cheeseWheel.png",
    description: "Thirty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.cheeseWheelPayouts),
  },
  honeyToast: {
    label: "Honey Toast",
    color: COLOR.goldenTicketYellow,
    image: "crits/comfortFood/honeyToast.png",
    description: "Twenty-three free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.honeyToastUpgrades),
  },
  sushiPlatter: {
    label: "Sushi Platter",
    color: COLOR.red,
    image: "crits/comfortFood/sushiPlatter.png",
    description: "Twenty-six payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.sushiPlatterPayouts),
  },
  comfortFood: {
    label: "Comfort Food",
    color: COLOR.moneyGreen,
    image: "crits/comfortFood/comfortFood.png",
    description: "Twenty-four free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.comfortFoodUpgrades),
  },
  pickleParade: {
    label: "Pickle Parade",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/comfortFood/pickleParade.png",
    description: "Twenty-five upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.pickleParadeUpgrades),
  },
  ramenCrown: {
    label: "Ramen Crown",
    color: COLOR.goldenHandshakeGold,
    image: "crits/comfortFood/ramenCrown.png",
    description: "Thirty-five payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.ramenCrownPayouts),
  },
  thunderNachos: {
    label: "Thunder Nachos",
    color: COLOR.orange,
    image: "crits/comfortFood/thunderNachos.png",
    description: "Twenty-eight free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.thunderNachosUpgrades),
  },
  loadedBurger: {
    label: "Loaded Burger",
    color: COLOR.orange,
    image: "crits/comfortFood/loadedBurger.png",
    description: "Twenty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.loadedBurgerUpgrades),
  },
  tacoFeast: {
    label: "Taco Feast",
    color: COLOR.red,
    image: "crits/comfortFood/tacoFeast.png",
    description: "Twenty-two instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.tacoFeastPayouts),
  },
  pizzaSupreme: {
    label: "Pizza Supreme",
    color: COLOR.sunshineGold,
    image: "crits/comfortFood/pizzaSupreme.png",
    description: "Twenty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.pizzaSupremeUpgrades),
  },
  sushiPlatter2: {
    label: "Sushi Deluxe",
    color: COLOR.blue,
    image: "crits/comfortFood/sushiPlatter2.png",
    description: "Twenty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.sushiPlatter2Payouts),
  },
  sushiPlatter3: {
    label: "Sushi Surge",
    color: COLOR.luckyCloverGreen,
    image: "crits/comfortFood/sushiPlatter3.png",
    description: "Twenty-three free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.sushiPlatter3Upgrades),
  },
  sushiPlatter4: {
    label: "Sushi Royal",
    color: COLOR.starYellow,
    image: "crits/comfortFood/sushiPlatter4.png",
    description: "Thirty instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.sushiPlatter4Payouts),
  },
  ramenBowl: {
    label: "Ramen Bowl",
    color: COLOR.teaBreakBrown,
    image: "crits/comfortFood/ramenBowl.png",
    description: "Twenty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.ramenBowlUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
