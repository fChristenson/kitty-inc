import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const SHOWTIME_CRITS = {
  ballerina: {
    label: "Pirouette",
    color: COLOR.peppermintPink,
    image: "crits/showtime/ballerina.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  cowboy: {
    label: "Roundup Rodeo",
    color: COLOR.gold,
    image: "crits/showtime/cowboy.webp",
    description: "Eight free upgrades on the lowest-level floor",
  },
  dinnerTime: {
    label: "Dinner Time",
    color: COLOR.moneyGreen,
    image: "crits/showtime/dinnerTime.webp",
    description: "Five instant payouts on every unlocked floor",
  },
  fingerGuns: {
    label: "Finger Guns",
    color: COLOR.blue,
    image: "crits/showtime/fingerGuns.webp",
    description: "Free office supplies for this floor",
  },
  flamenco: {
    label: "Flamenco",
    color: COLOR.red,
    image: "crits/showtime/flamenco.webp",
    description: "Boosts this floor's workers for 21s",
  },
  milestone: {
    label: "Milestone",
    color: COLOR.cyan,
    image: "crits/showtime/milestone.webp",
    description: "Raises this floor to the next multiple of 25",
  },
  moonwalker: {
    label: "Moonwalk",
    color: COLOR.silverTicketGray,
    image: "crits/showtime/moonwalker.webp",
    description: "Boosts this floor's workers for 21s",
  },
  ninja: {
    label: "Ninja Bonus",
    color: COLOR.nightShiftIndigo,
    image: "crits/showtime/ninja.webp",
    description: "Boosts this floor's workers for 22s",
  },
  obelisk: {
    label: "Obelisk",
    color: COLOR.mysticTeal,
    image: "crits/showtime/obelisk.webp",
    description: "Two tier promotions and two upgrades on this floor",
  },
  sharpShooter: {
    label: "Sharpshooter",
    color: COLOR.starYellow,
    image: "crits/showtime/sharpShooter.webp",
    description: "Boosts this floor's workers for 21s",
  },
  space: {
    label: "Space Race",
    color: COLOR.orange,
    image: "crits/showtime/space.webp",
    description: "Twenty free upgrades on the highest unlocked floor",
  },
  yesChef: {
    label: "Yes, Chef",
    color: COLOR.blue,
    image: "crits/showtime/yesChef.webp",
    description: "Eight instant payouts on every unlocked floor",
  },
  curtainCall: {
    label: "Curtain Call",
    color: COLOR.sameBoatCoral,
    image: "crits/showtime/curtainCall.webp",
    description: "Adds 155s of your company's income",
  },
  showgirlStrut: {
    label: "Showgirl Strut",
    color: COLOR.sameBoatCoral,
    image: "crits/showtime/showgirlStrut.webp",
    description: "Adds 156s of your company's income",
  },
} as const satisfies Record<string, FeaturedCritData>;
