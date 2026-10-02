import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const PARTY_CRITS = {
  doughDivision: {
    label: "Dough Division",
    color: COLOR.gold,
    image: "crits/party/doughDivision.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
  profitPopcorn: {
    label: "Profit Popcorn",
    color: COLOR.heavenlyGold,
    image: "crits/party/profitPopcorn.webp",
    description: "Adds 3.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.profitPopcornShare),
  },
  donutDisturb: {
    label: "Donut Disturb",
    color: COLOR.peppermintPink,
    image: "crits/party/donutDisturb.webp",
    description: "Five upgrades and five payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.donutDisturbUpgrades);
      actions.payCycles([context.floor], balance.donutDisturbPayouts);
    },
  },
  cakeDay: {
    label: "Cake Day",
    color: COLOR.red,
    image: "crits/party/cakeDay.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  champagneProblems: {
    label: "Champagne Problems",
    color: COLOR.starYellow,
    image: "crits/party/champagneProblems.webp",
    description: "Fifteen payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.champagneProblemsPayouts,
      ),
  },
  bonusBurrito: {
    label: "Bonus Burrito",
    color: COLOR.orange,
    image: "crits/party/bonusBurrito.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  sundaeBest: {
    label: "Sundae Best",
    color: COLOR.blue,
    image: "crits/party/sundaeBest.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  popTheQuestion: {
    label: "Pop the Question",
    color: COLOR.cyan,
    image: "crits/party/popTheQuestion.webp",
    description: "One tier promotion and four upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.popTheQuestionTierSteps,
        balance.popTheQuestionUpgrades,
      ),
  },
  partyCrasher: {
    label: "Party Crasher",
    color: COLOR.red,
    image: "crits/party/partyCrasher.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  bottleRockets: {
    label: "Bottle Rockets",
    color: COLOR.sunshineGold,
    image: "crits/party/bottleRockets.webp",
    description: "Spreads 168 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.bottleRocketsUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
