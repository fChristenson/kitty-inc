import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const FAST_FOOD_CRITS = {
  bbqChickenLickin: {
    label: "BBQ Chicken Lickin'",
    color: COLOR.chairGiveawayBrown,
    image: "crits/fastFood/bbqChickenLickin.webp",
    description:
      "Repeats the crit on the floor below, 62% chance to keep falling",
  },
  buffaloHullabaloo: {
    label: "Buffalo Hullabaloo",
    color: COLOR.headhunterRust,
    image: "crits/fastFood/buffaloHullabaloo.webp",
    description: "Two tier promotions and thirty-four upgrades here",
  },
  calzoneZone: {
    label: "Calzone Zone",
    color: COLOR.gold,
    image: "crits/fastFood/calzoneZone.webp",
    description: "Cuts every price in this building by 10.3%",
  },
  fourCheeseBreeze: {
    label: "Four Cheese Breeze",
    color: COLOR.coinGold,
    image: "crits/fastFood/fourCheeseBreeze.webp",
    description: "Adds 6.8% of your total income",
  },
  margheritaFiesta: {
    label: "Margherita Fiesta",
    color: COLOR.red,
    image: "crits/fastFood/margheritaFiesta.webp",
    description: "Boosts every worker for 57s, counting as 1 extra worker",
  },
  meatFeastBeast: {
    label: "Meat Feast Beast",
    color: COLOR.redActive,
    image: "crits/fastFood/meatFeastBeast.webp",
    description:
      "Repeats the crit on the floor above, 63% chance to keep climbing",
  },
  mushroomBloom: {
    label: "Mushroom Bloom",
    color: COLOR.supplyRunTan,
    image: "crits/fastFood/mushroomBloom.webp",
    description: "Two tier promotions and thirty-five upgrades here",
  },
  newYorkSliceNice: {
    label: "New York Slice Nice",
    color: COLOR.headhunterRust,
    image: "crits/fastFood/newYorkSliceNice.webp",
    description: "Cuts every price in this building by 10.5%",
  },
  pepperoniMacaroni: {
    label: "Pepperoni Macaroni",
    color: COLOR.gold,
    image: "crits/fastFood/pepperoniMacaroni.webp",
    description: "Adds 7.1% of your total income",
  },
  pestoPresto: {
    label: "Pesto Presto",
    color: COLOR.luckyCloverGreen,
    image: "crits/fastFood/pestoPresto.webp",
    description: "Boosts every worker for 58s, counting as 1 extra worker",
  },
  pineappleDapple: {
    label: "Pineapple Dapple",
    color: COLOR.amber,
    image: "crits/fastFood/pineappleDapple.webp",
    description:
      "Repeats the crit on the floor below, 63% chance to keep falling",
  },
  sicilianVermilion: {
    label: "Sicilian Vermilion",
    color: COLOR.amber,
    image: "crits/fastFood/sicilianVermilion.webp",
    description: "Two tier promotions and thirty-six upgrades here",
  },
  truffleRuffle: {
    label: "Truffle Ruffle",
    color: COLOR.gold,
    image: "crits/fastFood/truffleRuffle.webp",
    description: "Cuts every price in this building by 10.6%",
  },
  veggieWedgie: {
    label: "Veggie Wedgie",
    color: COLOR.headhunterRust,
    image: "crits/fastFood/veggieWedgie.webp",
    description: "Adds 7.4% of your total income",
  },
  orderUp: {
    label: "Order Up",
    color: COLOR.sameBoatCoral,
    image: "crits/fastFood/orderUp.webp",
    description: "Adds 41.1% of your total income",
  },
  sodaFountain: {
    label: "Soda Fountain",
    color: COLOR.coinGold,
    image: "crits/fastFood/sodaFountain.webp",
    description: "Adds 41.3% of your total income",
  },
  blackPuddingBreakfast: {
    label: "Black Pudding Breakfast",
    color: COLOR.headhunterRust,
    image: "crits/fastFood/blackPuddingBreakfast.webp",
    description: "Boosts every worker for 179s, counting as 3 extra workers",
  },
  blueFizzBurger: {
    label: "Blue Fizz Burger",
    color: COLOR.amber,
    image: "crits/fastFood/blueFizzBurger.webp",
    description: "Cuts every price in this building by 21.7%",
  },
  centreStageBurger: {
    label: "Centre Stage Burger",
    color: COLOR.amber,
    image: "crits/fastFood/centreStageBurger.webp",
    description: "Cuts every price in this building by 21.8%",
  },
  cheeseburgerDuo: {
    label: "Cheeseburger Duo",
    color: COLOR.amber,
    image: "crits/fastFood/cheeseburgerDuo.webp",
    description: "Cuts every price in this building by 21.9%",
  },
  fullFryUp: {
    label: "Full Fry Up",
    color: COLOR.headhunterRust,
    image: "crits/fastFood/fullFryUp.webp",
    description: "Cuts every price in this building by 22%",
  },
  peasAndBacon: {
    label: "Peas And Bacon",
    color: COLOR.headhunterRust,
    image: "crits/fastFood/peasAndBacon.webp",
    description: "Cuts every price in this building by 22.1%",
  },
  redCartonMeal: {
    label: "Red Carton Meal",
    color: COLOR.amber,
    image: "crits/fastFood/redCartonMeal.webp",
    description: "Cuts every price in this building by 22.2%",
  },
  syrupSunrise: {
    label: "Syrup Sunrise",
    color: COLOR.supplyRunTan,
    image: "crits/fastFood/syrupSunrise.webp",
    description: "Cuts every price in this building by 22.3%",
  },
  towerBurger: {
    label: "Tower Burger",
    color: COLOR.amber,
    image: "crits/fastFood/towerBurger.webp",
    description: "Cuts every price in this building by 22.4%",
  },
} as const satisfies Record<string, FeaturedCritData>;
