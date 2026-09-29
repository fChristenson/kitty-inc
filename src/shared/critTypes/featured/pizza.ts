import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const PIZZA_CRITS = {
  bbqChickenLickin: {
    label: "BBQ Chicken Lickin'",
    color: COLOR.chairGiveawayBrown,
    image: "crits/pizza/bbqChickenLickin.webp",
    description:
      "Repeats the crit on the floor below, 62% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "down",
        balance.bbqChickenLickinContinueChance,
      ),
  },
  buffaloHullabaloo: {
    label: "Buffalo Hullabaloo",
    color: COLOR.headhunterRust,
    image: "crits/pizza/buffaloHullabaloo.webp",
    description: "Two tier promotions and thirty-four upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.buffaloHullabalooTierSteps,
        balance.buffaloHullabalooUpgrades,
      ),
  },
  calzoneZone: {
    label: "Calzone Zone",
    color: COLOR.gold,
    image: "crits/pizza/calzoneZone.webp",
    description: "Cuts every price in this building by 10.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.calzoneZoneDiscount),
  },
  fourCheeseBreeze: {
    label: "Four Cheese Breeze",
    color: COLOR.coinGold,
    image: "crits/pizza/fourCheeseBreeze.webp",
    description: "Adds 6.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.fourCheeseBreezeShare),
  },
  margheritaFiesta: {
    label: "Margherita Fiesta",
    color: COLOR.red,
    image: "crits/pizza/margheritaFiesta.webp",
    description: "Boosts every worker for 57s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.margheritaFiestaBoostSeconds,
        balance.margheritaFiestaExtraWorkers,
      ),
  },
  meatFeastBeast: {
    label: "Meat Feast Beast",
    color: COLOR.redActive,
    image: "crits/pizza/meatFeastBeast.webp",
    description:
      "Repeats the crit on the floor above, 63% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.meatFeastBeastContinueChance),
  },
  mushroomBloom: {
    label: "Mushroom Bloom",
    color: COLOR.supplyRunTan,
    image: "crits/pizza/mushroomBloom.webp",
    description: "Two tier promotions and thirty-five upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.mushroomBloomTierSteps,
        balance.mushroomBloomUpgrades,
      ),
  },
  newYorkSliceNice: {
    label: "New York Slice Nice",
    color: COLOR.headhunterRust,
    image: "crits/pizza/newYorkSliceNice.webp",
    description: "Cuts every price in this building by 10.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.newYorkSliceNiceDiscount),
  },
  pepperoniMacaroni: {
    label: "Pepperoni Macaroni",
    color: COLOR.gold,
    image: "crits/pizza/pepperoniMacaroni.webp",
    description: "Adds 7.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pepperoniMacaroniShare),
  },
  pestoPresto: {
    label: "Pesto Presto",
    color: COLOR.luckyCloverGreen,
    image: "crits/pizza/pestoPresto.webp",
    description: "Boosts every worker for 58s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.pestoPrestoBoostSeconds,
        balance.pestoPrestoExtraWorkers,
      ),
  },
  pineappleDapple: {
    label: "Pineapple Dapple",
    color: COLOR.amber,
    image: "crits/pizza/pineappleDapple.webp",
    description:
      "Repeats the crit on the floor below, 63% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "down",
        balance.pineappleDappleContinueChance,
      ),
  },
  sicilianVermilion: {
    label: "Sicilian Vermilion",
    color: COLOR.amber,
    image: "crits/pizza/sicilianVermilion.webp",
    description: "Two tier promotions and thirty-six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.sicilianVermilionTierSteps,
        balance.sicilianVermilionUpgrades,
      ),
  },
  truffleRuffle: {
    label: "Truffle Ruffle",
    color: COLOR.gold,
    image: "crits/pizza/truffleRuffle.webp",
    description: "Cuts every price in this building by 10.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.truffleRuffleDiscount),
  },
  veggieWedgie: {
    label: "Veggie Wedgie",
    color: COLOR.headhunterRust,
    image: "crits/pizza/veggieWedgie.webp",
    description: "Adds 7.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.veggieWedgieShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
