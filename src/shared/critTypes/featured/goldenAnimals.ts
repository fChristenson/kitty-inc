import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const GOLDEN_ANIMALS_CRIT_INFO = {
  goldLion: {
    label: "Golden Lion",
    color: COLOR.gold,
    icon: "goldLion",
    description: "Twenty-seven instant payouts on every unlocked floor",
  },
  goldElephant: {
    label: "Golden Elephant",
    color: COLOR.sunshineGold,
    icon: "goldElephant",
    description: "Twenty-eight free upgrades on this floor",
  },
  goldBear: {
    label: "Golden Bear",
    color: COLOR.orange,
    icon: "goldBear",
    description: "Twenty-four instant payouts on every unlocked floor",
  },
  goldWolf: {
    label: "Golden Wolf",
    color: COLOR.blue,
    icon: "goldWolf",
    description: "Twenty-two free upgrades on the highest unlocked floor",
  },
  goldOwl: {
    label: "Golden Owl",
    color: COLOR.luckyCloverGreen,
    icon: "goldOwl",
    description: "Twenty instant payouts on the lowest-level floor",
  },
  goldRam: {
    label: "Golden Ram",
    color: COLOR.starYellow,
    icon: "goldRam",
    description: "Eighteen free upgrades on alternating floors",
  },
  goldRabbit: {
    label: "Golden Rabbit",
    color: COLOR.springSalePink,
    icon: "goldRabbit",
    description: "Thirteen instant payouts on this floor",
  },
  goldCat: {
    label: "Golden Cat",
    color: COLOR.teaBreakBrown,
    icon: "goldCat",
    description: "Fifteen free upgrades on this floor",
  },
  goldenLion: {
    label: "King of the Jungle",
    color: COLOR.heavenlyGold,
    icon: "goldenLion",
    description: "One tier promotion, then twenty free upgrades here",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
