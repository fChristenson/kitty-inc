import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const DINER_CRITS = {
  orderUp: {
    label: "Order Up",
    color: COLOR.sameBoatCoral,
    image: "crits/diner/orderUp.webp",
    description: "Adds 41.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.orderUpShare),
  },
  sodaFountain: {
    label: "Soda Fountain",
    color: COLOR.coinGold,
    image: "crits/diner/sodaFountain.webp",
    description: "Adds 41.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sodaFountainShare),
  },
  blackPuddingBreakfast: {
    label: "Black Pudding Breakfast",
    color: COLOR.headhunterRust,
    image: "crits/diner/blackPuddingBreakfast.webp",
    description: "Boosts every worker for 179s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.blackPuddingBreakfastBoostSeconds, balance.blackPuddingBreakfastExtraWorkers),
  },
  blueFizzBurger: {
    label: "Blue Fizz Burger",
    color: COLOR.amber,
    image: "crits/diner/blueFizzBurger.webp",
    description: "Cuts every price in this building by 21.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.blueFizzBurgerDiscount),
  },
  centreStageBurger: {
    label: "Centre Stage Burger",
    color: COLOR.amber,
    image: "crits/diner/centreStageBurger.webp",
    description: "Cuts every price in this building by 21.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.centreStageBurgerDiscount),
  },
  cheeseburgerDuo: {
    label: "Cheeseburger Duo",
    color: COLOR.amber,
    image: "crits/diner/cheeseburgerDuo.webp",
    description: "Cuts every price in this building by 21.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.cheeseburgerDuoDiscount),
  },
  fullFryUp: {
    label: "Full Fry Up",
    color: COLOR.headhunterRust,
    image: "crits/diner/fullFryUp.webp",
    description: "Cuts every price in this building by 22%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.fullFryUpDiscount),
  },
  peasAndBacon: {
    label: "Peas And Bacon",
    color: COLOR.headhunterRust,
    image: "crits/diner/peasAndBacon.webp",
    description: "Cuts every price in this building by 22.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.peasAndBaconDiscount),
  },
  redCartonMeal: {
    label: "Red Carton Meal",
    color: COLOR.amber,
    image: "crits/diner/redCartonMeal.webp",
    description: "Cuts every price in this building by 22.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.redCartonMealDiscount),
  },
  syrupSunrise: {
    label: "Syrup Sunrise",
    color: COLOR.supplyRunTan,
    image: "crits/diner/syrupSunrise.webp",
    description: "Cuts every price in this building by 22.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.syrupSunriseDiscount),
  },
  towerBurger: {
    label: "Tower Burger",
    color: COLOR.amber,
    image: "crits/diner/towerBurger.webp",
    description: "Cuts every price in this building by 22.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.towerBurgerDiscount),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
