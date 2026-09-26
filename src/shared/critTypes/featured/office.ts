import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const OFFICE_CRITS = {
  executiveSpin: {
    label: "Executive Spin",
    color: COLOR.orange,
    image: "crits/office/executiveSpin.png",
    description: "Four free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.executiveSpinUpgrades),
  },
  rubberStampede: {
    label: "Rubber Stampede",
    color: COLOR.red,
    image: "crits/office/rubberStampede.png",
    description: "Seven instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.rubberStampedePayouts),
  },
  replyAll: {
    label: "Reply All",
    color: COLOR.blue,
    image: "crits/office/replyAll.png",
    description: "Three payouts on this floor and the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      const lowest = lowestLevel(context);
      actions.payCycles([context.floor], balance.replyAllPayouts);
      if (lowest !== context.floor)
        actions.payCycles([lowest], balance.replyAllPayouts);
    },
  },
  stapleOfSuccess: {
    label: "Staple of Success",
    color: COLOR.silverTicketGray,
    image: "crits/office/stapleOfSuccess.png",
    description: "Seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.stapleOfSuccessUpgrades),
  },
  faxOfFortune: {
    label: "Fax of Fortune",
    color: COLOR.moneyGreen,
    image: "crits/office/faxOfFortune.png",
    description: "Eight payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.faxOfFortunePayouts,
      ),
  },
  casualMonday: {
    label: "Casual Monday",
    color: COLOR.peppermintPink,
    image: "crits/office/casualMonday.png",
    description: "Twenty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.casualMondayUpgrades),
  },
  deskJockey: {
    label: "Desk Jockey",
    color: COLOR.nightShiftIndigo,
    image: "crits/office/deskJockey.png",
    description: "Six free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.deskJockeyUpgrades),
  },
  inboxZeroGravity: {
    label: "Inbox Zero Gravity",
    color: COLOR.cyan,
    image: "crits/office/inboxZeroGravity.png",
    description: "Twelve instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.inboxZeroGravityPayouts),
  },
  beanCounter: {
    label: "Bean Counter",
    color: COLOR.heavenlyGold,
    image: "crits/office/beanCounter.png",
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
    image: "crits/office/kingOfTheWorld.png",
    description: "Thirty free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.kingOfTheWorldUpgrades),
  },
  officeClown: {
    label: "Office Clown",
    color: COLOR.red,
    image: "crits/office/officeClown.png",
    description: "Five free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.officeClownUpgrades),
  },
  fridayTieDay: {
    label: "Friday Tie Day",
    color: COLOR.blue,
    image: "crits/office/fridayTieDay.png",
    description: "Ten payouts on alternating floors, from the ground",
    reward: (context, { actions, balance }) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.fridayTieDayPayouts,
      ),
  },
  soReady: {
    label: "So Ready",
    color: COLOR.cyan,
    image: "crits/office/soReady.png",
    description: "Fifteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.soReadyUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
