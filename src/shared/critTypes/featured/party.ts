import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const PARTY_CRIT_INFO = {
  doughDivision: {
    label: "Dough Division",
    color: COLOR.gold,
    icon: "doughDivision",
    description: "Six free upgrades on this floor",
  },
  profitPopcorn: {
    label: "Profit Popcorn",
    color: COLOR.heavenlyGold,
    icon: "profitPopcorn",
    description: "Four instant payouts on every unlocked floor",
  },
  donutDisturb: {
    label: "Donut Disturb",
    color: COLOR.peppermintPink,
    icon: "donutDisturb",
    description: "Five upgrades and five payouts on this floor",
  },
  cakeDay: {
    label: "Cake Day",
    color: COLOR.red,
    icon: "cakeDay",
    description: "Twelve upgrades on the lowest-level floor",
  },
  champagneProblems: {
    label: "Champagne Problems",
    color: COLOR.starYellow,
    icon: "champagneProblems",
    description: "Fifteen payouts from the highest-earning floor",
  },
  bonusBurrito: {
    label: "Bonus Burrito",
    color: COLOR.orange,
    icon: "bonusBurrito",
    description: "Eight upgrades and three payouts on this floor",
  },
  sundaeBest: {
    label: "Sundae Best",
    color: COLOR.blue,
    icon: "sundaeBest",
    description: "Ten payouts on alternating floors, from the ground",
  },
  popTheQuestion: {
    label: "Pop the Question",
    color: COLOR.cyan,
    icon: "popTheQuestion",
    description: "One tier promotion and four upgrades here",
  },
  partyCrasher: {
    label: "Party Crasher",
    color: COLOR.red,
    icon: "partyCrasher",
    description: "Three upgrades here and three on the highest floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
