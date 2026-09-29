import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const OFFICE_CRITS = {
  executiveSpin: {
    label: "Executive Spin",
    color: COLOR.orange,
    image: "crits/office/executiveSpin.webp",
    description:
      "Repeats the crit on the floor below, 10% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.executiveSpinContinueChance),
  },
  rubberStampede: {
    label: "Rubber Stampede",
    color: COLOR.red,
    image: "crits/office/rubberStampede.webp",
    description: "Seven instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.rubberStampedePayouts),
  },
  replyAll: {
    label: "Reply All",
    color: COLOR.blue,
    image: "crits/office/replyAll.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.replyAllFloors),
  },
  stapleOfSuccess: {
    label: "Staple of Success",
    color: COLOR.silverTicketGray,
    image: "crits/office/stapleOfSuccess.webp",
    description: "Seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.stapleOfSuccessUpgrades),
  },
  faxOfFortune: {
    label: "Fax of Fortune",
    color: COLOR.moneyGreen,
    image: "crits/office/faxOfFortune.webp",
    description: "Adds 5s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.faxOfFortuneSeconds),
  },
  casualMonday: {
    label: "Casual Monday",
    color: COLOR.peppermintPink,
    image: "crits/office/casualMonday.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  deskJockey: {
    label: "Desk Jockey",
    color: COLOR.nightShiftIndigo,
    image: "crits/office/deskJockey.webp",
    description: "Six free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.deskJockeyUpgrades),
  },
  inboxZeroGravity: {
    label: "Inbox Zero Gravity",
    color: COLOR.cyan,
    image: "crits/office/inboxZeroGravity.webp",
    description: "Twelve instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.inboxZeroGravityPayouts),
  },
  beanCounter: {
    label: "Bean Counter",
    color: COLOR.heavenlyGold,
    image: "crits/office/beanCounter.webp",
    description: "One tier promotion and six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.beanCounterTierSteps,
        balance.beanCounterUpgrades,
      ),
  },
  kingOfTheWorld: {
    label: "King of the World",
    color: COLOR.gold,
    image: "crits/office/kingOfTheWorld.webp",
    description:
      "Repeats the crit on the floor above, 14% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.kingOfTheWorldContinueChance),
  },
  officeClown: {
    label: "Office Clown",
    color: COLOR.red,
    image: "crits/office/officeClown.webp",
    description: "Cuts every price in this building by 1.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.officeClownDiscount),
  },
  fridayTieDay: {
    label: "Friday Tie Day",
    color: COLOR.blue,
    image: "crits/office/fridayTieDay.webp",
    description:
      "Repeats the crit on the floor below, 13% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.fridayTieDayContinueChance),
  },
  soReady: {
    label: "So Ready",
    color: COLOR.cyan,
    image: "crits/office/soReady.webp",
    description: "Fifteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.soReadyUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
