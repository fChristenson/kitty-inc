import type { PIZZA_CRITS } from "../../critData/pizza";
import type { FeaturedRewards } from "./types";

export const PIZZA_REWARDS = {
  bbqChickenLickin: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "down",
      balance.bbqChickenLickinContinueChance,
    ),
  buffaloHullabaloo: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.buffaloHullabalooTierSteps,
      balance.buffaloHullabalooUpgrades,
    ),
  calzoneZone: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.calzoneZoneDiscount),
  fourCheeseBreeze: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.fourCheeseBreezeShare),
  margheritaFiesta: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.margheritaFiestaBoostSeconds,
      balance.margheritaFiestaExtraWorkers,
    ),
  meatFeastBeast: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.meatFeastBeastContinueChance),
  mushroomBloom: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.mushroomBloomTierSteps,
      balance.mushroomBloomUpgrades,
    ),
  newYorkSliceNice: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.newYorkSliceNiceDiscount),
  pepperoniMacaroni: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pepperoniMacaroniShare),
  pestoPresto: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.pestoPrestoBoostSeconds,
      balance.pestoPrestoExtraWorkers,
    ),
  pineappleDapple: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "down",
      balance.pineappleDappleContinueChance,
    ),
  sicilianVermilion: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.sicilianVermilionTierSteps,
      balance.sicilianVermilionUpgrades,
    ),
  truffleRuffle: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.truffleRuffleDiscount),
  veggieWedgie: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.veggieWedgieShare),
} satisfies FeaturedRewards<typeof PIZZA_CRITS>;
