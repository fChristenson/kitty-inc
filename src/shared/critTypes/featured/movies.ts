import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const MOVIES_CRIT_INFO = {
  backToTheFiscal: {
    label: "Back to the Fiscal",
    color: COLOR.blue,
    icon: "backToTheFiscal",
    description: "Eleven free upgrades on this floor",
  },
  despicableFees: {
    label: "Despicable Fees",
    color: COLOR.amber,
    icon: "despicableFees",
    description: "Thirty instant payouts on this floor",
  },
  howToTrainYourManager: {
    label: "Train Your Manager",
    color: COLOR.teal,
    icon: "howToTrainYourManager",
    description: "Four upgrades and six payouts on this floor",
  },
  jurassicPerk: {
    label: "Jurassic Perk",
    color: COLOR.dressCodeGreen,
    icon: "jurassicPerk",
    description: "Thirteen instant payouts on this floor",
  },
  raidersOfTheLostReceipt: {
    label: "Lost Receipt",
    color: COLOR.chairGiveawayBrown,
    icon: "raidersOfTheLostReceipt",
    description: "Nine free upgrades on the lowest-level floor",
  },
  theDevilWearsPawda: {
    label: "The Devil Wears Pawda",
    color: COLOR.fancyFridayIndigo,
    icon: "theDevilWearsPawda",
    description: "Fourteen upgrades on the cheapest floor",
  },
  theExpenseMatrix: {
    label: "The Expense Matrix",
    color: COLOR.payoutOlive,
    icon: "theExpenseMatrix",
    description: "Eighteen instant payouts on every unlocked floor",
  },
  theFastAndTheFurriest: {
    label: "The Fast and the Furriest",
    color: COLOR.roundUpOrange,
    icon: "theFastAndTheFurriest",
    description: "Twelve upgrades on alternating floors, from the ground",
  },
  theFellowshipOfTheBling: {
    label: "Fellowship of the Bling",
    color: COLOR.mergerGold,
    icon: "theFellowshipOfTheBling",
    description: "Six upgrades and six payouts on every floor",
  },
  theGreatCatsby: {
    label: "The Great Catsby",
    color: COLOR.coinGold,
    icon: "theGreatCatsby",
    description: "One tier promotion and thirty upgrades here",
  },
  theLordOfTheRingBinders: {
    label: "The Ring Binders",
    color: COLOR.goldenParachuteMarigold,
    icon: "theLordOfTheRingBinders",
    description: "Thirty-five free upgrades on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
