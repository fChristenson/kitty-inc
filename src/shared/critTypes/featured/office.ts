import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const OFFICE_CRIT_INFO = {
  executiveSpin: {
    label: "Executive Spin",
    color: COLOR.orange,
    icon: "executiveSpin",
    description: "Four free upgrades on the highest floor",
  },
  rubberStampede: {
    label: "Rubber Stampede",
    color: COLOR.red,
    icon: "rubberStampede",
    description: "Seven instant payouts on every unlocked floor",
  },
  replyAll: {
    label: "Reply All",
    color: COLOR.blue,
    icon: "replyAll",
    description: "Three payouts on this floor and the lowest-level floor",
  },
  stapleOfSuccess: {
    label: "Staple of Success",
    color: COLOR.silverTicketGray,
    icon: "stapleOfSuccess",
    description: "Seven free upgrades on this floor",
  },
  faxOfFortune: {
    label: "Fax of Fortune",
    color: COLOR.moneyGreen,
    icon: "faxOfFortune",
    description: "Eight payouts from the highest-earning floor",
  },
  casualMonday: {
    label: "Casual Monday",
    color: COLOR.peppermintPink,
    icon: "casualMonday",
    description: "Twenty free upgrades on this floor",
  },
  deskJockey: {
    label: "Desk Jockey",
    color: COLOR.nightShiftIndigo,
    icon: "deskJockey",
    description: "Six free upgrades on the lowest-level floor",
  },
  inboxZeroGravity: {
    label: "Inbox Zero Gravity",
    color: COLOR.cyan,
    icon: "inboxZeroGravity",
    description: "Twelve instant payouts on every unlocked floor",
  },
  beanCounter: {
    label: "Bean Counter",
    color: COLOR.heavenlyGold,
    icon: "beanCounter",
    description: "One tier promotion and six upgrades here",
  },
  kingOfTheWorld: {
    label: "King of the World",
    color: COLOR.gold,
    icon: "kingOfTheWorld",
    description: "Thirty free upgrades on the highest floor",
  },
  officeClown: {
    label: "Office Clown",
    color: COLOR.red,
    icon: "officeClown",
    description: "Five free upgrades on the lowest-level floor",
  },
  fridayTieDay: {
    label: "Friday Tie Day",
    color: COLOR.blue,
    icon: "fridayTieDay",
    description: "Ten payouts on alternating floors, from the ground",
  },
  soReady: {
    label: "So Ready",
    color: COLOR.cyan,
    icon: "soReady",
    description: "Fifteen free upgrades on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
