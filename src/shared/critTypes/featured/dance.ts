import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const DANCE_CRIT_INFO = {
  breakEven: {
    label: "Break Even",
    color: COLOR.performanceBonusBlue,
    icon: "breakEven",
    description: "Eight free upgrades on this floor",
  },
  chaChaChing: {
    label: "Cha-Cha-Ching",
    color: COLOR.amberMuted,
    icon: "chaChaChing",
    description: "Eight instant payouts on this floor",
  },
  charlestonCharge: {
    label: "Charleston Charge",
    color: COLOR.teaBreakBrown,
    icon: "charlestonCharge",
    description: "Eleven free upgrades on the lowest-level floor",
  },
  congaCompounding: {
    label: "Conga Compounding",
    color: COLOR.springSalePink,
    icon: "congaCompounding",
    description: "Four upgrades and four payouts on every floor",
  },
  robotResources: {
    label: "Robot Resources",
    color: COLOR.headhunterRust,
    icon: "robotResources",
    description: "Nineteen free upgrades on the highest floor",
  },
  rumbaReturns: {
    label: "Rumba Returns",
    color: COLOR.redActive,
    icon: "rumbaReturns",
    description: "Twenty-one instant payouts on this floor",
  },
  salsaSalary: {
    label: "Salsa Salary",
    color: COLOR.peppermintPink,
    icon: "salsaSalary",
    description: "Thirteen payouts from the highest-earning floor",
  },
  shuffleTheFunds: {
    label: "Shuffle the Funds",
    color: COLOR.springCleaningMint,
    icon: "shuffleTheFunds",
    description: "Fourteen upgrades on this floor and every floor below",
  },
  tangoTender: {
    label: "Tango Tender",
    color: COLOR.fullHouseCrimson,
    icon: "tangoTender",
    description: "Seven upgrades here and seven on the highest floor",
  },
  tapThatAsset: {
    label: "Tap That Asset",
    color: COLOR.bonusRoundGold,
    icon: "tapThatAsset",
    description: "Seventeen payouts on alternating floors, from the ground",
  },
  waltzStreet: {
    label: "Waltz Street",
    color: COLOR.shareholdersGreen,
    icon: "waltzStreet",
    description: "Seventeen free upgrades on every unlocked floor",
  },
  prehistoric: {
    label: "Prehistoric",
    color: COLOR.chairGiveawayBrown,
    icon: "prehistoric",
    description: "One tier promotion and forty upgrades here",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
