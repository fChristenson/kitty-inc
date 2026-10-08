import type { BAKERY_CRITS } from "../critData/bakery";
import type { FeaturedRewards } from "./types";

export const BAKERY_REWARDS = {
  butterCroissant: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.butterCroissantFloors),
  almondEncore: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  babkaRhapsody: (context, { actions, balance, alternating }) =>
    actions.upgrade(alternating(context), balance.babkaRhapsodyUpgrades),
  bagelBoulevard: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.bagelBoulevardContinueChance),
  baguetteBaton: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.baguetteBatonUpgrades),
  briocheBonanza: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.briocheBonanzaBoostSeconds,
      balance.briocheBonanzaExtraWorkers,
    ),
  breadWinner: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.breadWinnerDiscount),
  challahCharm: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.challahCharmTierSteps,
      balance.challahCharmUpgrades,
    ),
  chouxBusiness: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.chouxBusinessDiscount),
  cinnamonSpin: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.cinnamonSpinContinueChance),
  icingOnTheBun: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.icingOnTheBunPayouts),
  cruffinSummit: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.cruffinSummitFloors),
  custardCrown: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.custardCrownTierSteps,
      balance.custardCrownUpgrades,
    ),
  danishDaydream: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.danishDaydreamPayouts),
  eclairFlair: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.eclairFlairDiscount),
  focacciaFiesta: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(lowestLevel(context), balance.focacciaFiestaTierSteps, balance.focacciaFiestaUpgrades),
  jamSession: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.jamSessionPayouts),
  sconeWithTheWind: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  knotYourAverage: (context, { actions, balance, highestFloor }) => {
    const highest = highestFloor(context);
    actions.upgrade([context.floor], balance.knotYourAverageUpgrades);
    if (highest !== context.floor)
      actions.upgrade([highest], balance.knotYourAverageUpgrades);
  },
  naanStop: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.naanStopPayouts),
  palmierParade: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.palmierParadeUpgrades),
  pistachioPalace: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.pistachioPalaceWorkers);
    actions.hireManagers(context.floors);
  },
  pitaPocketPayday: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pitaPocketPaydayShare),
  ryeOnThePrize: (context, { actions, balance, alternating }) =>
    actions.hireWorkers(alternating(context), balance.ryeOnThePrizeWorkers),
  shokupanCloud: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.shokupanCloudFloors),
  sourdoughSunrise: (context, { actions, balance, lowestLevel }) =>
    actions.payCycles(
      [lowestLevel(context)],
      balance.sourdoughSunrisePayouts,
    ),
  strudelCuddle: (context, { balance, lowestLevel, upgradeAndPay }) =>
    upgradeAndPay(
      [lowestLevel(context)],
      balance.strudelCuddleUpgrades,
      balance.strudelCuddlePayouts,
    ),
  appleOfMyEye: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.appleOfMyEyePayouts),
  turnoverTreasure: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.turnoverTreasureShare),
} satisfies FeaturedRewards<typeof BAKERY_CRITS>;
