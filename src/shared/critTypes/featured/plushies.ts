import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const PLUSHIES_CRITS = {
  plushieDog: {
    label: "Pawsitive Returns",
    color: COLOR.moneyGreen,
    image: "crits/plushies/plushieDog.png",
    description: "Thirty-nine instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.plushieDogPayouts),
  },
  plushieElephant: {
    label: "Big Ears Bonus",
    color: COLOR.silverTicketGray,
    image: "crits/plushies/plushieElephant.png",
    description: "Forty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.plushieElephantUpgrades),
  },
  plushieHamster: {
    label: "Hamster Jackpot",
    color: COLOR.starYellow,
    image: "crits/plushies/plushieHamster.png",
    description: "Thirty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.plushieHamsterPayouts),
  },
  plushieOtter: {
    label: "Otterly Loaded",
    color: COLOR.blue,
    image: "crits/plushies/plushieOtter.png",
    description: "Forty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.plushieOtterPayouts),
  },
  plushiePand: {
    label: "Bamboo Bonanza",
    color: COLOR.moneyGreen,
    image: "crits/plushies/plushiePand.png",
    description: "Thirty-eight instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.plushiePandPayouts),
  },
  plushiePenguin: {
    label: "Cool Customer",
    color: COLOR.cyan,
    image: "crits/plushies/plushiePenguin.png",
    description: "Thirty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.plushiePenguinUpgrades),
  },
  plushieRabbit: {
    label: "Hare Raising",
    color: COLOR.peppermintPink,
    image: "crits/plushies/plushieRabbit.png",
    description: "Thirty-five free upgrades on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.plushieRabbitUpgrades),
  },
  plushieRacoon: {
    label: "Trash to Cash",
    color: COLOR.goldStandardAmber,
    image: "crits/plushies/plushieRacoon.png",
    description: "Forty-two payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.plushieRacoonPayouts,
      ),
  },
  plushieSeal: {
    label: "Seal of Approval",
    color: COLOR.blue,
    image: "crits/plushies/plushieSeal.png",
    description: "Forty free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.plushieSealUpgrades),
  },
  plushieTiger: {
    label: "Tiger's Roar",
    color: COLOR.orange,
    image: "crits/plushies/plushieTiger.png",
    description: "Forty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.plushieTigerUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
