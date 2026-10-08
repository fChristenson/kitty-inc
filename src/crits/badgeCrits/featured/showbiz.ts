import type { SHOWBIZ_CRITS } from "../critData/showbiz";
import type { FeaturedRewards } from "./types";

export const SHOWBIZ_REWARDS = {
  bombshellBrawn: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bombshellBrawnShare),
  chromeCoquette: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.chromeCoquetteShare),
  crimsonCascade: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.crimsonCascadeShare),
  eveningStrut: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.eveningStrutShare),
  flamencoFlare: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.flamencoFlareShare),
  garnetGlamour: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.garnetGlamourShare),
  leggyElegance: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.leggyEleganceShare),
  muscleMuse: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.muscleMuseShare),
  roseRecline: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.roseReclineShare),
  ruffleTwirl: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.ruffleTwirlSeconds),
  scarletStrength: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.scarletStrengthSeconds),
  starletSwoon: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.starletSwoonSeconds),
  ballerina: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  cowboy: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.cowboyUpgrades),
  dinnerTime: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.dinnerTimePayouts),
  fingerGuns: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  flamenco: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.flamencoBoostSeconds,
      balance.flamencoExtraWorkers,
    ),
  milestone: (context, { actions, balance }) => {
    const count =
      balance.milestoneStep -
      (context.floor.upgradeCount % balance.milestoneStep);
    actions.upgrade([context.floor], count);
  },
  moonwalker: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.moonwalkerBoostSeconds,
      balance.moonwalkerExtraWorkers,
    ),
  ninja: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.ninjaBoostSeconds,
      balance.ninjaExtraWorkers,
    ),
  obelisk: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.obeliskTierSteps,
      balance.obeliskUpgrades,
    ),
  sharpShooter: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.sharpShooterBoostSeconds,
      balance.sharpShooterExtraWorkers,
    ),
  space: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.spaceUpgrades),
  yesChef: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.yesChefPayouts),
  curtainCall: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.curtainCallSeconds),
  showgirlStrut: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.showgirlStrutSeconds),
  backToTheFiscal: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  despicableFees: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.despicableFeesWorkers),
  howToTrainYourManager: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.howToTrainYourManagerDiscount,
    ),
  jurassicPerk: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.jurassicPerkPayouts),
  raidersOfTheLostReceipt: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.raidersOfTheLostReceiptDiscount,
    ),
  theDevilWearsPawda: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  theExpenseMatrix: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.theExpenseMatrixContinueChance),
  theFastAndTheFurriest: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.theFastAndTheFurriestBoostSeconds,
      balance.theFastAndTheFurriestExtraWorkers,
    ),
  theFellowshipOfTheBling: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.theFellowshipOfTheBlingShare),
  theGreatCatsby: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.theGreatCatsbyTierSteps,
      balance.theGreatCatsbyUpgrades,
    ),
  theLordOfTheRingBinders: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  wreckIt: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.wreckItUpgrades),
} satisfies FeaturedRewards<typeof SHOWBIZ_CRITS>;
