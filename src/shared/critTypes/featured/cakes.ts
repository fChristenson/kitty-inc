import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CAKES_CRITS = {
  blackForestFortune: {
    label: "Black Forest Fortune",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cakes/blackForestFortune.webp",
    description: "Adds 14.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.blackForestFortuneShare),
  },
  redVelvetRope: {
    label: "Red Velvet Rope",
    color: COLOR.red,
    image: "crits/cakes/redVelvetRope.webp",
    description: "One tier promotion and twenty-nine upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.redVelvetRopeTierSteps,
        balance.redVelvetRopeUpgrades,
      ),
  },
  tiramisuTycoon: {
    label: "Tiramisu Tycoon",
    color: COLOR.espressoShotBrown,
    image: "crits/cakes/tiramisuTycoon.webp",
    description: "Adds 83s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.tiramisuTycoonSeconds),
  },
  cheesecakeChairman: {
    label: "Cheesecake Chairman",
    color: COLOR.springSalePink,
    image: "crits/cakes/cheesecakeChairman.webp",
    description: "Fifty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.cheesecakeChairmanUpgrades),
  },
  carrotCakeCapital: {
    label: "Carrot Cake Capital",
    color: COLOR.summerSaleOrange,
    image: "crits/cakes/carrotCakeCapital.webp",
    description: "Adds 20% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.carrotCakeCapitalShare),
  },
  angelFoodAscension: {
    label: "Angel Food Ascension",
    color: COLOR.heavenlyGold,
    image: "crits/cakes/angelFoodAscension.webp",
    description: "Two tier promotions and twenty-four upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.angelFoodAscensionTierSteps,
        balance.angelFoodAscensionUpgrades,
      ),
  },
  poundCakeProfits: {
    label: "Pound Cake Profits",
    color: COLOR.gold,
    image: "crits/cakes/poundCakeProfits.webp",
    description: "Adds 24s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.poundCakeProfitsSeconds),
  },
  bundtFund: {
    label: "Bundt Fund",
    color: COLOR.sunshineGold,
    image: "crits/cakes/bundtFund.webp",
    description: "Cuts every price in this building by 4.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.bundtFundDiscount),
  },
  lavaCakeLiquidity: {
    label: "Lava Cake Liquidity",
    color: COLOR.orange,
    image: "crits/cakes/lavaCakeLiquidity.webp",
    description: "Forty-four payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles(
        [highestFloor(context)],
        balance.lavaCakeLiquidityPayouts,
      ),
  },
  upsideDownUpswing: {
    label: "Upside-Down Upswing",
    color: COLOR.goldenTicketYellow,
    image: "crits/cakes/upsideDownUpswing.webp",
    description: "Forty-three upgrades tumbling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.upsideDownUpswingUpgrades),
  },
  browniePoints: {
    label: "Brownie Points",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cakes/browniePoints.webp",
    description: "Twenty-five upgrades and fifteen payouts on the lowest floor",
    reward: (context, { balance, lowestLevel, upgradeAndPay }) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.browniePointsUpgrades,
        balance.browniePointsPayouts,
      ),
  },
  torteReform: {
    label: "Torte Reform",
    color: COLOR.unionBossSlate,
    image: "crits/cakes/torteReform.webp",
    description: "Forty-three upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.torteReformUpgrades),
  },
  justDesserts: {
    label: "Just Desserts",
    color: COLOR.fullHouseCrimson,
    image: "crits/cakes/justDesserts.webp",
    description: "Hires 2 free workers on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers(context.floors, balance.justDessertsWorkers),
  },
  sweetVerdict: {
    label: "Sweet Verdict",
    color: COLOR.executiveOrderTeal,
    image: "crits/cakes/sweetVerdict.webp",
    description: "Caps every floor's income timer at 0.5s for 15s",
    reward: (context, { actions }) =>
      actions.startEvent(context.floors, "rushHour"),
  },
  operaCakeOverture: {
    label: "Opera Cake Overture",
    color: COLOR.royalFlushPurple,
    image: "crits/cakes/operaCakeOverture.webp",
    description: "Two tier promotions and twenty-six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.operaCakeOvertureTierSteps,
        balance.operaCakeOvertureUpgrades,
      ),
  },
  sacherStockpile: {
    label: "Sacher Stockpile",
    color: COLOR.goldenHandshakeGold,
    image: "crits/cakes/sacherStockpile.webp",
    description: "Adds 41.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sacherStockpileShare),
  },
  tripleLayerTreasury: {
    label: "Triple Layer Treasury",
    color: COLOR.goldStandardAmber,
    image: "crits/cakes/tripleLayerTreasury.webp",
    description: "Thirty-eight upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.tripleLayerTreasuryUpgrades),
  },
  layeredSecurity: {
    label: "Layered Security",
    color: COLOR.silverTicketGray,
    image: "crits/cakes/layeredSecurity.webp",
    description:
      "Repeats the crit above and below, 42% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "both",
        balance.layeredSecurityContinueChance,
      ),
  },
  mississippiMudMillionaire: {
    label: "Mississippi Mud Millionaire",
    color: COLOR.bonusRoundGold,
    image: "crits/cakes/mississippiMudMillionaire.webp",
    description: "Adds 90s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.mississippiMudMillionaireSeconds),
  },
  swissRollRollover: {
    label: "Swiss Roll Rollover",
    color: COLOR.mergerGold,
    image: "crits/cakes/swissRollRollover.webp",
    description:
      "Repeats the crit on the floor above, 56% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "up",
        balance.swissRollRolloverContinueChance,
      ),
  },
  chocolateDripDynamo: {
    label: "Chocolate Drip Dynamo",
    color: COLOR.espressoShotBrown,
    image: "crits/cakes/chocolateDripDynamo.webp",
    description: "Forty-five payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles(
        [lowestLevel(context)],
        balance.chocolateDripDynamoPayouts,
      ),
  },
  marbleCakeMargin: {
    label: "Marble Cake Margin",
    color: COLOR.winterSaleIceBlue,
    image: "crits/cakes/marbleCakeMargin.webp",
    description:
      "Repeats the crit on the floor below, 60% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "down",
        balance.marbleCakeMarginContinueChance,
      ),
  },
  souffleSurplus: {
    label: "Soufflé Surplus",
    color: COLOR.sunshineGold,
    image: "crits/cakes/souffleSurplus.webp",
    description: "Forty-one upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.souffleSurplusUpgrades,
      ),
  },
  onTheRise: {
    label: "On the Rise",
    color: COLOR.grandOpeningRose,
    image: "crits/cakes/onTheRise.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.onTheRiseFloors),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
