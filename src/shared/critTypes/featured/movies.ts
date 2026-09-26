import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const MOVIES_CRITS = {
  backToTheFiscal: {
    label: "Back to the Fiscal",
    color: COLOR.blue,
    image: "crits/movies/backToTheFiscal.png",
    description: "Eleven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.backToTheFiscalUpgrades),
  },
  despicableFees: {
    label: "Despicable Fees",
    color: COLOR.amber,
    image: "crits/movies/despicableFees.png",
    description: "Thirty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.despicableFeesPayouts),
  },
  howToTrainYourManager: {
    label: "Train Your Manager",
    color: COLOR.teal,
    image: "crits/movies/howToTrainYourManager.png",
    description: "Four upgrades and six payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.howToTrainYourManagerUpgrades);
      actions.payCycles([context.floor], balance.howToTrainYourManagerPayouts);
    },
  },
  jurassicPerk: {
    label: "Jurassic Perk",
    color: COLOR.dressCodeGreen,
    image: "crits/movies/jurassicPerk.png",
    description: "Thirteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.jurassicPerkPayouts),
  },
  raidersOfTheLostReceipt: {
    label: "Lost Receipt",
    color: COLOR.chairGiveawayBrown,
    image: "crits/movies/raidersOfTheLostReceipt.png",
    description: "Nine free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.raidersOfTheLostReceiptUpgrades,
      ),
  },
  theDevilWearsPawda: {
    label: "The Devil Wears Pawda",
    color: COLOR.fancyFridayIndigo,
    image: "crits/movies/theDevilWearsPawda.png",
    description: "Fourteen upgrades on the cheapest floor",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.theDevilWearsPawdaUpgrades),
  },
  theExpenseMatrix: {
    label: "The Expense Matrix",
    color: COLOR.payoutOlive,
    image: "crits/movies/theExpenseMatrix.png",
    description: "Eighteen instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.theExpenseMatrixPayouts),
  },
  theFastAndTheFurriest: {
    label: "The Fast and the Furriest",
    color: COLOR.roundUpOrange,
    image: "crits/movies/theFastAndTheFurriest.png",
    description: "Twelve upgrades on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(
        alternating(context),
        balance.theFastAndTheFurriestUpgrades,
      ),
  },
  theFellowshipOfTheBling: {
    label: "Fellowship of the Bling",
    color: COLOR.mergerGold,
    image: "crits/movies/theFellowshipOfTheBling.png",
    description: "Six upgrades and six payouts on every floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.theFellowshipOfTheBlingUpgrades);
      actions.payCycles(context.floors, balance.theFellowshipOfTheBlingPayouts);
    },
  },
  theGreatCatsby: {
    label: "The Great Catsby",
    color: COLOR.coinGold,
    image: "crits/movies/theGreatCatsby.png",
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
    image: "crits/movies/theLordOfTheRingBinders.png",
    description: "Thirty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.theLordOfTheRingBindersUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
