import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const MOVIES_CRITS = {
  backToTheFiscal: {
    label: "Back to the Fiscal",
    color: COLOR.blue,
    image: "crits/movies/backToTheFiscal.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  despicableFees: {
    label: "Despicable Fees",
    color: COLOR.amber,
    image: "crits/movies/despicableFees.webp",
    description: "Hires 1 free worker on this floor",
  },
  howToTrainYourManager: {
    label: "Train Your Manager",
    color: COLOR.teal,
    image: "crits/movies/howToTrainYourManager.webp",
    description: "Cuts every price in this building by 1%",
  },
  jurassicPerk: {
    label: "Jurassic Perk",
    color: COLOR.dressCodeGreen,
    image: "crits/movies/jurassicPerk.webp",
    description: "Thirteen instant payouts on this floor",
  },
  raidersOfTheLostReceipt: {
    label: "Lost Receipt",
    color: COLOR.chairGiveawayBrown,
    image: "crits/movies/raidersOfTheLostReceipt.webp",
    description: "Cuts every price in this building by 1.1%",
  },
  theDevilWearsPawda: {
    label: "The Devil Wears Pawda",
    color: COLOR.fancyFridayIndigo,
    image: "crits/movies/theDevilWearsPawda.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  theExpenseMatrix: {
    label: "The Expense Matrix",
    color: COLOR.payoutOlive,
    image: "crits/movies/theExpenseMatrix.webp",
    description:
      "Repeats the crit on the floor above, 17% chance to keep climbing",
  },
  theFastAndTheFurriest: {
    label: "The Fast and the Furriest",
    color: COLOR.roundUpOrange,
    image: "crits/movies/theFastAndTheFurriest.webp",
    description: "Boosts this floor's workers for 24s",
  },
  theFellowshipOfTheBling: {
    label: "Fellowship of the Bling",
    color: COLOR.mergerGold,
    image: "crits/movies/theFellowshipOfTheBling.webp",
    description: "Adds 3.8% of your total income",
  },
  theGreatCatsby: {
    label: "The Great Catsby",
    color: COLOR.coinGold,
    image: "crits/movies/theGreatCatsby.webp",
    description: "One tier promotion and thirty upgrades here",
  },
  theLordOfTheRingBinders: {
    label: "The Ring Binders",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/movies/theLordOfTheRingBinders.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  wreckIt: {
    label: "Wreck It",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/movies/wreckIt.webp",
    description: "Spreads 93 free upgrades over the lowest-level floors",
  },
} as const satisfies Record<string, FeaturedCritData>;
