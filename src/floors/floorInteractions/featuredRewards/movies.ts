import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createMoviesRewards({
  actions,
  balance,
  lowestLevel,
  alternating,
  cheapest,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    backToTheFiscal: (context) =>
      actions.upgrade([context.floor], balance.backToTheFiscalUpgrades),
    despicableFees: (context) =>
      actions.payCycles([context.floor], balance.despicableFeesPayouts),
    howToTrainYourManager: (context) => {
      actions.upgrade([context.floor], balance.howToTrainYourManagerUpgrades);
      actions.payCycles([context.floor], balance.howToTrainYourManagerPayouts);
    },
    jurassicPerk: (context) =>
      actions.payCycles([context.floor], balance.jurassicPerkPayouts),
    raidersOfTheLostReceipt: (context) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.raidersOfTheLostReceiptUpgrades,
      ),
    theDevilWearsPawda: (context) =>
      actions.upgrade([cheapest(context)], balance.theDevilWearsPawdaUpgrades),
    theExpenseMatrix: (context) =>
      actions.payCycles(context.floors, balance.theExpenseMatrixPayouts),
    theFastAndTheFurriest: (context) =>
      actions.upgrade(
        alternating(context),
        balance.theFastAndTheFurriestUpgrades,
      ),
    theFellowshipOfTheBling: (context) => {
      actions.upgrade(context.floors, balance.theFellowshipOfTheBlingUpgrades);
      actions.payCycles(context.floors, balance.theFellowshipOfTheBlingPayouts);
    },
    theGreatCatsby: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.theGreatCatsbyTierSteps,
        balance.theGreatCatsbyUpgrades,
      ),
    theLordOfTheRingBinders: (context) =>
      actions.upgrade([context.floor], balance.theLordOfTheRingBindersUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
