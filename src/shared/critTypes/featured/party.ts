import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const PARTY_CRITS = {
  doughDivision: {
    label: "Dough Division",
    color: COLOR.gold,
    image: "crits/party/doughDivision.png",
    description: "Six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.doughDivisionUpgrades),
  },
  profitPopcorn: {
    label: "Profit Popcorn",
    color: COLOR.heavenlyGold,
    image: "crits/party/profitPopcorn.png",
    description: "Four instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.profitPopcornPayouts),
  },
  donutDisturb: {
    label: "Donut Disturb",
    color: COLOR.peppermintPink,
    image: "crits/party/donutDisturb.png",
    description: "Five upgrades and five payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.donutDisturbUpgrades);
      actions.payCycles([context.floor], balance.donutDisturbPayouts);
    },
  },
  cakeDay: {
    label: "Cake Day",
    color: COLOR.red,
    image: "crits/party/cakeDay.png",
    description: "Twelve upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.cakeDayUpgrades),
  },
  champagneProblems: {
    label: "Champagne Problems",
    color: COLOR.starYellow,
    image: "crits/party/champagneProblems.png",
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
    image: "crits/party/bonusBurrito.png",
    description: "Eight upgrades and three payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.bonusBurritoUpgrades);
      actions.payCycles([context.floor], balance.bonusBurritoPayouts);
    },
  },
  sundaeBest: {
    label: "Sundae Best",
    color: COLOR.blue,
    image: "crits/party/sundaeBest.png",
    description: "Ten payouts on alternating floors, from the ground",
    reward: (context, { actions, balance }) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.sundaeBestPayouts,
      ),
  },
  popTheQuestion: {
    label: "Pop the Question",
    color: COLOR.cyan,
    image: "crits/party/popTheQuestion.png",
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
    image: "crits/party/partyCrasher.png",
    description: "Three upgrades here and three on the highest floor",
    reward: (context, { actions, balance, highestFloor }) => {
      actions.upgrade([context.floor], balance.partyCrasherUpgrades);
      actions.upgrade([highestFloor(context)], balance.partyCrasherUpgrades);
    },
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
