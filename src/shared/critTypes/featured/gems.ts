import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const GEMS_CRIT_INFO = {
  amethyst: {
    label: "Amethyst",
    color: COLOR.purple,
    icon: "amethyst",
    description: "Six instant payouts on this floor",
  },
  diamond: {
    label: "Diamond",
    color: COLOR.cyan,
    icon: "diamond",
    description: "Twenty-four instant payouts on this floor",
  },
  emerald: {
    label: "Emerald",
    color: COLOR.moneyGreen,
    icon: "emerald",
    description: "Nine instant payouts on this floor",
  },
  goldNugget: {
    label: "Gold Nugget",
    color: COLOR.gold,
    icon: "goldNugget",
    description: "Four instant payouts on this floor",
  },
  goldRush: {
    label: "Gold Rush",
    color: COLOR.gold,
    icon: "goldRush",
    description: "Ten instant payouts on every unlocked floor",
  },
  ruby: {
    label: "Ruby",
    color: COLOR.red,
    icon: "ruby",
    description: "Twelve instant payouts on this floor",
  },
  saphire: {
    label: "Sapphire",
    color: COLOR.blue,
    icon: "saphire",
    description: "Eighteen instant payouts on this floor",
  },
  silverRush: {
    label: "Silver Rush",
    color: COLOR.silverTicketGray,
    icon: "silverRush",
    description: "Six instant payouts on every unlocked floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
