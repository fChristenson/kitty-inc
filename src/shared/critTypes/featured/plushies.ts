import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const PLUSHIES_CRITS = {
  plushieDog: {
    label: "Pawsitive Returns",
    color: COLOR.moneyGreen,
    image: "crits/plushies/plushieDog.webp",
    description: "Boosts every worker for 48s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.plushieDogBoostSeconds,
        balance.plushieDogExtraWorkers,
      ),
  },
  plushieElephant: {
    label: "Big Ears Bonus",
    color: COLOR.silverTicketGray,
    image: "crits/plushies/plushieElephant.webp",
    description:
      "Repeats the crit on the floor above, 77% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.plushieElephantContinueChance),
  },
  plushieHamster: {
    label: "Hamster Jackpot",
    color: COLOR.starYellow,
    image: "crits/plushies/plushieHamster.webp",
    description: "Adds 11.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.plushieHamsterShare),
  },
  plushieOtter: {
    label: "Otterly Loaded",
    color: COLOR.blue,
    image: "crits/plushies/plushieOtter.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.plushieOtterFloors),
  },
  plushiePand: {
    label: "Bamboo Bonanza",
    color: COLOR.moneyGreen,
    image: "crits/plushies/plushiePand.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.plushiePandFloors),
  },
  plushiePenguin: {
    label: "Cool Customer",
    color: COLOR.cyan,
    image: "crits/plushies/plushiePenguin.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.plushiePenguinFloors),
  },
  plushieRabbit: {
    label: "Hare Raising",
    color: COLOR.peppermintPink,
    image: "crits/plushies/plushieRabbit.webp",
    description: "Thirty-five free upgrades on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.plushieRabbitUpgrades),
  },
  plushieRacoon: {
    label: "Trash to Cash",
    color: COLOR.goldStandardAmber,
    image: "crits/plushies/plushieRacoon.webp",
    description: "Adds 37.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.plushieRacoonShare),
  },
  plushieSeal: {
    label: "Seal of Approval",
    color: COLOR.blue,
    image: "crits/plushies/plushieSeal.webp",
    description: "Forty free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.plushieSealUpgrades),
  },
  plushieTiger: {
    label: "Tiger's Roar",
    color: COLOR.orange,
    image: "crits/plushies/plushieTiger.webp",
    description: "Forty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.plushieTigerUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
