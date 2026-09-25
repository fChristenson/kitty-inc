import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const SHOWTIME_CRIT_INFO = {
  ballerina: {
    label: "Pirouette",
    color: COLOR.peppermintPink,
    icon: "ballerina",
    description: "Three free upgrades and three payouts on this floor",
  },
  cowboy: {
    label: "Roundup Rodeo",
    color: COLOR.gold,
    icon: "cowboy",
    description: "Eight free upgrades on the lowest-level floor",
  },
  dinnerTime: {
    label: "Dinner Time",
    color: COLOR.moneyGreen,
    icon: "dinnerTime",
    description: "Five instant payouts on every unlocked floor",
  },
  fingerGuns: {
    label: "Finger Guns",
    color: COLOR.blue,
    icon: "fingerGuns",
    description: "Two upgrades here and two on the highest floor",
  },
  flamenco: {
    label: "Flamenco",
    color: COLOR.red,
    icon: "flamenco",
    description: "Seven free upgrades on every unlocked floor",
  },
  milestone: {
    label: "Milestone",
    color: COLOR.cyan,
    icon: "milestone",
    description: "Raises this floor to the next multiple of 25",
  },
  moonwalker: {
    label: "Moonwalk",
    color: COLOR.silverTicketGray,
    icon: "moonwalker",
    description: "Six upgrades on this floor and every floor below",
  },
  ninja: {
    label: "Ninja Bonus",
    color: COLOR.nightShiftIndigo,
    icon: "ninja",
    description: "Twelve free upgrades on this floor",
  },
  obelisk: {
    label: "Obelisk",
    color: COLOR.mysticTeal,
    icon: "obelisk",
    description: "Two tier promotions and two upgrades on this floor",
  },
  sharpShooter: {
    label: "Sharpshooter",
    color: COLOR.starYellow,
    icon: "sharpShooter",
    description: "Ten payouts from the highest-earning floor",
  },
  space: {
    label: "Space Race",
    color: COLOR.orange,
    icon: "space",
    description: "Twenty free upgrades on the highest unlocked floor",
  },
  yesChef: {
    label: "Yes, Chef",
    color: COLOR.blue,
    icon: "yesChef",
    description: "Eight instant payouts on every unlocked floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
