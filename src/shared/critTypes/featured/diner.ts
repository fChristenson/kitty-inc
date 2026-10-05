import type { DINER_CRITS } from "../../critData/diner";
import type { FeaturedRewards } from "./types";

export const DINER_REWARDS = {
  orderUp: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.orderUpShare),
  sodaFountain: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sodaFountainShare),
  blackPuddingBreakfast: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.blackPuddingBreakfastBoostSeconds, balance.blackPuddingBreakfastExtraWorkers),
  blueFizzBurger: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.blueFizzBurgerDiscount),
  centreStageBurger: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.centreStageBurgerDiscount),
  cheeseburgerDuo: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.cheeseburgerDuoDiscount),
  fullFryUp: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.fullFryUpDiscount),
  peasAndBacon: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.peasAndBaconDiscount),
  redCartonMeal: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.redCartonMealDiscount),
  syrupSunrise: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.syrupSunriseDiscount),
  towerBurger: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.towerBurgerDiscount),
} satisfies FeaturedRewards<typeof DINER_CRITS>;
