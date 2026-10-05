import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const PIZZA_CRITS = {
  bbqChickenLickin: {
    label: "BBQ Chicken Lickin'",
    color: COLOR.chairGiveawayBrown,
    image: "crits/pizza/bbqChickenLickin.webp",
    description:
      "Repeats the crit on the floor below, 62% chance to keep falling",
  },
  buffaloHullabaloo: {
    label: "Buffalo Hullabaloo",
    color: COLOR.headhunterRust,
    image: "crits/pizza/buffaloHullabaloo.webp",
    description: "Two tier promotions and thirty-four upgrades here",
  },
  calzoneZone: {
    label: "Calzone Zone",
    color: COLOR.gold,
    image: "crits/pizza/calzoneZone.webp",
    description: "Cuts every price in this building by 10.3%",
  },
  fourCheeseBreeze: {
    label: "Four Cheese Breeze",
    color: COLOR.coinGold,
    image: "crits/pizza/fourCheeseBreeze.webp",
    description: "Adds 6.8% of your total income",
  },
  margheritaFiesta: {
    label: "Margherita Fiesta",
    color: COLOR.red,
    image: "crits/pizza/margheritaFiesta.webp",
    description: "Boosts every worker for 57s, counting as 1 extra worker",
  },
  meatFeastBeast: {
    label: "Meat Feast Beast",
    color: COLOR.redActive,
    image: "crits/pizza/meatFeastBeast.webp",
    description:
      "Repeats the crit on the floor above, 63% chance to keep climbing",
  },
  mushroomBloom: {
    label: "Mushroom Bloom",
    color: COLOR.supplyRunTan,
    image: "crits/pizza/mushroomBloom.webp",
    description: "Two tier promotions and thirty-five upgrades here",
  },
  newYorkSliceNice: {
    label: "New York Slice Nice",
    color: COLOR.headhunterRust,
    image: "crits/pizza/newYorkSliceNice.webp",
    description: "Cuts every price in this building by 10.5%",
  },
  pepperoniMacaroni: {
    label: "Pepperoni Macaroni",
    color: COLOR.gold,
    image: "crits/pizza/pepperoniMacaroni.webp",
    description: "Adds 7.1% of your total income",
  },
  pestoPresto: {
    label: "Pesto Presto",
    color: COLOR.luckyCloverGreen,
    image: "crits/pizza/pestoPresto.webp",
    description: "Boosts every worker for 58s, counting as 1 extra worker",
  },
  pineappleDapple: {
    label: "Pineapple Dapple",
    color: COLOR.amber,
    image: "crits/pizza/pineappleDapple.webp",
    description:
      "Repeats the crit on the floor below, 63% chance to keep falling",
  },
  sicilianVermilion: {
    label: "Sicilian Vermilion",
    color: COLOR.amber,
    image: "crits/pizza/sicilianVermilion.webp",
    description: "Two tier promotions and thirty-six upgrades here",
  },
  truffleRuffle: {
    label: "Truffle Ruffle",
    color: COLOR.gold,
    image: "crits/pizza/truffleRuffle.webp",
    description: "Cuts every price in this building by 10.6%",
  },
  veggieWedgie: {
    label: "Veggie Wedgie",
    color: COLOR.headhunterRust,
    image: "crits/pizza/veggieWedgie.webp",
    description: "Adds 7.4% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
