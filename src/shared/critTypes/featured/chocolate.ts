import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CHOCOLATE_CRITS = {
  cocoaClout: {
    label: "Cocoa Clout",
    color: COLOR.espressoShotBrown,
    image: "crits/chocolate/cocoaClout.webp",
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
    image: "crits/chocolate/shadesOfCocoa.webp",
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
    image: "crits/chocolate/bigMugEnergy.webp",
    description: "Boosts every worker for 120s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.bigMugEnergyBoostSeconds,
        balance.bigMugEnergyExtraWorkers,
      ),
  },
  bonbonBigwig: {
    label: "Bonbon Bigwig",
    color: COLOR.goldStandardAmber,
    image: "crits/chocolate/bonbonBigwig.webp",
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
    image: "crits/chocolate/ganacheGains.webp",
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
    image: "crits/chocolate/hazelnutHedgeFund.webp",
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
    image: "crits/chocolate/spreadTheWealth.webp",
    description: "Adds 98s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.spreadTheWealthSeconds),
  },
  chocolateBarExam: {
    label: "Chocolate Bar Exam",
    color: COLOR.amberMuted,
    image: "crits/chocolate/chocolateBarExam.webp",
    description:
      "Repeats the crit above and below, 44% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "both",
        balance.chocolateBarExamContinueChance,
      ),
  },
  darkChocolateDeal: {
    label: "Dark Chocolate Deal",
    color: COLOR.nightShiftIndigo,
    image: "crits/chocolate/darkChocolateDeal.webp",
    description: "Cuts every price in this building by 10.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.darkChocolateDealDiscount),
  },
  mousseMoxie: {
    label: "Mousse Moxie",
    color: COLOR.teaBreakBrown,
    image: "crits/chocolate/mousseMoxie.webp",
    description: "Raises alternating floors to the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(alternating(context), topLevel(context)),
  },
  rockyRoadRally: {
    label: "Rocky Road Rally",
    color: COLOR.fireDrillRed,
    image: "crits/chocolate/rockyRoadRally.webp",
    description: "Forty-six upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.rockyRoadRallyUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
