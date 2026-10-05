import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const GOTHAM_CRITS = {
  iAmTheNight: {
    label: "I Am the Night",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/gotham/iAmTheNight.webp",
    description: "Hires 1 free worker on this floor",
  },
  tubs: {
    label: "Tubs",
    color: COLOR.rainCheckBlue,
    image: "crits/gotham/tubs.webp",
    description: "Twenty-six instant payouts on this floor",
  },
  whySoSerious: {
    label: "Why So Serious",
    color: COLOR.halloweenSalePurple,
    image: "crits/gotham/whySoSerious.webp",
    description: "Two tier promotions and twenty upgrades here",
  },
  batman: {
    label: "The Dark Knight",
    color: COLOR.black,
    image: "crits/gotham/batman.webp",
    description:
      "Repeats the crit on the floor above, 53% chance to keep climbing",
  },
  joker: {
    label: "Joker's Wild",
    color: COLOR.purple,
    image: "crits/gotham/joker.webp",
    description: "Unlocks the next floor for free",
  },
  harleyQuinn: {
    label: "Quinn's Whirlwind",
    color: COLOR.springSalePink,
    image: "crits/gotham/harleyQuinn.webp",
    description:
      "Repeats the crit on the floor above, 36% chance to keep climbing",
  },
  killerCroc: {
    label: "Crocodile Cash",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/killerCroc.webp",
    description: "Adds 23.7% of your total income",
  },
  mrFreeze: {
    label: "Cryo Lock",
    color: COLOR.blue,
    image: "crits/gotham/mrFreeze.webp",
    description: "Unlocks the next floor for free",
  },
  poisonIvy: {
    label: "Verdant Fortune",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/poisonIvy.webp",
    description: "Adds 10.6% of your total income",
  },
  scarecrow: {
    label: "Fear Harvest",
    color: COLOR.teaBreakBrown,
    image: "crits/gotham/scarecrow.webp",
    description: "Thirty free upgrades on this floor",
  },
  thePenguin: {
    label: "Iceberg Payday",
    color: COLOR.blue,
    image: "crits/gotham/thePenguin.webp",
    description: "Adds 14s of your company's income",
  },
  theRiddler: {
    label: "Puzzle Box",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/theRiddler.webp",
    description: "Free office chairs and supplies for this floor",
  },
  bane: {
    label: "Breaking Point",
    color: COLOR.red,
    image: "crits/gotham/bane.webp",
    description: "Forty-two free upgrades on this floor",
  },
  harleyQuinn2: {
    label: "Harley Quinn's Encore",
    color: COLOR.springSalePink,
    image: "crits/gotham/harleyQuinn2.webp",
    description: "Locks every floor's upgrade price for 5s",
  },
  killerCroc2: {
    label: "Croc Rampage",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/killerCroc2.webp",
    description: "Boosts every worker for 31s",
  },
  poisonIvy2: {
    label: "Ivy's Garden",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/poisonIvy2.webp",
    description: "Thirty-one free upgrades on this floor",
  },
  poisonIvy3: {
    label: "Venomous Bloom",
    color: COLOR.luckyCloverGreen,
    image: "crits/gotham/poisonIvy3.webp",
    description: "Thirty-seven instant payouts on every unlocked floor",
  },
  thePenguin2: {
    label: "Penguin's Payday",
    color: COLOR.blue,
    image: "crits/gotham/thePenguin2.webp",
    description: "Adds 7.2% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
