import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GAMER_LIFE_CRITS = {
  dungeonAccountant: {
    label: "Dungeon Accountant",
    color: COLOR.nightShiftIndigo,
    image: "crits/gamerLife/dungeonAccountant.png",
    description: "Nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.dungeonAccountantUpgrades),
  },
  lootGoblin: {
    label: "Loot Goblin",
    color: COLOR.bullMarketGreen,
    image: "crits/gamerLife/lootGoblin.png",
    description: "Sixteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.lootGoblinPayouts),
  },
  inventoryFull: {
    label: "Inventory Full",
    color: COLOR.gold,
    image: "crits/gamerLife/inventoryFull.png",
    description: "Twelve free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.inventoryFullUpgrades),
  },
  sideQuestSalary: {
    label: "Side Quest Salary",
    color: COLOR.heavenlyGold,
    image: "crits/gamerLife/sideQuestSalary.png",
    description: "Seven payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.sideQuestSalaryPayouts,
      ),
  },
  minMaxManager: {
    label: "Min-Max Manager",
    color: COLOR.cyan,
    image: "crits/gamerLife/minMaxManager.png",
    description: "Ten free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.minMaxManagerUpgrades),
  },
  criticalKnit: {
    label: "Critical Knit",
    color: COLOR.peppermintPink,
    image: "crits/gamerLife/criticalKnit.png",
    description: "Six payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.criticalKnitPayouts),
  },
  savePointSavings: {
    label: "Save Point Savings",
    color: COLOR.blue,
    image: "crits/gamerLife/savePointSavings.png",
    description: "One tier promotion and five upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.savePointSavingsTierSteps,
        balance.savePointSavingsUpgrades,
      ),
  },
  achievementUnlocked: {
    label: "Achievement Unlocked",
    color: COLOR.starYellow,
    image: "crits/gamerLife/achievementUnlocked.png",
    description: "One tier promotion and eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.achievementUnlockedTierSteps,
        balance.achievementUnlockedUpgrades,
      ),
  },
  newGamePlus: {
    label: "New Game Plus",
    color: COLOR.orange,
    image: "crits/gamerLife/newGamePlus.png",
    description: "Twenty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.newGamePlusUpgrades),
  },
  speedrunPayroll: {
    label: "Speedrun Payroll",
    color: COLOR.red,
    image: "crits/gamerLife/speedrunPayroll.png",
    description: "Fifteen instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.speedrunPayrollPayouts),
  },
  lagCompensation: {
    label: "Lag Compensation",
    color: COLOR.silverTicketGray,
    image: "crits/gamerLife/lagCompensation.png",
    description: "Nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.lagCompensationPayouts),
  },
  patchNotesPayday: {
    label: "Patch Notes Payday",
    color: COLOR.moneyGreen,
    image: "crits/gamerLife/patchNotesPayday.png",
    description: "Eleven free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.patchNotesPaydayUpgrades,
      ),
  },
  biggerOnTheInside: {
    label: "Bigger on the Inside",
    color: COLOR.blue,
    image: "crits/gamerLife/biggerOnTheInside.png",
    description: "Ten instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.biggerOnTheInsidePayouts),
  },
  cacheMeOutside: {
    label: "Cache Me Outside",
    color: COLOR.orange,
    image: "crits/gamerLife/cacheMeOutside.png",
    description: "Eight free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.cacheMeOutsideUpgrades),
  },
  itCompiles: {
    label: "It Compiles!",
    color: COLOR.moneyGreen,
    image: "crits/gamerLife/itCompiles.png",
    description: "Fifteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.itCompilesUpgrades),
  },
  magicalPayrollGirl: {
    label: "Magical Payroll Girl",
    color: COLOR.peppermintPink,
    image: "crits/gamerLife/magicalPayrollGirl.png",
    description: "One tier promotion and ten upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.magicalPayrollGirlTierSteps,
        balance.magicalPayrollGirlUpgrades,
      ),
  },
  mechaMiddleManagement: {
    label: "Mecha Middle Management",
    color: COLOR.red,
    image: "crits/gamerLife/mechaMiddleManagement.png",
    description: "Twelve free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.mechaMiddleManagementUpgrades),
  },
  mergeConflict: {
    label: "Merge Conflict",
    color: COLOR.fullHouseCrimson,
    image: "crits/gamerLife/mergeConflict.png",
    description: "Seven upgrades and seven payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.mergeConflictUpgrades);
      actions.payCycles([context.floor], balance.mergeConflictPayouts);
    },
  },
  mintCondition: {
    label: "Mint Condition",
    color: COLOR.cyan,
    image: "crits/gamerLife/mintCondition.png",
    description: "Eighteen payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.mintConditionPayouts,
      ),
  },
  stackOverflowing: {
    label: "Stack Overflowing",
    color: COLOR.gold,
    image: "crits/gamerLife/stackOverflowing.png",
    description: "Nine free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.stackOverflowingUpgrades,
      ),
  },
  oneMoreRound: {
    label: "One More Round",
    color: COLOR.sunshineGold,
    image: "crits/gamerLife/oneMoreRound.png",
    description: "Eight upgrades and eight payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.oneMoreRoundUpgrades);
      actions.payCycles([context.floor], balance.oneMoreRoundPayouts);
    },
  },
  couchCoOpCapital: {
    label: "Couch Co-Op Capital",
    color: COLOR.blue,
    image: "crits/gamerLife/couchCoOpCapital.png",
    description: "Nine free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.couchCoOpCapitalUpgrades),
  },
  hardCarry: {
    label: "Hard Carry",
    color: COLOR.orange,
    image: "crits/gamerLife/hardCarry.png",
    description: "Fourteen free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.hardCarryUpgrades),
  },
  readyCheck: {
    label: "Ready Check",
    color: COLOR.moneyGreen,
    image: "crits/gamerLife/readyCheck.png",
    description: "Six free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.readyCheckUpgrades),
  },
  queueRoyalty: {
    label: "Queue Royalty",
    color: COLOR.heavenlyGold,
    image: "crits/gamerLife/queueRoyalty.png",
    description: "Twelve instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.queueRoyaltyPayouts),
  },
  rankedAndBanked: {
    label: "Ranked and Banked",
    color: COLOR.gold,
    image: "crits/gamerLife/rankedAndBanked.png",
    description: "Eleven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.rankedAndBankedUpgrades),
  },
  victoryPose: {
    label: "Victory Pose",
    color: COLOR.starYellow,
    image: "crits/gamerLife/victoryPose.png",
    description: "Eighteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.victoryPoseUpgrades),
  },
  emoteEconomy: {
    label: "Emote Economy",
    color: COLOR.peppermintPink,
    image: "crits/gamerLife/emoteEconomy.png",
    description: "Eight payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.emoteEconomyPayouts),
  },
  checkpointChampion: {
    label: "Checkpoint Champion",
    color: COLOR.cyan,
    image: "crits/gamerLife/checkpointChampion.png",
    description: "Ten free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.checkpointChampionUpgrades,
      ),
  },
  fishingForFunds: {
    label: "Fishing for Funds",
    color: COLOR.moneyGreen,
    image: "crits/gamerLife/fishingForFunds.png",
    description: "Thirteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.fishingForFundsPayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
