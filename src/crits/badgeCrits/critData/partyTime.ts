import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const PARTY_TIME_CRITS = {
  doughDivision: {
    label: "Dough Division",
    color: COLOR.gold,
    image: "crits/partyTime/doughDivision.webp",
    description: "Free office supplies for this floor",
  },
  profitPopcorn: {
    label: "Profit Popcorn",
    color: COLOR.heavenlyGold,
    image: "crits/partyTime/profitPopcorn.webp",
    description: "Adds 3.1% of your total income",
  },
  donutDisturb: {
    label: "Donut Disturb",
    color: COLOR.peppermintPink,
    image: "crits/partyTime/donutDisturb.webp",
    description: "Five upgrades and five payouts on this floor",
  },
  cakeDay: {
    label: "Cake Day",
    color: COLOR.red,
    image: "crits/partyTime/cakeDay.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  champagneProblems: {
    label: "Champagne Problems",
    color: COLOR.starYellow,
    image: "crits/partyTime/champagneProblems.webp",
    description: "Fifteen payouts from the highest-earning floor",
  },
  bonusBurrito: {
    label: "Bonus Burrito",
    color: COLOR.orange,
    image: "crits/partyTime/bonusBurrito.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  sundaeBest: {
    label: "Sundae Best",
    color: COLOR.blue,
    image: "crits/partyTime/sundaeBest.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  popTheQuestion: {
    label: "Pop the Question",
    color: COLOR.cyan,
    image: "crits/partyTime/popTheQuestion.webp",
    description: "One tier promotion and four upgrades here",
  },
  partyCrasher: {
    label: "Party Crasher",
    color: COLOR.red,
    image: "crits/partyTime/partyCrasher.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  bottleRockets: {
    label: "Bottle Rockets",
    color: COLOR.sunshineGold,
    image: "crits/partyTime/bottleRockets.webp",
    description: "Spreads 168 free upgrades over the lowest-level floors",
  },
  breakEven: {
    label: "Break Even",
    color: COLOR.performanceBonusBlue,
    image: "crits/partyTime/breakEven.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  chaChaChing: {
    label: "Cha-Cha-Ching",
    color: COLOR.amberMuted,
    image: "crits/partyTime/chaChaChing.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  charlestonCharge: {
    label: "Charleston Charge",
    color: COLOR.teaBreakBrown,
    image: "crits/partyTime/charlestonCharge.webp",
    description: "Boosts this floor's workers for 21s",
  },
  congaCompounding: {
    label: "Conga Compounding",
    color: COLOR.springSalePink,
    image: "crits/partyTime/congaCompounding.webp",
    description: "Boosts this floor's workers for 22s",
  },
  robotResources: {
    label: "Robot Resources",
    color: COLOR.headhunterRust,
    image: "crits/partyTime/robotResources.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  rumbaReturns: {
    label: "Rumba Returns",
    color: COLOR.redActive,
    image: "crits/partyTime/rumbaReturns.webp",
    description: "Twenty-one instant payouts on this floor",
  },
  salsaSalary: {
    label: "Salsa Salary",
    color: COLOR.peppermintPink,
    image: "crits/partyTime/salsaSalary.webp",
    description: "Thirteen payouts from the highest-earning floor",
  },
  shuffleTheFunds: {
    label: "Shuffle the Funds",
    color: COLOR.springCleaningMint,
    image: "crits/partyTime/shuffleTheFunds.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  tangoTender: {
    label: "Tango Tender",
    color: COLOR.fullHouseCrimson,
    image: "crits/partyTime/tangoTender.webp",
    description: "Seven upgrades here and seven on the highest floor",
  },
  tapThatAsset: {
    label: "Tap That Asset",
    color: COLOR.bonusRoundGold,
    image: "crits/partyTime/tapThatAsset.webp",
    description: "Adds 3.7% of your total income",
  },
  waltzStreet: {
    label: "Waltz Street",
    color: COLOR.shareholdersGreen,
    image: "crits/partyTime/waltzStreet.webp",
    description: "Seventeen free upgrades on every unlocked floor",
  },
  prehistoric: {
    label: "Prehistoric",
    color: COLOR.chairGiveawayBrown,
    image: "crits/partyTime/prehistoric.webp",
    description: "One tier promotion and forty upgrades here",
  },
} as const satisfies Record<string, FeaturedCritData>;
