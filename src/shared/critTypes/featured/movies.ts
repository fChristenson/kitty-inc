import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const MOVIES_CRITS = {
  backToTheFiscal: {
    label: "Back to the Fiscal",
    color: COLOR.blue,
    image: "crits/movies/backToTheFiscal.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  despicableFees: {
    label: "Despicable Fees",
    color: COLOR.amber,
    image: "crits/movies/despicableFees.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.despicableFeesWorkers),
  },
  howToTrainYourManager: {
    label: "Train Your Manager",
    color: COLOR.teal,
    image: "crits/movies/howToTrainYourManager.webp",
    description: "Cuts every price in this building by 1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(
        context.floors,
        balance.howToTrainYourManagerDiscount,
      ),
  },
  jurassicPerk: {
    label: "Jurassic Perk",
    color: COLOR.dressCodeGreen,
    image: "crits/movies/jurassicPerk.webp",
    description: "Thirteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.jurassicPerkPayouts),
  },
  raidersOfTheLostReceipt: {
    label: "Lost Receipt",
    color: COLOR.chairGiveawayBrown,
    image: "crits/movies/raidersOfTheLostReceipt.webp",
    description: "Cuts every price in this building by 1.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(
        context.floors,
        balance.raidersOfTheLostReceiptDiscount,
      ),
  },
  theDevilWearsPawda: {
    label: "The Devil Wears Pawda",
    color: COLOR.fancyFridayIndigo,
    image: "crits/movies/theDevilWearsPawda.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  theExpenseMatrix: {
    label: "The Expense Matrix",
    color: COLOR.payoutOlive,
    image: "crits/movies/theExpenseMatrix.webp",
    description:
      "Repeats the crit on the floor above, 17% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.theExpenseMatrixContinueChance),
  },
  theFastAndTheFurriest: {
    label: "The Fast and the Furriest",
    color: COLOR.roundUpOrange,
    image: "crits/movies/theFastAndTheFurriest.webp",
    description: "Boosts this floor's workers for 24s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.theFastAndTheFurriestBoostSeconds,
        balance.theFastAndTheFurriestExtraWorkers,
      ),
  },
  theFellowshipOfTheBling: {
    label: "Fellowship of the Bling",
    color: COLOR.mergerGold,
    image: "crits/movies/theFellowshipOfTheBling.webp",
    description: "Adds 3.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.theFellowshipOfTheBlingShare),
  },
  theGreatCatsby: {
    label: "The Great Catsby",
    color: COLOR.coinGold,
    image: "crits/movies/theGreatCatsby.webp",
    description: "One tier promotion and thirty upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.theGreatCatsbyTierSteps,
        balance.theGreatCatsbyUpgrades,
      ),
  },
  theLordOfTheRingBinders: {
    label: "The Ring Binders",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/movies/theLordOfTheRingBinders.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
