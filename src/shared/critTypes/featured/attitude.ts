import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const ATTITUDE_CRIT_INFO = {
  goldenSkull: {
    label: "Golden Skull",
    color: COLOR.gold,
    icon: "goldenSkull",
    description: "Thirteen free upgrades, then nineteen payouts on this floor",
  },
  lordOfMurder: {
    label: "Lord of Murder",
    color: COLOR.red,
    icon: "lordOfMurder",
    description: "Eight upgrades, then six payouts on every unlocked floor",
  },
  speedDemon: {
    label: "Speed Demon",
    color: COLOR.cyan,
    icon: "speedDemon",
    description:
      "Eleven upgrades, then seventeen payouts on the highest-earning floor",
  },
  badonkadonk: {
    label: "Badonkadonk",
    color: COLOR.gold,
    icon: "badonkadonk",
    description: "Ten free upgrades, then twelve payouts on this floor",
  },
  demonicBuns: {
    label: "Demonic Buns",
    color: COLOR.red,
    icon: "demoncBuns",
    description: "Sixteen free upgrades, then twenty-one payouts on this floor",
  },
  infernalInterest: {
    label: "Infernal Wagon",
    color: COLOR.orange,
    icon: "infernalInterest",
    description:
      "Twenty free upgrades, then twenty-seven payouts on this floor",
  },
  dropItLow: {
    label: "Drop It Low",
    color: COLOR.cyan,
    icon: "dropItLow",
    description: "Nine upgrades, then five payouts on the lowest-level floor",
  },
  kittyWagon: {
    label: "Kitty Wagon",
    color: COLOR.moneyGreen,
    icon: "kittyWagon",
    description: "Three upgrades, then two payouts on every unlocked floor",
  },
  madeYouLook: {
    label: "Made You Look",
    color: COLOR.peppermintPink,
    icon: "madeYouLook",
    description: "Six free upgrades, then seven payouts on this floor",
  },
  wagonWarrior: {
    label: "Wagon Warrior",
    color: COLOR.silverTicketGray,
    icon: "wagonWarrior",
    description: "Five upgrades, then three payouts on every unlocked floor",
  },
  bubbleButt: {
    label: "Bubble Butt",
    color: COLOR.orange,
    icon: "bubbleButt",
    description: "Eight free upgrades, then nine payouts on this floor",
  },
  canNotLie: {
    label: "Can Not Lie",
    color: COLOR.moneyGreen,
    icon: "canNotLie",
    description: "Twelve free upgrades, then fifteen payouts on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
