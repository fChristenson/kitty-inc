import type { OFFICE_CRITS } from "../../critData/office";
import type { FeaturedRewards } from "./types";

export const OFFICE_REWARDS = {
  executiveSpin: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.executiveSpinContinueChance),
  rubberStampede: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.rubberStampedePayouts),
  replyAll: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.replyAllFloors),
  stapleOfSuccess: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.stapleOfSuccessUpgrades),
  faxOfFortune: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.faxOfFortuneSeconds),
  casualMonday: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  deskJockey: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.deskJockeyUpgrades),
  inboxZeroGravity: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.inboxZeroGravityPayouts),
  beanCounter: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.beanCounterTierSteps,
      balance.beanCounterUpgrades,
    ),
  kingOfTheWorld: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.kingOfTheWorldContinueChance),
  officeClown: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.officeClownDiscount),
  fridayTieDay: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.fridayTieDayContinueChance),
  soReady: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.soReadyUpgrades),
} satisfies FeaturedRewards<typeof OFFICE_CRITS>;
