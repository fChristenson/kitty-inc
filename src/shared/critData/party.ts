import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const PARTY_CRITS = {
  doughDivision: {
    label: "Dough Division",
    color: COLOR.gold,
    image: "crits/party/doughDivision.webp",
    description: "Free office supplies for this floor",
  },
  profitPopcorn: {
    label: "Profit Popcorn",
    color: COLOR.heavenlyGold,
    image: "crits/party/profitPopcorn.webp",
    description: "Adds 3.1% of your total income",
  },
  donutDisturb: {
    label: "Donut Disturb",
    color: COLOR.peppermintPink,
    image: "crits/party/donutDisturb.webp",
    description: "Five upgrades and five payouts on this floor",
  },
  cakeDay: {
    label: "Cake Day",
    color: COLOR.red,
    image: "crits/party/cakeDay.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  champagneProblems: {
    label: "Champagne Problems",
    color: COLOR.starYellow,
    image: "crits/party/champagneProblems.webp",
    description: "Fifteen payouts from the highest-earning floor",
  },
  bonusBurrito: {
    label: "Bonus Burrito",
    color: COLOR.orange,
    image: "crits/party/bonusBurrito.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  sundaeBest: {
    label: "Sundae Best",
    color: COLOR.blue,
    image: "crits/party/sundaeBest.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  popTheQuestion: {
    label: "Pop the Question",
    color: COLOR.cyan,
    image: "crits/party/popTheQuestion.webp",
    description: "One tier promotion and four upgrades here",
  },
  partyCrasher: {
    label: "Party Crasher",
    color: COLOR.red,
    image: "crits/party/partyCrasher.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  bottleRockets: {
    label: "Bottle Rockets",
    color: COLOR.sunshineGold,
    image: "crits/party/bottleRockets.webp",
    description: "Spreads 168 free upgrades over the lowest-level floors",
  },
} as const satisfies Record<string, FeaturedCritData>;
