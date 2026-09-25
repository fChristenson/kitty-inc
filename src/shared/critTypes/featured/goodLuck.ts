import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const GOOD_LUCK_CRIT_INFO = {
  bubbleEconomy: {
    label: "Bubble Economy",
    color: COLOR.snowballBlue,
    icon: "bubbleEconomy",
    description: "Seven instant payouts on this floor",
  },
  cloudNineToFive: {
    label: "Cloud Nine to Five",
    color: COLOR.floorShareBlue,
    icon: "cloudNineToFive",
    description: "Nine instant payouts on every unlocked floor",
  },
  luckyLaundromat: {
    label: "Lucky Laundromat",
    color: COLOR.luckyCloverGreen,
    icon: "luckyLaundromat",
    description: "Five upgrades and five payouts on every floor",
  },
  moneyMagnet: {
    label: "Money Magnet",
    color: COLOR.red,
    icon: "moneyMagnet",
    description: "Fourteen payouts from the highest-earning floor",
  },
  overTheRainbow: {
    label: "Over the Rainbow",
    color: COLOR.purple,
    icon: "overTheRainbow",
    description: "Fifteen payouts on alternating floors, from the ground",
  },
  pocketDimension: {
    label: "Pocket Dimension",
    color: COLOR.fourOfAKindIndigo,
    icon: "pocketDimension",
    description: "Eighteen upgrades on this floor and every floor below",
  },
  shootingStarEmployee: {
    label: "Shooting Star",
    color: COLOR.starYellow,
    icon: "shootingStarEmployee",
    description: "Twenty-three free upgrades on the highest floor",
  },
  treasureMeasure: {
    label: "Treasure Measure",
    color: COLOR.supplyRunTan,
    icon: "treasureMeasure",
    description: "Ten free upgrades on the lowest-level floor",
  },
  wishfulBanking: {
    label: "Wishful Banking",
    color: COLOR.goldenTicketYellow,
    icon: "wishfulBanking",
    description: "Two tier promotions and twelve upgrades here",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
