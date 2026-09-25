import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const CHOCOLATE_CRIT_INFO = {
  cocoaClout: {
    label: "Cocoa Clout",
    color: COLOR.espressoShotBrown,
    icon: "cocoaClout",
    description: "Twenty-two upgrades and twenty payouts on this floor",
  },
  shadesOfCocoa: {
    label: "Shades of Cocoa",
    color: COLOR.fastForwardBlue,
    icon: "shadesOfCocoa",
    description: "Forty-three payouts from the highest-earning floor",
  },
  bigMugEnergy: {
    label: "Big Mug Energy",
    color: COLOR.blue,
    icon: "bigMugEnergy",
    description: "Thirty-six upgrades on every unlocked floor",
  },
  bonbonBigwig: {
    label: "Bonbon Bigwig",
    color: COLOR.goldStandardAmber,
    icon: "bonbonBigwig",
    description: "One tier promotion and thirty-one upgrades here",
  },
  ganacheGains: {
    label: "Ganache Gains",
    color: COLOR.chairGiveawayBrown,
    icon: "ganacheGains",
    description: "Thirty-nine upgrades on this floor and every floor below",
  },
  hazelnutHedgeFund: {
    label: "Hazelnut Hedge Fund",
    color: COLOR.autumnSaleAmber,
    icon: "hazelnutHedgeFund",
    description: "Thirty-four upgrades here and on the lowest-level floor",
  },
  spreadTheWealth: {
    label: "Spread the Wealth",
    color: COLOR.goldenHandshakeGold,
    icon: "spreadTheWealth",
    description: "Forty-five payouts on every unlocked floor",
  },
  chocolateBarExam: {
    label: "Chocolate Bar Exam",
    color: COLOR.amberMuted,
    icon: "chocolateBarExam",
    description: "Forty-two free upgrades on alternating floors",
  },
  darkChocolateDeal: {
    label: "Dark Chocolate Deal",
    color: COLOR.nightShiftIndigo,
    icon: "darkChocolateDeal",
    description: "Forty-four upgrades on the cheapest floor to upgrade",
  },
  mousseMoxie: {
    label: "Mousse Moxie",
    color: COLOR.teaBreakBrown,
    icon: "mousseMoxie",
    description: "Forty-seven upgrades on the lowest-level floor",
  },
  rockyRoadRally: {
    label: "Rocky Road Rally",
    color: COLOR.fireDrillRed,
    icon: "rockyRoadRally",
    description: "Forty-six upgrades rolling down the floors below",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
