import type { DANCE_CRITS } from "../../critData/dance";
import type { FeaturedRewards } from "./types";

export const DANCE_REWARDS = {
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
} satisfies FeaturedRewards<typeof DANCE_CRITS>;
