import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const DANCE_CRITS = {
  breakEven: {
    label: "Break Even",
    color: COLOR.performanceBonusBlue,
    image: "crits/dance/breakEven.png",
    description: "Eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.breakEvenUpgrades),
  },
  chaChaChing: {
    label: "Cha-Cha-Ching",
    color: COLOR.amberMuted,
    image: "crits/dance/chaChaChing.png",
    description: "Eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.chaChaChingPayouts),
  },
  charlestonCharge: {
    label: "Charleston Charge",
    color: COLOR.teaBreakBrown,
    image: "crits/dance/charlestonCharge.png",
    description: "Eleven free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.charlestonChargeUpgrades),
  },
  congaCompounding: {
    label: "Conga Compounding",
    color: COLOR.springSalePink,
    image: "crits/dance/congaCompounding.png",
    description: "Four upgrades and four payouts on every floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.congaCompoundingUpgrades);
      actions.payCycles(context.floors, balance.congaCompoundingPayouts);
    },
  },
  robotResources: {
    label: "Robot Resources",
    color: COLOR.headhunterRust,
    image: "crits/dance/robotResources.png",
    description: "Nineteen free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.robotResourcesUpgrades),
  },
  rumbaReturns: {
    label: "Rumba Returns",
    color: COLOR.redActive,
    image: "crits/dance/rumbaReturns.png",
    description: "Twenty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.rumbaReturnsPayouts),
  },
  salsaSalary: {
    label: "Salsa Salary",
    color: COLOR.peppermintPink,
    image: "crits/dance/salsaSalary.png",
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
    image: "crits/dance/shuffleTheFunds.png",
    description: "Fourteen upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.shuffleTheFundsUpgrades,
      ),
  },
  tangoTender: {
    label: "Tango Tender",
    color: COLOR.fullHouseCrimson,
    image: "crits/dance/tangoTender.png",
    description: "Seven upgrades here and seven on the highest floor",
    reward: (context, { actions, balance, highestFloor }) => {
      actions.upgrade([context.floor], balance.tangoTenderUpgrades);
      actions.upgrade([highestFloor(context)], balance.tangoTenderUpgrades);
    },
  },
  tapThatAsset: {
    label: "Tap That Asset",
    color: COLOR.bonusRoundGold,
    image: "crits/dance/tapThatAsset.png",
    description: "Seventeen payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.tapThatAssetPayouts),
  },
  waltzStreet: {
    label: "Waltz Street",
    color: COLOR.shareholdersGreen,
    image: "crits/dance/waltzStreet.png",
    description: "Seventeen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.waltzStreetUpgrades),
  },
  prehistoric: {
    label: "Prehistoric",
    color: COLOR.chairGiveawayBrown,
    image: "crits/dance/prehistoric.png",
    description: "One tier promotion and forty upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.prehistoricTierSteps,
        balance.prehistoricUpgrades,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
