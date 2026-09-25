import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createDanceRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    breakEven: (context) =>
      actions.upgrade([context.floor], balance.breakEvenUpgrades),
    chaChaChing: (context) =>
      actions.payCycles([context.floor], balance.chaChaChingPayouts),
    charlestonCharge: (context) =>
      actions.upgrade([lowestLevel(context)], balance.charlestonChargeUpgrades),
    congaCompounding: (context) => {
      actions.upgrade(context.floors, balance.congaCompoundingUpgrades);
      actions.payCycles(context.floors, balance.congaCompoundingPayouts);
    },
    robotResources: (context) =>
      actions.upgrade([highestFloor(context)], balance.robotResourcesUpgrades),
    rumbaReturns: (context) =>
      actions.payCycles([context.floor], balance.rumbaReturnsPayouts),
    salsaSalary: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.salsaSalaryPayouts,
      ),
    shuffleTheFunds: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.shuffleTheFundsUpgrades,
      ),
    tangoTender: (context) => {
      actions.upgrade([context.floor], balance.tangoTenderUpgrades);
      actions.upgrade([highestFloor(context)], balance.tangoTenderUpgrades);
    },
    tapThatAsset: (context) =>
      actions.payCycles(alternating(context), balance.tapThatAssetPayouts),
    waltzStreet: (context) =>
      actions.upgrade(context.floors, balance.waltzStreetUpgrades),
    prehistoric: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.prehistoricTierSteps,
        balance.prehistoricUpgrades,
      ),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
