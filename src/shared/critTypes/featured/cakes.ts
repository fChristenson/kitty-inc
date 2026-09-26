import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CAKES_CRITS = {
  blackForestFortune: {
    label: "Black Forest Fortune",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cakes/blackForestFortune.png",
    description: "Eighteen upgrades and twenty-four payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.blackForestFortuneUpgrades,
        balance.blackForestFortunePayouts,
      ),
  },
  redVelvetRope: {
    label: "Red Velvet Rope",
    color: COLOR.red,
    image: "crits/cakes/redVelvetRope.png",
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
    image: "crits/cakes/tiramisuTycoon.png",
    description: "Twenty-four upgrades and twenty-one payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.tiramisuTycoonUpgrades,
        balance.tiramisuTycoonPayouts,
      ),
  },
  cheesecakeChairman: {
    label: "Cheesecake Chairman",
    color: COLOR.springSalePink,
    image: "crits/cakes/cheesecakeChairman.png",
    description: "Fifty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.cheesecakeChairmanUpgrades),
  },
  carrotCakeCapital: {
    label: "Carrot Cake Capital",
    color: COLOR.summerSaleOrange,
    image: "crits/cakes/carrotCakeCapital.png",
    description: "Twenty-three upgrades and seventeen payouts on the lowest floor",
    reward: (context, { balance, lowestLevel, upgradeAndPay }) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.carrotCakeCapitalUpgrades,
        balance.carrotCakeCapitalPayouts,
      ),
  },
  angelFoodAscension: {
    label: "Angel Food Ascension",
    color: COLOR.heavenlyGold,
    image: "crits/cakes/angelFoodAscension.png",
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
    image: "crits/cakes/poundCakeProfits.png",
    description: "Forty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.poundCakeProfitsPayouts),
  },
  bundtFund: {
    label: "Bundt Fund",
    color: COLOR.sunshineGold,
    image: "crits/cakes/bundtFund.png",
    description: "Thirty-nine payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.bundtFundPayouts),
  },
  lavaCakeLiquidity: {
    label: "Lava Cake Liquidity",
    color: COLOR.orange,
    image: "crits/cakes/lavaCakeLiquidity.png",
    description: "Forty-four payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.lavaCakeLiquidityPayouts),
  },
  upsideDownUpswing: {
    label: "Upside-Down Upswing",
    color: COLOR.goldenTicketYellow,
    image: "crits/cakes/upsideDownUpswing.png",
    description: "Forty-three upgrades tumbling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.upsideDownUpswingUpgrades),
  },
  browniePoints: {
    label: "Brownie Points",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cakes/browniePoints.png",
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
    image: "crits/cakes/torteReform.png",
    description: "Forty-three upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.torteReformUpgrades),
  },
  justDesserts: {
    label: "Just Desserts",
    color: COLOR.fullHouseCrimson,
    image: "crits/cakes/justDesserts.png",
    description: "Twenty-six upgrades and twenty-two payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.justDessertsUpgrades,
        balance.justDessertsPayouts,
      ),
  },
  sweetVerdict: {
    label: "Sweet Verdict",
    color: COLOR.executiveOrderTeal,
    image: "crits/cakes/sweetVerdict.png",
    description: "Forty-four payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.sweetVerdictPayouts,
      ),
  },
  operaCakeOverture: {
    label: "Opera Cake Overture",
    color: COLOR.royalFlushPurple,
    image: "crits/cakes/operaCakeOverture.png",
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
    image: "crits/cakes/sacherStockpile.png",
    description: "Forty-seven payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.sacherStockpilePayouts),
  },
  tripleLayerTreasury: {
    label: "Triple Layer Treasury",
    color: COLOR.goldStandardAmber,
    image: "crits/cakes/tripleLayerTreasury.png",
    description: "Thirty-eight upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.tripleLayerTreasuryUpgrades),
  },
  layeredSecurity: {
    label: "Layered Security",
    color: COLOR.silverTicketGray,
    image: "crits/cakes/layeredSecurity.png",
    description: "Twenty-five upgrades and twenty-three payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.layeredSecurityUpgrades,
        balance.layeredSecurityPayouts,
      ),
  },
  mississippiMudMillionaire: {
    label: "Mississippi Mud Millionaire",
    color: COLOR.bonusRoundGold,
    image: "crits/cakes/mississippiMudMillionaire.png",
    description: "Forty-six payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.mississippiMudMillionairePayouts,
      ),
  },
  swissRollRollover: {
    label: "Swiss Roll Rollover",
    color: COLOR.mergerGold,
    image: "crits/cakes/swissRollRollover.png",
    description: "Forty-one payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.swissRollRolloverPayouts),
  },
  chocolateDripDynamo: {
    label: "Chocolate Drip Dynamo",
    color: COLOR.espressoShotBrown,
    image: "crits/cakes/chocolateDripDynamo.png",
    description: "Forty-five payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.chocolateDripDynamoPayouts),
  },
  marbleCakeMargin: {
    label: "Marble Cake Margin",
    color: COLOR.winterSaleIceBlue,
    image: "crits/cakes/marbleCakeMargin.png",
    description: "Forty upgrades here and on the highest floor",
    reward: (context, { actions, balance, highestFloor }) => {
      const highest = highestFloor(context);
      actions.upgrade([context.floor], balance.marbleCakeMarginUpgrades);
      if (highest !== context.floor)
        actions.upgrade([highest], balance.marbleCakeMarginUpgrades);
    },
  },
  souffleSurplus: {
    label: "Soufflé Surplus",
    color: COLOR.sunshineGold,
    image: "crits/cakes/souffleSurplus.png",
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
    image: "crits/cakes/onTheRise.png",
    description: "Forty-nine upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.onTheRiseUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
