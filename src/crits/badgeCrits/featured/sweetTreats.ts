import type { SWEET_TREATS_CRITS } from "../critData/sweetTreats";
import type { FeaturedRewards } from "./types";

export const SWEET_TREATS_REWARDS = {
  berryParfait: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.berryParfaitPayouts),
  lemonTart: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.lemonTartContinueChance),
  berryShortcake: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.berryShortcakePayouts),
  cinnamonSwirl: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  chocolateCake: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.chocolateCakeContinueChance),
  strawberryShortcake: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.strawberryShortcakePayouts),
  rainbowDonut: (context, { actions, highestFloor }) =>
    actions.armCrit([highestFloor(context)], "crit"),
  iceCreamSundae: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.iceCreamSundaeDiscount),
  iceCreamSundae2: (context, { actions, balance }) =>
    actions.boostWorkers([context.floor], balance.iceCreamSundae2BoostSeconds, balance.iceCreamSundae2ExtraWorkers),
  macaronTower: (context, { actions, lowestLevel }) =>
    actions.armCrit([lowestLevel(context)], "crit"),
  macaronTower2: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.macaronTower2TierSteps,
      balance.macaronTower2Upgrades,
    ),
  apple: (context, { actions, balance, lowestLevel }) =>
    actions.payCycles([lowestLevel(context)], balance.applePayouts),
  cupcake: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.cupcakeUpgrades),
  donut: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.donutPayouts),
  berryCreamTray: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.berryCreamTrayBoostSeconds, balance.berryCreamTrayExtraWorkers),
  brownieBunch: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.brownieBunchBoostSeconds, balance.brownieBunchExtraWorkers),
  chocolateSpreadMorning: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.chocolateSpreadMorningBoostSeconds, balance.chocolateSpreadMorningExtraWorkers),
  macaronMedley: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.macaronMedleyBoostSeconds, balance.macaronMedleyExtraWorkers),
  pinkFrostingTrio: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.pinkFrostingTrioBoostSeconds, balance.pinkFrostingTrioExtraWorkers),
  cocoaClout: (context, { balance, upgradeAndPay }) =>
    upgradeAndPay(
      [context.floor],
      balance.cocoaCloutUpgrades,
      balance.cocoaCloutPayouts,
    ),
  shadesOfCocoa: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.shadesOfCocoaPayouts,
    ),
  bigMugEnergy: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.bigMugEnergyBoostSeconds,
      balance.bigMugEnergyExtraWorkers,
    ),
  bonbonBigwig: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.bonbonBigwigTierSteps,
      balance.bonbonBigwigUpgrades,
    ),
  ganacheGains: (context, { actions, balance }) =>
    actions.upgrade(
      context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
      balance.ganacheGainsUpgrades,
    ),
  hazelnutHedgeFund: (context, { actions, balance, lowestLevel }) => {
    const lowest = lowestLevel(context);
    actions.upgrade([context.floor], balance.hazelnutHedgeFundUpgrades);
    if (lowest !== context.floor)
      actions.upgrade([lowest], balance.hazelnutHedgeFundUpgrades);
  },
  spreadTheWealth: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.spreadTheWealthSeconds),
  chocolateBarExam: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.chocolateBarExamContinueChance,
    ),
  darkChocolateDeal: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.darkChocolateDealDiscount),
  mousseMoxie: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  rockyRoadRally: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.rockyRoadRallyUpgrades),
} satisfies FeaturedRewards<typeof SWEET_TREATS_CRITS>;
