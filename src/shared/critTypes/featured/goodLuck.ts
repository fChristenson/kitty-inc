import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GOOD_LUCK_CRITS = {
  bubbleEconomy: {
    label: "Bubble Economy",
    color: COLOR.snowballBlue,
    image: "crits/goodLuck/bubbleEconomy.png",
    description: "Seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.bubbleEconomyPayouts),
  },
  cloudNineToFive: {
    label: "Cloud Nine to Five",
    color: COLOR.floorShareBlue,
    image: "crits/goodLuck/cloudNineToFive.png",
    description: "Nine instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.cloudNineToFivePayouts),
  },
  luckyLaundromat: {
    label: "Lucky Laundromat",
    color: COLOR.luckyCloverGreen,
    image: "crits/goodLuck/luckyLaundromat.png",
    description: "Five upgrades and five payouts on every floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.luckyLaundromatUpgrades);
      actions.payCycles(context.floors, balance.luckyLaundromatPayouts);
    },
  },
  moneyMagnet: {
    label: "Money Magnet",
    color: COLOR.red,
    image: "crits/goodLuck/moneyMagnet.png",
    description: "Fourteen payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.moneyMagnetPayouts,
      ),
  },
  overTheRainbow: {
    label: "Over the Rainbow",
    color: COLOR.purple,
    image: "crits/goodLuck/overTheRainbow.png",
    description: "Fifteen payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.overTheRainbowPayouts),
  },
  pocketDimension: {
    label: "Pocket Dimension",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/goodLuck/pocketDimension.png",
    description: "Eighteen upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.pocketDimensionUpgrades,
      ),
  },
  shootingStarEmployee: {
    label: "Shooting Star",
    color: COLOR.starYellow,
    image: "crits/goodLuck/shootingStarEmployee.png",
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
    image: "crits/goodLuck/treasureMeasure.png",
    description: "Ten free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.treasureMeasureUpgrades),
  },
  wishfulBanking: {
    label: "Wishful Banking",
    color: COLOR.goldenTicketYellow,
    image: "crits/goodLuck/wishfulBanking.png",
    description: "Two tier promotions and twelve upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.wishfulBankingTierSteps,
        balance.wishfulBankingUpgrades,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
