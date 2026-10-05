import type { DESSERTS_CRITS } from "../../critData/desserts";
import type { FeaturedRewards } from "./types";

export const DESSERTS_REWARDS = {
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
} satisfies FeaturedRewards<typeof DESSERTS_CRITS>;
