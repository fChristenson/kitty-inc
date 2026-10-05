import type { PLUSHIES_CRITS } from "../../critData/plushies";
import type { FeaturedRewards } from "./types";

export const PLUSHIES_REWARDS = {
  plushieDog: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.plushieDogBoostSeconds,
      balance.plushieDogExtraWorkers,
    ),
  plushieElephant: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.plushieElephantContinueChance),
  plushieHamster: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.plushieHamsterShare),
  plushieOtter: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.plushieOtterFloors),
  plushiePand: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.plushiePandFloors),
  plushiePenguin: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.plushiePenguinFloors),
  plushieRabbit: (context, { actions, balance, alternating }) =>
    actions.upgrade(alternating(context), balance.plushieRabbitUpgrades),
  plushieRacoon: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.plushieRacoonShare),
  plushieSeal: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.plushieSealUpgrades),
  plushieTiger: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.plushieTigerUpgrades),
} satisfies FeaturedRewards<typeof PLUSHIES_CRITS>;
