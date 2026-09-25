import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const HEROES_CRIT_INFO = {
  blessed: {
    label: "Blessed",
    color: COLOR.heavenlyGold,
    icon: "blessed",
    description: "One tier promotion and three upgrades here",
  },
  centurion: {
    label: "Centurion",
    color: COLOR.red,
    icon: "centurion",
    description: "One hundred free upgrades on this floor",
  },
  checkUp: {
    label: "Check Up",
    color: COLOR.cyan,
    icon: "checkUp",
    description: "Four upgrades and two payouts on the lowest-level floor",
  },
  fireman: {
    label: "First Responder",
    color: COLOR.orange,
    icon: "fireman",
    description: "Three upgrades, then one payout on every floor",
  },
  forTheEmperor: {
    label: "For the Emperor",
    color: COLOR.blue,
    icon: "forTheEmperor",
    description: "Twenty-five upgrades on every unlocked floor",
  },
  forTheKing: {
    label: "For the King",
    color: COLOR.starYellow,
    icon: "forTheKing",
    description: "Fifteen upgrades on every unlocked floor",
  },
  hammerTime: {
    label: "Hammer Time",
    color: COLOR.red,
    icon: "hammerTime",
    description: "Nine free upgrades on this floor",
  },
  robinHood: {
    label: "Honor among thieves",
    color: COLOR.moneyGreen,
    icon: "robinHood",
    description: "Seven top-earner payouts; three lowest-level upgrades",
  },
  roman: {
    label: "Roman Holiday",
    color: COLOR.fullHouseCrimson,
    icon: "roman",
    description: "Nine upgrades on every unlocked floor",
  },
  samurai: {
    label: "Samurai",
    color: COLOR.fullHouseCrimson,
    icon: "samurai",
    description: "Thirty free upgrades on this floor",
  },
  spy: {
    label: "Undercover",
    color: COLOR.nightShiftIndigo,
    icon: "spy",
    description: "Seventeen upgrades on the lowest-earning floor",
  },
  theLawWon: {
    label: "The Law Won",
    color: COLOR.blue,
    icon: "theLawWon",
    description: "Six upgrades and two payouts on the cheapest floor",
  },
  victorian: {
    label: "High Society",
    color: COLOR.gold,
    icon: "victorian",
    description: "Nine payouts on alternating floors, from the ground",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
