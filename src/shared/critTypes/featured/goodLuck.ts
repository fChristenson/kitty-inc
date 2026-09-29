import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GOOD_LUCK_CRITS = {
  bubbleEconomy: {
    label: "Bubble Economy",
    color: COLOR.snowballBlue,
    image: "crits/goodLuck/bubbleEconomy.webp",
    description: "Seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.bubbleEconomyPayouts),
  },
  cloudNineToFive: {
    label: "Cloud Nine to Five",
    color: COLOR.floorShareBlue,
    image: "crits/goodLuck/cloudNineToFive.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.cloudNineToFiveFloors),
  },
  luckyLaundromat: {
    label: "Lucky Laundromat",
    color: COLOR.luckyCloverGreen,
    image: "crits/goodLuck/luckyLaundromat.webp",
    description: "Five upgrades and five payouts on every floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.luckyLaundromatUpgrades);
      actions.payCycles(context.floors, balance.luckyLaundromatPayouts);
    },
  },
  moneyMagnet: {
    label: "Money Magnet",
    color: COLOR.red,
    image: "crits/goodLuck/moneyMagnet.webp",
    description: "Adds 3.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.moneyMagnetShare),
  },
  overTheRainbow: {
    label: "Over the Rainbow",
    color: COLOR.purple,
    image: "crits/goodLuck/overTheRainbow.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  pocketDimension: {
    label: "Pocket Dimension",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/goodLuck/pocketDimension.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  shootingStarEmployee: {
    label: "Shooting Star",
    color: COLOR.starYellow,
    image: "crits/goodLuck/shootingStarEmployee.webp",
    description: "Twenty-three free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.shootingStarEmployeeUpgrades,
      ),
  },
  treasureMeasure: {
    label: "Treasure Measure",
    color: COLOR.supplyRunTan,
    image: "crits/goodLuck/treasureMeasure.webp",
    description: "Adds 5s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.treasureMeasureSeconds),
  },
  wishfulBanking: {
    label: "Wishful Banking",
    color: COLOR.goldenTicketYellow,
    image: "crits/goodLuck/wishfulBanking.webp",
    description: "Two tier promotions and twelve upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.wishfulBankingTierSteps,
        balance.wishfulBankingUpgrades,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
