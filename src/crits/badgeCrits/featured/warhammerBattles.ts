import type { WARHAMMER_BATTLES_CRITS } from "../critData/warhammerBattles";
import type { FeaturedRewards } from "./types";

export const WARHAMMER_BATTLES_REWARDS = {
  emperorsFinest: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.emperorsFinestPayouts),
  eternalDuty: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.eternalDutyBoostSeconds,
      balance.eternalDutyExtraWorkers,
    ),
  faithIsOurShield: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.faithIsOurShieldTierSteps,
      balance.faithIsOurShieldUpgrades,
    ),
  fearNotThePsyker: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.fearNotThePsykerContinueChance),
  neverSurrender: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  purge: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  toTheSkies: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  whatAreYourOrders: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade(
      [lowestLevel(context)],
      balance.whatAreYourOrdersUpgrades,
    ),
  emperorProvidesPurrfection: (context, { actions, balance }) =>
    actions.payCycles(
      context.floors,
      balance.emperorProvidesPurrfectionPayouts,
    ),
  fortyKOfGold: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.fortyKOfGoldPayouts),
  chaoticTemptation: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.chaoticTemptationFloors),
  chaoticTemptation2: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.chaoticTemptation2Upgrades),
  chaoticTemptation3: (context, { actions, balance, alternating }) =>
    actions.upgrade(alternating(context), balance.chaoticTemptation3Upgrades),
  chaoticTemptation4: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.chaoticTemptation4Payouts,
    ),
  emperorsDividends: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  heavyHitter: (context, { actions, topLevel }) =>
    actions.raiseLevels(context.floors, topLevel(context)),
  iAmSpeed: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.iAmSpeedBoostSeconds,
      balance.iAmSpeedExtraWorkers,
    ),
  neverSurrender2: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.neverSurrender2Discount),
  powerSword: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.powerSwordTierSteps,
      balance.powerSwordUpgrades,
    ),
  powerSword2: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.powerSword2Workers);
    actions.hireManagers(context.floors);
  },
  cobaltJuggernaut: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "down",
      balance.cobaltJuggernautContinueChance,
    ),
  bolterAim: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.bolterAimShare, 2),
  crimsonStare: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.crimsonStareShare, 1),
  goldCrestBulk: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.goldCrestBulkShare, 2),
  redEyeGunner: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redEyeGunnerShare),
} satisfies FeaturedRewards<typeof WARHAMMER_BATTLES_CRITS>;
