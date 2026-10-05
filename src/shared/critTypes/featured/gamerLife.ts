import type { GAMER_LIFE_CRITS } from "../../critData/gamerLife";
import type { FeaturedRewards } from "./types";

export const GAMER_LIFE_REWARDS = {
  dungeonAccountant: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  lootGoblin: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.lootGoblinShare),
  inventoryFull: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.inventoryFullUpgrades),
  sideQuestSalary: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.sideQuestSalaryPayouts,
    ),
  minMaxManager: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.minMaxManagerBoostSeconds,
      balance.minMaxManagerExtraWorkers,
    ),
  criticalKnit: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.criticalKnitPayouts),
  savePointSavings: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.savePointSavingsTierSteps,
      balance.savePointSavingsUpgrades,
    ),
  achievementUnlocked: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.achievementUnlockedTierSteps,
      balance.achievementUnlockedUpgrades,
    ),
  newGamePlus: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.newGamePlusUpgrades),
  speedrunPayroll: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.speedrunPayrollBoostSeconds,
      balance.speedrunPayrollExtraWorkers,
    ),
  lagCompensation: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  patchNotesPayday: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.patchNotesPaydaySeconds),
  biggerOnTheInside: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.biggerOnTheInsidePayouts),
  cacheMeOutside: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.cacheMeOutsideUpgrades),
  itCompiles: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  magicalPayrollGirl: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.magicalPayrollGirlTierSteps,
      balance.magicalPayrollGirlUpgrades,
    ),
  mechaMiddleManagement: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.mechaMiddleManagementShare),
  mergeConflict: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  mintCondition: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.mintConditionPayouts,
    ),
  stackOverflowing: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.stackOverflowingContinueChance),
  oneMoreRound: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.oneMoreRoundContinueChance),
  couchCoOpCapital: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.couchCoOpCapitalSeconds),
  hardCarry: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.hardCarryUpgrades),
  readyCheck: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.readyCheckContinueChance),
  queueRoyalty: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.queueRoyaltyPayouts),
  rankedAndBanked: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rankedAndBankedShare),
  victoryPose: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.victoryPoseUpgrades),
  emoteEconomy: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.emoteEconomyFloors),
  checkpointChampion: (context, { actions, balance, highestFloor }) =>
    actions.upgrade(
      [highestFloor(context)],
      balance.checkpointChampionUpgrades,
    ),
  fishingForFunds: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.fishingForFundsPayouts),
  playerTwoSmooch: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.playerTwoSmoochShare),
  limeLipLock: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.limeLipLockBoostSeconds, balance.limeLipLockExtraWorkers),
  splitScreenSweethearts: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.splitScreenSweetheartsContinueChance),
  buttonMashKiss: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.buttonMashKissDiscount),
  coopCrush: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.coopCrushShare),
  pigtailPartyMode: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.pigtailPartyModeBoostSeconds, balance.pigtailPartyModeExtraWorkers),
  headbandGrinder: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.headbandGrinderContinueChance),
  fingerlessFrag: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.fingerlessFragDiscount),
  pinkHeadsetPro: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkHeadsetProShare),
  buzzcutCombo: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.buzzcutComboBoostSeconds, balance.buzzcutComboExtraWorkers),
  ponytailPowerPlay: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.ponytailPowerPlayContinueChance),
} satisfies FeaturedRewards<typeof GAMER_LIFE_CRITS>;
