import type { MAFIA_CRITS } from "../../critData/mafia";
import type { FeaturedRewards } from "./types";

export const MAFIA_REWARDS = {
  theCatfather: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.theCatfatherTierSteps,
      balance.theCatfatherUpgrades,
    ),
  unrefusableOffer: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.unrefusableOfferPayouts,
    ),
  briefcaseBonus: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.briefcaseBonusDiscount),
  violinCaseCaper: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.violinCaseCaperPayouts),
  technicolorTake: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.technicolorTakePayouts),
  stringsAttached: (context, { actions, balance, alternating }) =>
    actions.upgrade(alternating(context), balance.stringsAttachedUpgrades),
  fiddlesticksFund: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.fiddlesticksFundFloors),
  fedoraFlex: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.fedoraFlexBoostSeconds,
      balance.fedoraFlexExtraWorkers,
    ),
  brimTipper: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.brimTipperBoostSeconds,
      balance.brimTipperExtraWorkers,
    ),
  greenbackFan: (context, { balance, selectByRate, upgradeAndPay }) =>
    upgradeAndPay(
      [selectByRate(context, true)],
      balance.greenbackFanUpgrades,
      balance.greenbackFanPayouts,
    ),
  craftyConsigliere: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.craftyConsigliereDiscount),
  cappuccinoCapo: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  demitasseDues: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.demitasseDuesDiscount),
  latteLoyalty: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  takeTheCannoli: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.takeTheCannoliDiscount),
  speakeasyStash: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.speakeasyStashFloors),
  passwordPlease: (context, { actions, balance, highestFloor }) =>
    actions.payCycles([highestFloor(context)], balance.passwordPleasePayouts),
  hiddenDoorHaul: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.hiddenDoorHaulFloors),
  pinstripePension: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.pinstripePensionWorkers);
    actions.hireManagers(context.floors);
  },
  lipsSealed: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, false)],
      balance.lipsSealedPayouts,
    ),
  protectionRacket: (context, { actions, balance, highestFloor, hereAnd }) =>
    actions.upgrade(
      hereAnd(context, highestFloor(context)),
      balance.protectionRacketUpgrades,
    ),
  runningBoardRiches: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.runningBoardRichesUpgrades),
  sundaySauceSitdown: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.sundaySauceSitdownBoostSeconds,
      balance.sundaySauceSitdownExtraWorkers,
    ),
  kissTheRing: (context, { balance, selectByRate, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.kissTheRingTierSteps,
      balance.kissTheRingUpgrades,
    ),
  bootlegBarrel: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.bootlegBarrelContinueChance),
  wiseguySwagger: (context, { actions, balance, selectByRate, hereAnd }) =>
    actions.upgrade(
      hereAnd(context, selectByRate(context, false)),
      balance.wiseguySwaggerUpgrades,
    ),
  dontWorryAboutIt: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.dontWorryAboutItWorkers),
  mindYourOwnBusiness: (context, { actions, alternating }) =>
    actions.hireManagers(alternating(context)),
} satisfies FeaturedRewards<typeof MAFIA_CRITS>;
