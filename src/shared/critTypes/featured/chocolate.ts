import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CHOCOLATE_CRITS = {
  cocoaClout: {
    label: "Cocoa Clout",
    color: COLOR.espressoShotBrown,
    image: "crits/chocolate/cocoaClout.png",
    description: "Twenty-two upgrades and twenty payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.cocoaCloutUpgrades,
        balance.cocoaCloutPayouts,
      ),
  },
  shadesOfCocoa: {
    label: "Shades of Cocoa",
    color: COLOR.fastForwardBlue,
    image: "crits/chocolate/shadesOfCocoa.png",
    description: "Forty-three payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.shadesOfCocoaPayouts,
      ),
  },
  bigMugEnergy: {
    label: "Big Mug Energy",
    color: COLOR.blue,
    image: "crits/chocolate/bigMugEnergy.png",
    description: "Thirty-six upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.bigMugEnergyUpgrades),
  },
  bonbonBigwig: {
    label: "Bonbon Bigwig",
    color: COLOR.goldStandardAmber,
    image: "crits/chocolate/bonbonBigwig.png",
    description: "One tier promotion and thirty-one upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.bonbonBigwigTierSteps,
        balance.bonbonBigwigUpgrades,
      ),
  },
  ganacheGains: {
    label: "Ganache Gains",
    color: COLOR.chairGiveawayBrown,
    image: "crits/chocolate/ganacheGains.png",
    description: "Thirty-nine upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.ganacheGainsUpgrades,
      ),
  },
  hazelnutHedgeFund: {
    label: "Hazelnut Hedge Fund",
    color: COLOR.autumnSaleAmber,
    image: "crits/chocolate/hazelnutHedgeFund.png",
    description: "Thirty-four upgrades here and on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      const lowest = lowestLevel(context);
      actions.upgrade([context.floor], balance.hazelnutHedgeFundUpgrades);
      if (lowest !== context.floor)
        actions.upgrade([lowest], balance.hazelnutHedgeFundUpgrades);
    },
  },
  spreadTheWealth: {
    label: "Spread the Wealth",
    color: COLOR.goldenHandshakeGold,
    image: "crits/chocolate/spreadTheWealth.png",
    description: "Forty-five payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.spreadTheWealthPayouts),
  },
  chocolateBarExam: {
    label: "Chocolate Bar Exam",
    color: COLOR.amberMuted,
    image: "crits/chocolate/chocolateBarExam.png",
    description: "Forty-two free upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.chocolateBarExamUpgrades),
  },
  darkChocolateDeal: {
    label: "Dark Chocolate Deal",
    color: COLOR.nightShiftIndigo,
    image: "crits/chocolate/darkChocolateDeal.png",
    description: "Forty-four upgrades on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.darkChocolateDealUpgrades),
  },
  mousseMoxie: {
    label: "Mousse Moxie",
    color: COLOR.teaBreakBrown,
    image: "crits/chocolate/mousseMoxie.png",
    description: "Forty-seven upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.mousseMoxieUpgrades),
  },
  rockyRoadRally: {
    label: "Rocky Road Rally",
    color: COLOR.fireDrillRed,
    image: "crits/chocolate/rockyRoadRally.png",
    description: "Forty-six upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.rockyRoadRallyUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
