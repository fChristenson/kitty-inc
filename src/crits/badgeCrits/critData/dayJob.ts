import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const DAY_JOB_CRITS = {
  executiveSpin: {
    label: "Executive Spin",
    color: COLOR.orange,
    image: "crits/dayJob/executiveSpin.webp",
    description:
      "Repeats the crit on the floor below, 10% chance to keep falling",
  },
  rubberStampede: {
    label: "Rubber Stampede",
    color: COLOR.red,
    image: "crits/dayJob/rubberStampede.webp",
    description: "Seven instant payouts on every unlocked floor",
  },
  replyAll: {
    label: "Reply All",
    color: COLOR.blue,
    image: "crits/dayJob/replyAll.webp",
    description: "Unlocks the next floor for free",
  },
  stapleOfSuccess: {
    label: "Staple of Success",
    color: COLOR.silverTicketGray,
    image: "crits/dayJob/stapleOfSuccess.webp",
    description: "Seven free upgrades on this floor",
  },
  faxOfFortune: {
    label: "Fax of Fortune",
    color: COLOR.moneyGreen,
    image: "crits/dayJob/faxOfFortune.webp",
    description: "Adds 5s of your company's income",
  },
  casualMonday: {
    label: "Casual Monday",
    color: COLOR.peppermintPink,
    image: "crits/dayJob/casualMonday.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  deskJockey: {
    label: "Desk Jockey",
    color: COLOR.nightShiftIndigo,
    image: "crits/dayJob/deskJockey.webp",
    description: "Six free upgrades on the lowest-level floor",
  },
  inboxZeroGravity: {
    label: "Inbox Zero Gravity",
    color: COLOR.cyan,
    image: "crits/dayJob/inboxZeroGravity.webp",
    description: "Twelve instant payouts on every unlocked floor",
  },
  beanCounter: {
    label: "Bean Counter",
    color: COLOR.heavenlyGold,
    image: "crits/dayJob/beanCounter.webp",
    description: "One tier promotion and six upgrades here",
  },
  kingOfTheWorld: {
    label: "King of the World",
    color: COLOR.gold,
    image: "crits/dayJob/kingOfTheWorld.webp",
    description:
      "Repeats the crit on the floor above, 14% chance to keep climbing",
  },
  officeClown: {
    label: "Office Clown",
    color: COLOR.red,
    image: "crits/dayJob/officeClown.webp",
    description: "Cuts every price in this building by 1.1%",
  },
  fridayTieDay: {
    label: "Friday Tie Day",
    color: COLOR.blue,
    image: "crits/dayJob/fridayTieDay.webp",
    description:
      "Repeats the crit on the floor below, 13% chance to keep falling",
  },
  soReady: {
    label: "So Ready",
    color: COLOR.cyan,
    image: "crits/dayJob/soReady.webp",
    description: "Fifteen free upgrades on this floor",
  },
  bandanaSquad: {
    label: "Bandana Squad",
    color: COLOR.amberMuted,
    image: "crits/dayJob/bandanaSquad.webp",
    description: "Grows this floor's level by 26% in free upgrades",
  },
  hiVisDuo: {
    label: "Hi Vis Duo",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/dayJob/hiVisDuo.webp",
    description: "Grows this floor's level by 26.1% in free upgrades",
  },
  overallReady: {
    label: "Overall Ready",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/dayJob/overallReady.webp",
    description: "Grows this floor's level by 26.2% in free upgrades",
  },
  blueBobs: {
    label: "Blue Bobs",
    color: COLOR.sameBoatCoral,
    image: "crits/dayJob/blueBobs.webp",
    description: "Adds 40.2% of your total income",
  },
  featherDuster: {
    label: "Feather Duster",
    color: COLOR.sameBoatCoral,
    image: "crits/dayJob/featherDuster.webp",
    description: "Adds 40.5% of your total income",
  },
  maidCafe: {
    label: "Maid Cafe",
    color: COLOR.amberMuted,
    image: "crits/dayJob/maidCafe.webp",
    description: "Adds 40.7% of your total income",
  },
  ravenTwins: {
    label: "Raven Twins",
    color: COLOR.sameBoatCoral,
    image: "crits/dayJob/ravenTwins.webp",
    description: "Adds 40.8% of your total income",
  },
  calicoChemist: {
    label: "Calico Chemist",
    color: COLOR.amberMuted,
    image: "crits/dayJob/calicoChemist.webp",
    description: "Spreads 165 free upgrades over the lowest-level floors",
  },
  fourEyes: {
    label: "Four Eyes",
    color: COLOR.amberMuted,
    image: "crits/dayJob/fourEyes.webp",
    description: "Grows this floor's level by 19.8% in free upgrades",
  },
  underTheMicroscope: {
    label: "Under The Microscope",
    color: COLOR.amberMuted,
    image: "crits/dayJob/underTheMicroscope.webp",
    description: "Spreads 166 free upgrades over the lowest-level floors",
  },
} as const satisfies Record<string, FeaturedCritData>;
