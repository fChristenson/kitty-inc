import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const OFFICE_CRITS = {
  executiveSpin: {
    label: "Executive Spin",
    color: COLOR.orange,
    image: "crits/office/executiveSpin.webp",
    description:
      "Repeats the crit on the floor below, 10% chance to keep falling",
  },
  rubberStampede: {
    label: "Rubber Stampede",
    color: COLOR.red,
    image: "crits/office/rubberStampede.webp",
    description: "Seven instant payouts on every unlocked floor",
  },
  replyAll: {
    label: "Reply All",
    color: COLOR.blue,
    image: "crits/office/replyAll.webp",
    description: "Unlocks the next floor for free",
  },
  stapleOfSuccess: {
    label: "Staple of Success",
    color: COLOR.silverTicketGray,
    image: "crits/office/stapleOfSuccess.webp",
    description: "Seven free upgrades on this floor",
  },
  faxOfFortune: {
    label: "Fax of Fortune",
    color: COLOR.moneyGreen,
    image: "crits/office/faxOfFortune.webp",
    description: "Adds 5s of your company's income",
  },
  casualMonday: {
    label: "Casual Monday",
    color: COLOR.peppermintPink,
    image: "crits/office/casualMonday.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  deskJockey: {
    label: "Desk Jockey",
    color: COLOR.nightShiftIndigo,
    image: "crits/office/deskJockey.webp",
    description: "Six free upgrades on the lowest-level floor",
  },
  inboxZeroGravity: {
    label: "Inbox Zero Gravity",
    color: COLOR.cyan,
    image: "crits/office/inboxZeroGravity.webp",
    description: "Twelve instant payouts on every unlocked floor",
  },
  beanCounter: {
    label: "Bean Counter",
    color: COLOR.heavenlyGold,
    image: "crits/office/beanCounter.webp",
    description: "One tier promotion and six upgrades here",
  },
  kingOfTheWorld: {
    label: "King of the World",
    color: COLOR.gold,
    image: "crits/office/kingOfTheWorld.webp",
    description:
      "Repeats the crit on the floor above, 14% chance to keep climbing",
  },
  officeClown: {
    label: "Office Clown",
    color: COLOR.red,
    image: "crits/office/officeClown.webp",
    description: "Cuts every price in this building by 1.1%",
  },
  fridayTieDay: {
    label: "Friday Tie Day",
    color: COLOR.blue,
    image: "crits/office/fridayTieDay.webp",
    description:
      "Repeats the crit on the floor below, 13% chance to keep falling",
  },
  soReady: {
    label: "So Ready",
    color: COLOR.cyan,
    image: "crits/office/soReady.webp",
    description: "Fifteen free upgrades on this floor",
  },
} as const satisfies Record<string, FeaturedCritData>;
