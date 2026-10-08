import type { CAKES_CRITS } from "../critData/cakes";
import type { FeaturedRewards } from "./types";

export const CAKES_REWARDS = {
  blackForestFortune: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blackForestFortuneShare),
  redVelvetRope: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.redVelvetRopeTierSteps,
      balance.redVelvetRopeUpgrades,
    ),
  tiramisuTycoon: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.tiramisuTycoonSeconds),
  cheesecakeChairman: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.cheesecakeChairmanUpgrades),
  carrotCakeCapital: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.carrotCakeCapitalShare),
  angelFoodAscension: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.angelFoodAscensionTierSteps,
      balance.angelFoodAscensionUpgrades,
    ),
  poundCakeProfits: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.poundCakeProfitsSeconds),
  bundtFund: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bundtFundDiscount),
  lavaCakeLiquidity: (context, { actions, balance, highestFloor }) =>
    actions.payCycles(
      [highestFloor(context)],
      balance.lavaCakeLiquidityPayouts,
    ),
  upsideDownUpswing: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.upsideDownUpswingUpgrades),
  browniePoints: (context, { balance, lowestLevel, upgradeAndPay }) =>
    upgradeAndPay(
      [lowestLevel(context)],
      balance.browniePointsUpgrades,
      balance.browniePointsPayouts,
    ),
  torteReform: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.torteReformUpgrades),
  justDesserts: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.justDessertsWorkers),
  sweetVerdict: (context, { actions }) =>
    actions.startEvent(context.floors, "rushHour"),
  operaCakeOverture: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.operaCakeOvertureTierSteps,
      balance.operaCakeOvertureUpgrades,
    ),
  sacherStockpile: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sacherStockpileShare),
  tripleLayerTreasury: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.tripleLayerTreasuryUpgrades),
  layeredSecurity: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.layeredSecurityContinueChance,
    ),
  mississippiMudMillionaire: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.mississippiMudMillionaireSeconds),
  swissRollRollover: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "up",
      balance.swissRollRolloverContinueChance,
    ),
  chocolateDripDynamo: (context, { actions, balance, lowestLevel }) =>
    actions.payCycles(
      [lowestLevel(context)],
      balance.chocolateDripDynamoPayouts,
    ),
  marbleCakeMargin: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "down",
      balance.marbleCakeMarginContinueChance,
    ),
  souffleSurplus: (context, { actions, balance }) =>
    actions.upgrade(
      context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
      balance.souffleSurplusUpgrades,
    ),
  onTheRise: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.onTheRiseFloors),
} satisfies FeaturedRewards<typeof CAKES_CRITS>;
