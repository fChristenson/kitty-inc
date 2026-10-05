import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const GOOD_LUCK_CRITS = {
  bubbleEconomy: {
    label: "Bubble Economy",
    color: COLOR.snowballBlue,
    image: "crits/goodLuck/bubbleEconomy.webp",
    description: "Seven instant payouts on this floor",
  },
  cloudNineToFive: {
    label: "Cloud Nine to Five",
    color: COLOR.floorShareBlue,
    image: "crits/goodLuck/cloudNineToFive.webp",
    description: "Unlocks the next floor for free",
  },
  luckyLaundromat: {
    label: "Lucky Laundromat",
    color: COLOR.luckyCloverGreen,
    image: "crits/goodLuck/luckyLaundromat.webp",
    description: "Five upgrades and five payouts on every floor",
  },
  moneyMagnet: {
    label: "Money Magnet",
    color: COLOR.red,
    image: "crits/goodLuck/moneyMagnet.webp",
    description: "Adds 3.2% of your total income",
  },
  overTheRainbow: {
    label: "Over the Rainbow",
    color: COLOR.purple,
    image: "crits/goodLuck/overTheRainbow.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  pocketDimension: {
    label: "Pocket Dimension",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/goodLuck/pocketDimension.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  shootingStarEmployee: {
    label: "Shooting Star",
    color: COLOR.starYellow,
    image: "crits/goodLuck/shootingStarEmployee.webp",
    description: "Twenty-three free upgrades on the highest floor",
  },
  treasureMeasure: {
    label: "Treasure Measure",
    color: COLOR.supplyRunTan,
    image: "crits/goodLuck/treasureMeasure.webp",
    description: "Adds 5s of your company's income",
  },
  wishfulBanking: {
    label: "Wishful Banking",
    color: COLOR.goldenTicketYellow,
    image: "crits/goodLuck/wishfulBanking.webp",
    description: "Two tier promotions and twelve upgrades here",
  },
} as const satisfies Record<string, FeaturedCritData>;
