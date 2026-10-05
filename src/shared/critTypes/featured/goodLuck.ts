import type { GOOD_LUCK_CRITS } from "../../critData/goodLuck";
import type { FeaturedRewards } from "./types";

export const GOOD_LUCK_REWARDS = {
  bubbleEconomy: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.bubbleEconomyPayouts),
  cloudNineToFive: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.cloudNineToFiveFloors),
  luckyLaundromat: (context, { actions, balance }) => {
    actions.upgrade(context.floors, balance.luckyLaundromatUpgrades);
    actions.payCycles(context.floors, balance.luckyLaundromatPayouts);
  },
  moneyMagnet: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.moneyMagnetShare),
  overTheRainbow: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  pocketDimension: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  shootingStarEmployee: (context, { actions, balance, highestFloor }) =>
    actions.upgrade(
      [highestFloor(context)],
      balance.shootingStarEmployeeUpgrades,
    ),
  treasureMeasure: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.treasureMeasureSeconds),
  wishfulBanking: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.wishfulBankingTierSteps,
      balance.wishfulBankingUpgrades,
    ),
} satisfies FeaturedRewards<typeof GOOD_LUCK_CRITS>;
