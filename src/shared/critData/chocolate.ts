import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const CHOCOLATE_CRITS = {
  cocoaClout: {
    label: "Cocoa Clout",
    color: COLOR.espressoShotBrown,
    image: "crits/chocolate/cocoaClout.webp",
    description: "Twenty-two upgrades and twenty payouts on this floor",
  },
  shadesOfCocoa: {
    label: "Shades of Cocoa",
    color: COLOR.fastForwardBlue,
    image: "crits/chocolate/shadesOfCocoa.webp",
    description: "Forty-three payouts from the highest-earning floor",
  },
  bigMugEnergy: {
    label: "Big Mug Energy",
    color: COLOR.blue,
    image: "crits/chocolate/bigMugEnergy.webp",
    description: "Boosts every worker for 120s, counting as 3 extra workers",
  },
  bonbonBigwig: {
    label: "Bonbon Bigwig",
    color: COLOR.goldStandardAmber,
    image: "crits/chocolate/bonbonBigwig.webp",
    description: "One tier promotion and thirty-one upgrades here",
  },
  ganacheGains: {
    label: "Ganache Gains",
    color: COLOR.chairGiveawayBrown,
    image: "crits/chocolate/ganacheGains.webp",
    description: "Thirty-nine upgrades on this floor and every floor below",
  },
  hazelnutHedgeFund: {
    label: "Hazelnut Hedge Fund",
    color: COLOR.autumnSaleAmber,
    image: "crits/chocolate/hazelnutHedgeFund.webp",
    description: "Thirty-four upgrades here and on the lowest-level floor",
  },
  spreadTheWealth: {
    label: "Spread the Wealth",
    color: COLOR.goldenHandshakeGold,
    image: "crits/chocolate/spreadTheWealth.webp",
    description: "Adds 98s of your company's income",
  },
  chocolateBarExam: {
    label: "Chocolate Bar Exam",
    color: COLOR.amberMuted,
    image: "crits/chocolate/chocolateBarExam.webp",
    description:
      "Repeats the crit above and below, 44% chance to keep spreading",
  },
  darkChocolateDeal: {
    label: "Dark Chocolate Deal",
    color: COLOR.nightShiftIndigo,
    image: "crits/chocolate/darkChocolateDeal.webp",
    description: "Cuts every price in this building by 10.7%",
  },
  mousseMoxie: {
    label: "Mousse Moxie",
    color: COLOR.teaBreakBrown,
    image: "crits/chocolate/mousseMoxie.webp",
    description: "Raises alternating floors to the building's top level",
  },
  rockyRoadRally: {
    label: "Rocky Road Rally",
    color: COLOR.fireDrillRed,
    image: "crits/chocolate/rockyRoadRally.webp",
    description: "Forty-six upgrades rolling down the floors below",
  },
} as const satisfies Record<string, FeaturedCritData>;
