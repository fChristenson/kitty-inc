import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createOfficeRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    executiveSpin: (context) =>
      actions.upgrade([highestFloor(context)], balance.executiveSpinUpgrades),
    rubberStampede: (context) =>
      actions.payCycles(context.floors, balance.rubberStampedePayouts),
    replyAll: (context) => {
      const lowest = lowestLevel(context);
      actions.payCycles([context.floor], balance.replyAllPayouts);
      if (lowest !== context.floor)
        actions.payCycles([lowest], balance.replyAllPayouts);
    },
    stapleOfSuccess: (context) =>
      actions.upgrade([context.floor], balance.stapleOfSuccessUpgrades),
    faxOfFortune: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.faxOfFortunePayouts,
      ),
    casualMonday: (context) =>
      actions.upgrade([context.floor], balance.casualMondayUpgrades),
    deskJockey: (context) =>
      actions.upgrade([lowestLevel(context)], balance.deskJockeyUpgrades),
    inboxZeroGravity: (context) =>
      actions.payCycles(context.floors, balance.inboxZeroGravityPayouts),
    beanCounter: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.beanCounterTierSteps,
        balance.beanCounterUpgrades,
      ),
    kingOfTheWorld: (context) =>
      actions.upgrade([highestFloor(context)], balance.kingOfTheWorldUpgrades),
    officeClown: (context) =>
      actions.upgrade([lowestLevel(context)], balance.officeClownUpgrades),
    fridayTieDay: (context) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.fridayTieDayPayouts,
      ),
    soReady: (context) =>
      actions.upgrade([context.floor], balance.soReadyUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
