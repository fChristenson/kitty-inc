import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const FRUITS_CRIT_INFO = {
  watermelonWindfall: {
    label: "Watermelon Windfall",
    color: COLOR.fullHouseCrimson,
    icon: "watermelonWindfall",
    description: "Thirty-four upgrades on every unlocked floor",
  },
  papayaPayroll: {
    label: "Papaya Payroll",
    color: COLOR.talentScoutOrange,
    icon: "papayaPayroll",
    description: "Thirty-four payouts on every unlocked floor",
  },
  kiwiKickback: {
    label: "Kiwi Kickback",
    color: COLOR.suppliesGiveawayLime,
    icon: "kiwiKickback",
    description: "Forty-seven payouts on the lowest-earning floor",
  },
  topBanana: {
    label: "Top Banana",
    color: COLOR.starYellow,
    icon: "topBanana",
    description: "Forty payouts from the highest-earning floor",
  },
  cherryOnTop: {
    label: "Cherry on Top",
    color: COLOR.doubleDownCrimson,
    icon: "cherryOnTop",
    description: "Forty-one upgrades on the highest unlocked floor",
  },
  peachPerfect: {
    label: "Peach Perfect",
    color: COLOR.grandOpeningRose,
    icon: "peachPerfect",
    description: "One tier promotion and twenty-seven upgrades here",
  },
  plumJob: {
    label: "Plum Job",
    color: COLOR.royalFlushPurple,
    icon: "plumJob",
    description: "Twenty-one upgrades and nineteen payouts on this floor",
  },
  dragonfruitDynasty: {
    label: "Dragonfruit Dynasty",
    color: COLOR.easterSalePink,
    icon: "dragonfruitDynasty",
    description: "Thirty-seven upgrades on this floor and every floor below",
  },
  grapeExpectations: {
    label: "Grape Expectations",
    color: COLOR.halloweenSalePurple,
    icon: "grapeExpectations",
    description: "Thirty-eight free upgrades on alternating floors",
  },
  pomegranatePortfolio: {
    label: "Pomegranate Portfolio",
    color: COLOR.fireDrillRed,
    icon: "pomegranatePortfolio",
    description: "Thirty-two upgrades here and on the lowest-level floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
