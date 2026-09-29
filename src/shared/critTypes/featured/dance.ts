import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const DANCE_CRITS = {
  breakEven: {
    label: "Break Even",
    color: COLOR.performanceBonusBlue,
    image: "crits/dance/breakEven.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  chaChaChing: {
    label: "Cha-Cha-Ching",
    color: COLOR.amberMuted,
    image: "crits/dance/chaChaChing.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  charlestonCharge: {
    label: "Charleston Charge",
    color: COLOR.teaBreakBrown,
    image: "crits/dance/charlestonCharge.webp",
    description: "Boosts this floor's workers for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.charlestonChargeBoostSeconds,
        balance.charlestonChargeExtraWorkers,
      ),
  },
  congaCompounding: {
    label: "Conga Compounding",
    color: COLOR.springSalePink,
    image: "crits/dance/congaCompounding.webp",
    description: "Boosts this floor's workers for 22s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.congaCompoundingBoostSeconds,
        balance.congaCompoundingExtraWorkers,
      ),
  },
  robotResources: {
    label: "Robot Resources",
    color: COLOR.headhunterRust,
    image: "crits/dance/robotResources.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  rumbaReturns: {
    label: "Rumba Returns",
    color: COLOR.redActive,
    image: "crits/dance/rumbaReturns.webp",
    description: "Twenty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.rumbaReturnsPayouts),
  },
  salsaSalary: {
    label: "Salsa Salary",
    color: COLOR.peppermintPink,
    image: "crits/dance/salsaSalary.webp",
    description: "Thirteen payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.salsaSalaryPayouts,
      ),
  },
  shuffleTheFunds: {
    label: "Shuffle the Funds",
    color: COLOR.springCleaningMint,
    image: "crits/dance/shuffleTheFunds.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  tangoTender: {
    label: "Tango Tender",
    color: COLOR.fullHouseCrimson,
    image: "crits/dance/tangoTender.webp",
    description: "Seven upgrades here and seven on the highest floor",
    reward: (context, { actions, balance, highestFloor }) => {
      actions.upgrade([context.floor], balance.tangoTenderUpgrades);
      actions.upgrade([highestFloor(context)], balance.tangoTenderUpgrades);
    },
  },
  tapThatAsset: {
    label: "Tap That Asset",
    color: COLOR.bonusRoundGold,
    image: "crits/dance/tapThatAsset.webp",
    description: "Adds 3.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.tapThatAssetShare),
  },
  waltzStreet: {
    label: "Waltz Street",
    color: COLOR.shareholdersGreen,
    image: "crits/dance/waltzStreet.webp",
    description: "Seventeen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.waltzStreetUpgrades),
  },
  prehistoric: {
    label: "Prehistoric",
    color: COLOR.chairGiveawayBrown,
    image: "crits/dance/prehistoric.webp",
    description: "One tier promotion and forty upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.prehistoricTierSteps,
        balance.prehistoricUpgrades,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
