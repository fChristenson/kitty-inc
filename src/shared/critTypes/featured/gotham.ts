import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const GOTHAM_CRIT_INFO = {
  iAmTheNight: {
    label: "I Am the Night",
    color: COLOR.fourOfAKindIndigo,
    icon: "iAmTheNight",
    description: "Twenty-seven free upgrades on every unlocked floor",
  },
  tubs: {
    label: "Tubs",
    color: COLOR.rainCheckBlue,
    icon: "tubs",
    description: "Twenty-six instant payouts on this floor",
  },
  whySoSerious: {
    label: "Why So Serious",
    color: COLOR.halloweenSalePurple,
    icon: "whySoSerious",
    description: "Two tier promotions and twenty upgrades here",
  },
  batman: {
    label: "The Dark Knight",
    color: COLOR.black,
    icon: "batman",
    description: "Thirty-eight free upgrades on this floor",
  },
  joker: {
    label: "Joker's Wild",
    color: COLOR.purple,
    icon: "joker",
    description: "Thirty-five instant payouts on every unlocked floor",
  },
  harleyQuinn: {
    label: "Quinn's Whirlwind",
    color: COLOR.springSalePink,
    icon: "harleyQuinn",
    description: "Thirty-two free upgrades on this floor",
  },
  killerCroc: {
    label: "Crocodile Cash",
    color: COLOR.luckyCloverGreen,
    icon: "killerCroc",
    description: "Forty instant payouts on every unlocked floor",
  },
  mrFreeze: {
    label: "Cryo Lock",
    color: COLOR.blue,
    icon: "mrFreeze",
    description: "Thirty-six free upgrades on this floor",
  },
  poisonIvy: {
    label: "Verdant Fortune",
    color: COLOR.luckyCloverGreen,
    icon: "poisonIvy",
    description: "Thirty-four instant payouts on this floor",
  },
  scarecrow: {
    label: "Fear Harvest",
    color: COLOR.teaBreakBrown,
    icon: "scarecrow",
    description: "Thirty free upgrades on this floor",
  },
  thePenguin: {
    label: "Iceberg Payday",
    color: COLOR.blue,
    icon: "thePenguin",
    description: "Twenty-eight instant payouts on this floor",
  },
  theRiddler: {
    label: "Puzzle Box",
    color: COLOR.luckyCloverGreen,
    icon: "theRiddler",
    description: "Twenty-seven free upgrades on this floor",
  },
  bane: {
    label: "Breaking Point",
    color: COLOR.red,
    icon: "bane",
    description: "Forty-two free upgrades on this floor",
  },
  harleyQuinn2: {
    label: "Harley Quinn's Encore",
    color: COLOR.springSalePink,
    icon: "harleyQuinn2",
    description: "Thirty-three instant payouts on this floor",
  },
  killerCroc2: {
    label: "Croc Rampage",
    color: COLOR.luckyCloverGreen,
    icon: "killerCroc2",
    description: "Thirty-nine free upgrades on this floor",
  },
  poisonIvy2: {
    label: "Ivy's Garden",
    color: COLOR.luckyCloverGreen,
    icon: "poisonIvy2",
    description: "Thirty-one free upgrades on this floor",
  },
  poisonIvy3: {
    label: "Venomous Bloom",
    color: COLOR.luckyCloverGreen,
    icon: "poisonIvy3",
    description: "Thirty-seven instant payouts on every unlocked floor",
  },
  thePenguin2: {
    label: "Penguin's Payday",
    color: COLOR.blue,
    icon: "thePenguin2",
    description: "Twenty-nine free upgrades on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
