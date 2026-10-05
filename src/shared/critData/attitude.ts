import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const ATTITUDE_CRITS = {
  goldenSkull: {
    label: "Golden Skull",
    color: COLOR.gold,
    image: "crits/attitude/goldenSkull.webp",
    description: "Adds 3.4% of your total income",
  },
  lordOfMurder: {
    label: "Lord of Murder",
    color: COLOR.red,
    image: "crits/attitude/lordOfMurder.webp",
    description: "One tier promotion and 14 upgrades on the lowest-level floor",
  },
  speedDemon: {
    label: "Speed Demon",
    color: COLOR.cyan,
    image: "crits/attitude/speedDemon.webp",
    description: "Boosts this floor's workers for 23s",
  },
  badonkadonk: {
    label: "Badonkadonk",
    color: COLOR.gold,
    image: "crits/attitude/badonkadonk.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  demonicBuns: {
    label: "Demonic Buns",
    color: COLOR.red,
    image: "crits/attitude/demoncBuns.webp",
    description: "Sixteen free upgrades, then twenty-one payouts on this floor",
  },
  infernalInterest: {
    label: "Infernal Wagon",
    color: COLOR.orange,
    image: "crits/attitude/infernalInterest.webp",
    description: "Boosts this floor's workers for 26s",
  },
  dropItLow: {
    label: "Drop It Low",
    color: COLOR.cyan,
    image: "crits/attitude/dropItLow.webp",
    description: "Nine upgrades, then five payouts on the lowest-level floor",
  },
  kittyWagon: {
    label: "Kitty Wagon",
    color: COLOR.moneyGreen,
    image: "crits/attitude/kittyWagon.webp",
    description: "Hires 1 free worker on this floor",
  },
  madeYouLook: {
    label: "Made You Look",
    color: COLOR.peppermintPink,
    image: "crits/attitude/madeYouLook.webp",
    description: "Boosts this floor's workers for 20s",
  },
  wagonWarrior: {
    label: "Wagon Warrior",
    color: COLOR.silverTicketGray,
    image: "crits/attitude/wagonWarrior.webp",
    description: "Five upgrades, then three payouts on every unlocked floor",
  },
  bubbleButt: {
    label: "Bubble Butt",
    color: COLOR.orange,
    image: "crits/attitude/bubbleButt.webp",
    description: "Boosts this floor's workers for 21s",
  },
  canNotLie: {
    label: "Can Not Lie",
    color: COLOR.moneyGreen,
    image: "crits/attitude/canNotLie.webp",
    description: "Boosts this floor's workers for 22s",
  },
  demonGirl: {
    label: "Demon Girl",
    color: COLOR.fullHouseCrimson,
    image: "crits/attitude/demonGirl.webp",
    description: "Cuts every price in this building by 4.5%",
  },
  partnersInCrime: {
    label: "Partners In Crime",
    color: COLOR.nightShiftIndigo,
    image: "crits/attitude/partnersInCrime.webp",
    description: "Arms every floor's next click as an x5 crit",
  },
} as const satisfies Record<string, FeaturedCritData>;
