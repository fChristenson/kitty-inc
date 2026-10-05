import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const FRUITS_CRITS = {
  watermelonWindfall: {
    label: "Watermelon Windfall",
    color: COLOR.fullHouseCrimson,
    image: "crits/fruits/watermelonWindfall.webp",
    description: "Boosts every worker for 68s, counting as 2 extra workers",
  },
  papayaPayroll: {
    label: "Papaya Payroll",
    color: COLOR.talentScoutOrange,
    image: "crits/fruits/papayaPayroll.webp",
    description: "Thirty-four payouts on every unlocked floor",
  },
  kiwiKickback: {
    label: "Kiwi Kickback",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/fruits/kiwiKickback.webp",
    description: "Unlocks the next 3 floors for free",
  },
  topBanana: {
    label: "Top Banana",
    color: COLOR.starYellow,
    image: "crits/fruits/topBanana.webp",
    description: "Boosts every worker for 45s, counting as 1 extra worker",
  },
  cherryOnTop: {
    label: "Cherry on Top",
    color: COLOR.doubleDownCrimson,
    image: "crits/fruits/cherryOnTop.webp",
    description: "Cuts every price in this building by 4.7%",
  },
  peachPerfect: {
    label: "Peach Perfect",
    color: COLOR.grandOpeningRose,
    image: "crits/fruits/peachPerfect.webp",
    description: "One tier promotion and twenty-seven upgrades here",
  },
  plumJob: {
    label: "Plum Job",
    color: COLOR.royalFlushPurple,
    image: "crits/fruits/plumJob.webp",
    description: "Cuts every price in this building by 4.3%",
  },
  dragonfruitDynasty: {
    label: "Dragonfruit Dynasty",
    color: COLOR.easterSalePink,
    image: "crits/fruits/dragonfruitDynasty.webp",
    description: "Cuts every price in this building by 4.3%",
  },
  grapeExpectations: {
    label: "Grape Expectations",
    color: COLOR.halloweenSalePurple,
    image: "crits/fruits/grapeExpectations.webp",
    description: "Thirty-eight free upgrades on alternating floors",
  },
  pomegranatePortfolio: {
    label: "Pomegranate Portfolio",
    color: COLOR.fireDrillRed,
    image: "crits/fruits/pomegranatePortfolio.webp",
    description: "Thirty-two upgrades here and on the lowest-level floor",
  },
} as const satisfies Record<string, FeaturedCritData>;
