import type { PARTY_TIME_CRITS } from "../critData/partyTime";
import type { FeaturedRewards } from "./types";

export const PARTY_TIME_REWARDS = {
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
  breakEven: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  chaChaChing: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  charlestonCharge: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.charlestonChargeBoostSeconds,
      balance.charlestonChargeExtraWorkers,
    ),
  congaCompounding: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.congaCompoundingBoostSeconds,
      balance.congaCompoundingExtraWorkers,
    ),
  robotResources: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  rumbaReturns: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.rumbaReturnsPayouts),
  salsaSalary: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.salsaSalaryPayouts,
    ),
  shuffleTheFunds: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  tangoTender: (context, { actions, balance, highestFloor }) => {
    actions.upgrade([context.floor], balance.tangoTenderUpgrades);
    actions.upgrade([highestFloor(context)], balance.tangoTenderUpgrades);
  },
  tapThatAsset: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tapThatAssetShare),
  waltzStreet: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.waltzStreetUpgrades),
  prehistoric: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.prehistoricTierSteps,
      balance.prehistoricUpgrades,
    ),
} satisfies FeaturedRewards<typeof PARTY_TIME_CRITS>;
