import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createGamerLifeRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    dungeonAccountant: (context) =>
      actions.upgrade([context.floor], balance.dungeonAccountantUpgrades),
    lootGoblin: (context) =>
      actions.payCycles([context.floor], balance.lootGoblinPayouts),
    inventoryFull: (context) =>
      actions.upgrade([context.floor], balance.inventoryFullUpgrades),
    sideQuestSalary: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.sideQuestSalaryPayouts,
      ),
    minMaxManager: (context) =>
      actions.upgrade([lowestLevel(context)], balance.minMaxManagerUpgrades),
    criticalKnit: (context) =>
      actions.payCycles(alternating(context), balance.criticalKnitPayouts),
    savePointSavings: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.savePointSavingsTierSteps,
        balance.savePointSavingsUpgrades,
      ),
    achievementUnlocked: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.achievementUnlockedTierSteps,
        balance.achievementUnlockedUpgrades,
      ),
    newGamePlus: (context) =>
      actions.upgrade([context.floor], balance.newGamePlusUpgrades),
    speedrunPayroll: (context) =>
      actions.payCycles(context.floors, balance.speedrunPayrollPayouts),
    lagCompensation: (context) =>
      actions.payCycles([context.floor], balance.lagCompensationPayouts),
    patchNotesPayday: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.patchNotesPaydayUpgrades,
      ),
    biggerOnTheInside: (context) =>
      actions.payCycles(context.floors, balance.biggerOnTheInsidePayouts),
    cacheMeOutside: (context) =>
      actions.upgrade([lowestLevel(context)], balance.cacheMeOutsideUpgrades),
    itCompiles: (context) =>
      actions.upgrade([context.floor], balance.itCompilesUpgrades),
    magicalPayrollGirl: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.magicalPayrollGirlTierSteps,
        balance.magicalPayrollGirlUpgrades,
      ),
    mechaMiddleManagement: (context) =>
      actions.upgrade(context.floors, balance.mechaMiddleManagementUpgrades),
    mergeConflict: (context) => {
      actions.upgrade([context.floor], balance.mergeConflictUpgrades);
      actions.payCycles([context.floor], balance.mergeConflictPayouts);
    },
    mintCondition: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.mintConditionPayouts,
      ),
    stackOverflowing: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.stackOverflowingUpgrades,
      ),
    oneMoreRound: (context) => {
      actions.upgrade([context.floor], balance.oneMoreRoundUpgrades);
      actions.payCycles([context.floor], balance.oneMoreRoundPayouts);
    },
    couchCoOpCapital: (context) =>
      actions.upgrade(context.floors, balance.couchCoOpCapitalUpgrades),
    hardCarry: (context) =>
      actions.upgrade([highestFloor(context)], balance.hardCarryUpgrades),
    readyCheck: (context) =>
      actions.upgrade(context.floors, balance.readyCheckUpgrades),
    queueRoyalty: (context) =>
      actions.payCycles([context.floor], balance.queueRoyaltyPayouts),
    rankedAndBanked: (context) =>
      actions.upgrade([context.floor], balance.rankedAndBankedUpgrades),
    victoryPose: (context) =>
      actions.upgrade([context.floor], balance.victoryPoseUpgrades),
    emoteEconomy: (context) =>
      actions.payCycles(context.floors, balance.emoteEconomyPayouts),
    checkpointChampion: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.checkpointChampionUpgrades,
      ),
    fishingForFunds: (context) =>
      actions.payCycles([context.floor], balance.fishingForFundsPayouts),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
