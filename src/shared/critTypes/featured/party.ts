import type { PARTY_CRITS } from "../../critData/party";
import type { FeaturedRewards } from "./types";

export const PARTY_REWARDS = {
  doughDivision: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  profitPopcorn: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.profitPopcornShare),
  donutDisturb: (context, { actions, balance }) => {
    actions.upgrade([context.floor], balance.donutDisturbUpgrades);
    actions.payCycles([context.floor], balance.donutDisturbPayouts);
  },
  cakeDay: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  champagneProblems: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.champagneProblemsPayouts,
    ),
  bonusBurrito: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  sundaeBest: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  popTheQuestion: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.popTheQuestionTierSteps,
      balance.popTheQuestionUpgrades,
    ),
  partyCrasher: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  bottleRockets: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bottleRocketsUpgrades),
} satisfies FeaturedRewards<typeof PARTY_CRITS>;
