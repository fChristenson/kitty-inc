import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const PLUSHIES_CRIT_INFO = {
  plushieDog: {
    label: "Pawsitive Returns",
    color: COLOR.moneyGreen,
    icon: "plushieDog",
    description: "Thirty-nine instant payouts on every unlocked floor",
  },
  plushieElephant: {
    label: "Big Ears Bonus",
    color: COLOR.silverTicketGray,
    icon: "plushieElephant",
    description: "Forty-four free upgrades on this floor",
  },
  plushieHamster: {
    label: "Hamster Jackpot",
    color: COLOR.starYellow,
    icon: "plushieHamster",
    description: "Thirty-six instant payouts on this floor",
  },
  plushieOtter: {
    label: "Otterly Loaded",
    color: COLOR.blue,
    icon: "plushieOtter",
    description: "Forty instant payouts on this floor",
  },
  plushiePand: {
    label: "Bamboo Bonanza",
    color: COLOR.moneyGreen,
    icon: "plushiePand",
    description: "Thirty-eight instant payouts on every unlocked floor",
  },
  plushiePenguin: {
    label: "Cool Customer",
    color: COLOR.cyan,
    icon: "plushiePenguin",
    description: "Thirty-seven free upgrades on this floor",
  },
  plushieRabbit: {
    label: "Hare Raising",
    color: COLOR.peppermintPink,
    icon: "plushieRabbit",
    description: "Thirty-five free upgrades on every other floor",
  },
  plushieRacoon: {
    label: "Trash to Cash",
    color: COLOR.goldStandardAmber,
    icon: "plushieRacoon",
    description: "Forty-two payouts from the highest-earning floor",
  },
  plushieSeal: {
    label: "Seal of Approval",
    color: COLOR.blue,
    icon: "plushieSeal",
    description: "Forty free upgrades on the lowest-level floor",
  },
  plushieTiger: {
    label: "Tiger's Roar",
    color: COLOR.orange,
    icon: "plushieTiger",
    description: "Forty-seven free upgrades on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
