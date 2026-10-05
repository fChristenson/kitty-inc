import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const DANCE_CRITS = {
  breakEven: {
    label: "Break Even",
    color: COLOR.performanceBonusBlue,
    image: "crits/dance/breakEven.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  chaChaChing: {
    label: "Cha-Cha-Ching",
    color: COLOR.amberMuted,
    image: "crits/dance/chaChaChing.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  charlestonCharge: {
    label: "Charleston Charge",
    color: COLOR.teaBreakBrown,
    image: "crits/dance/charlestonCharge.webp",
    description: "Boosts this floor's workers for 21s",
  },
  congaCompounding: {
    label: "Conga Compounding",
    color: COLOR.springSalePink,
    image: "crits/dance/congaCompounding.webp",
    description: "Boosts this floor's workers for 22s",
  },
  robotResources: {
    label: "Robot Resources",
    color: COLOR.headhunterRust,
    image: "crits/dance/robotResources.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  rumbaReturns: {
    label: "Rumba Returns",
    color: COLOR.redActive,
    image: "crits/dance/rumbaReturns.webp",
    description: "Twenty-one instant payouts on this floor",
  },
  salsaSalary: {
    label: "Salsa Salary",
    color: COLOR.peppermintPink,
    image: "crits/dance/salsaSalary.webp",
    description: "Thirteen payouts from the highest-earning floor",
  },
  shuffleTheFunds: {
    label: "Shuffle the Funds",
    color: COLOR.springCleaningMint,
    image: "crits/dance/shuffleTheFunds.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  tangoTender: {
    label: "Tango Tender",
    color: COLOR.fullHouseCrimson,
    image: "crits/dance/tangoTender.webp",
    description: "Seven upgrades here and seven on the highest floor",
  },
  tapThatAsset: {
    label: "Tap That Asset",
    color: COLOR.bonusRoundGold,
    image: "crits/dance/tapThatAsset.webp",
    description: "Adds 3.7% of your total income",
  },
  waltzStreet: {
    label: "Waltz Street",
    color: COLOR.shareholdersGreen,
    image: "crits/dance/waltzStreet.webp",
    description: "Seventeen free upgrades on every unlocked floor",
  },
  prehistoric: {
    label: "Prehistoric",
    color: COLOR.chairGiveawayBrown,
    image: "crits/dance/prehistoric.webp",
    description: "One tier promotion and forty upgrades here",
  },
} as const satisfies Record<string, FeaturedCritData>;
