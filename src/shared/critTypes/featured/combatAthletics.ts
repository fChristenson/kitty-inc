import type { COMBAT_ATHLETICS_CRITS } from "../../critData/combatAthletics";
import type { FeaturedRewards } from "./types";

export const COMBAT_ATHLETICS_REWARDS = {
  kneelingKnockout: (context, { balance, lowestLevel, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.kneelingKnockoutTierSteps,
      balance.kneelingKnockoutUpgrades,
    ),
  sumoSweetie: (context, { balance, lowestLevel, upgradeAndPay }) =>
    upgradeAndPay(
      [lowestLevel(context)],
      balance.sumoSweetieUpgrades,
      balance.sumoSweetiePayouts,
    ),
  barnBuster: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.barnBusterFloors),
  ringsideRuby: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.ringsideRubyShare),
  knockoutNova: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.knockoutNovaBoostSeconds,
      balance.knockoutNovaExtraWorkers,
    ),
  clinchQueen: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.clinchQueenContinueChance),
  braidedBruiser: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.braidedBruiserDiscount),
  bearHugBonus: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.bearHugBonusPayouts),
  bottomLine: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bottomLineShare),
  crushingQuarter: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.crushingQuarterPayouts),
  floorPlan: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.floorPlanUpgrades),
  hostileTakeover: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.hostileTakeoverUpgrades),
  knockoutProfits: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.knockoutProfitsShare),
  lastOneStanding: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.lastOneStandingUpgrades),
  leveragedBuyout: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.leveragedBuyoutUpgrades),
  marketDominance: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.marketDominanceUpgrades),
  pinnedPayday: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.pinnedPaydayPayouts),
  poundForPound: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.poundForPoundPayouts),
  tapOutTycoon: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.tapOutTycoonUpgrades),
  winnerTakesAll: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.winnerTakesAllShare),
  glovedSwat: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.glovedSwatUpgrades),
  redSockSumo: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.redSockSumoGrowth),
  sidelineCoach: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.sidelineCoachUpgrades),
  yellowShortsSmack: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.yellowShortsSmackGrowth),
  hippoHeavyweights: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.hippoHeavyweightsGrowth),
  kickoff: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kickoffShare),
  redZone: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redZoneShare),
  trackStar: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.trackStarShare),
} satisfies FeaturedRewards<typeof COMBAT_ATHLETICS_CRITS>;
