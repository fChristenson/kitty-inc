import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GAMER_LIFE_CRITS = {
  dungeonAccountant: {
    label: "Dungeon Accountant",
    color: COLOR.nightShiftIndigo,
    image: "crits/gamerLife/dungeonAccountant.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  lootGoblin: {
    label: "Loot Goblin",
    color: COLOR.bullMarketGreen,
    image: "crits/gamerLife/lootGoblin.webp",
    description: "Adds 3.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.lootGoblinShare),
  },
  inventoryFull: {
    label: "Inventory Full",
    color: COLOR.gold,
    image: "crits/gamerLife/inventoryFull.webp",
    description: "Twelve free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.inventoryFullUpgrades),
  },
  sideQuestSalary: {
    label: "Side Quest Salary",
    color: COLOR.heavenlyGold,
    image: "crits/gamerLife/sideQuestSalary.webp",
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
    image: "crits/gamerLife/minMaxManager.webp",
    description: "Boosts this floor's workers for 22s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.minMaxManagerBoostSeconds,
        balance.minMaxManagerExtraWorkers,
      ),
  },
  criticalKnit: {
    label: "Critical Knit",
    color: COLOR.peppermintPink,
    image: "crits/gamerLife/criticalKnit.webp",
    description: "Six payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.criticalKnitPayouts),
  },
  savePointSavings: {
    label: "Save Point Savings",
    color: COLOR.blue,
    image: "crits/gamerLife/savePointSavings.webp",
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
    image: "crits/gamerLife/achievementUnlocked.webp",
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
    image: "crits/gamerLife/newGamePlus.webp",
    description: "Twenty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.newGamePlusUpgrades),
  },
  speedrunPayroll: {
    label: "Speedrun Payroll",
    color: COLOR.red,
    image: "crits/gamerLife/speedrunPayroll.webp",
    description: "Boosts this floor's workers for 24s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.speedrunPayrollBoostSeconds,
        balance.speedrunPayrollExtraWorkers,
      ),
  },
  lagCompensation: {
    label: "Lag Compensation",
    color: COLOR.silverTicketGray,
    image: "crits/gamerLife/lagCompensation.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  patchNotesPayday: {
    label: "Patch Notes Payday",
    color: COLOR.moneyGreen,
    image: "crits/gamerLife/patchNotesPayday.webp",
    description: "Adds 6s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.patchNotesPaydaySeconds),
  },
  biggerOnTheInside: {
    label: "Bigger on the Inside",
    color: COLOR.blue,
    image: "crits/gamerLife/biggerOnTheInside.webp",
    description: "Ten instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.biggerOnTheInsidePayouts),
  },
  cacheMeOutside: {
    label: "Cache Me Outside",
    color: COLOR.orange,
    image: "crits/gamerLife/cacheMeOutside.webp",
    description: "Eight free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.cacheMeOutsideUpgrades),
  },
  itCompiles: {
    label: "It Compiles!",
    color: COLOR.moneyGreen,
    image: "crits/gamerLife/itCompiles.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  magicalPayrollGirl: {
    label: "Magical Payroll Girl",
    color: COLOR.peppermintPink,
    image: "crits/gamerLife/magicalPayrollGirl.webp",
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
    image: "crits/gamerLife/mechaMiddleManagement.webp",
    description: "Adds 3.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.mechaMiddleManagementShare),
  },
  mergeConflict: {
    label: "Merge Conflict",
    color: COLOR.fullHouseCrimson,
    image: "crits/gamerLife/mergeConflict.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  mintCondition: {
    label: "Mint Condition",
    color: COLOR.cyan,
    image: "crits/gamerLife/mintCondition.webp",
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
    image: "crits/gamerLife/stackOverflowing.webp",
    description:
      "Repeats the crit on the floor above, 13% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.stackOverflowingContinueChance),
  },
  oneMoreRound: {
    label: "One More Round",
    color: COLOR.sunshineGold,
    image: "crits/gamerLife/oneMoreRound.webp",
    description:
      "Repeats the crit on the floor below, 15% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.oneMoreRoundContinueChance),
  },
  couchCoOpCapital: {
    label: "Couch Co-Op Capital",
    color: COLOR.blue,
    image: "crits/gamerLife/couchCoOpCapital.webp",
    description: "Adds 6s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.couchCoOpCapitalSeconds),
  },
  hardCarry: {
    label: "Hard Carry",
    color: COLOR.orange,
    image: "crits/gamerLife/hardCarry.webp",
    description: "Fourteen free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.hardCarryUpgrades),
  },
  readyCheck: {
    label: "Ready Check",
    color: COLOR.moneyGreen,
    image: "crits/gamerLife/readyCheck.webp",
    description:
      "Repeats the crit on the floor above, 15% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.readyCheckContinueChance),
  },
  queueRoyalty: {
    label: "Queue Royalty",
    color: COLOR.heavenlyGold,
    image: "crits/gamerLife/queueRoyalty.webp",
    description: "Twelve instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.queueRoyaltyPayouts),
  },
  rankedAndBanked: {
    label: "Ranked and Banked",
    color: COLOR.gold,
    image: "crits/gamerLife/rankedAndBanked.webp",
    description: "Adds 3.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rankedAndBankedShare),
  },
  victoryPose: {
    label: "Victory Pose",
    color: COLOR.starYellow,
    image: "crits/gamerLife/victoryPose.webp",
    description: "Eighteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.victoryPoseUpgrades),
  },
  emoteEconomy: {
    label: "Emote Economy",
    color: COLOR.peppermintPink,
    image: "crits/gamerLife/emoteEconomy.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.emoteEconomyFloors),
  },
  checkpointChampion: {
    label: "Checkpoint Champion",
    color: COLOR.cyan,
    image: "crits/gamerLife/checkpointChampion.webp",
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
    image: "crits/gamerLife/fishingForFunds.webp",
    description: "Thirteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.fishingForFundsPayouts),
  },
  playerTwoSmooch: {
    label: "Player Two Smooch",
    color: COLOR.coinGold,
    image: "crits/gamerLife/playerTwoSmooch.webp",
    description: "Adds 13.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.playerTwoSmoochShare),
  },
  limeLipLock: {
    label: "Lime Lip Lock",
    color: COLOR.amberMuted,
    image: "crits/gamerLife/limeLipLock.webp",
    description: "Boosts every worker for 87s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.limeLipLockBoostSeconds, balance.limeLipLockExtraWorkers),
  },
  splitScreenSweethearts: {
    label: "Split Screen Sweethearts",
    color: COLOR.teaBreakBrown,
    image: "crits/gamerLife/splitScreenSweethearts.webp",
    description: "Repeats the crit above and below, 98% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.splitScreenSweetheartsContinueChance),
  },
  buttonMashKiss: {
    label: "Button Mash Kiss",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/gamerLife/buttonMashKiss.webp",
    description: "Cuts every price in this building by 16.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.buttonMashKissDiscount),
  },
  coopCrush: {
    label: "Co-op Crush",
    color: COLOR.amberMuted,
    image: "crits/gamerLife/coopCrush.webp",
    description: "Adds 13.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.coopCrushShare),
  },
  pigtailPartyMode: {
    label: "Pigtail Party Mode",
    color: COLOR.summerSaleOrange,
    image: "crits/gamerLife/pigtailPartyMode.webp",
    description: "Boosts every worker for 88s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.pigtailPartyModeBoostSeconds, balance.pigtailPartyModeExtraWorkers),
  },
  headbandGrinder: {
    label: "Headband Grinder",
    color: COLOR.summerSaleOrange,
    image: "crits/gamerLife/headbandGrinder.webp",
    description: "Repeats the crit above and below, 99% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.headbandGrinderContinueChance),
  },
  fingerlessFrag: {
    label: "Fingerless Frag",
    color: COLOR.amberMuted,
    image: "crits/gamerLife/fingerlessFrag.webp",
    description: "Cuts every price in this building by 16.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.fingerlessFragDiscount),
  },
  pinkHeadsetPro: {
    label: "Pink Headset Pro",
    color: COLOR.fastForwardBlue,
    image: "crits/gamerLife/pinkHeadsetPro.webp",
    description: "Adds 13.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pinkHeadsetProShare),
  },
  buzzcutCombo: {
    label: "Buzzcut Combo",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/gamerLife/buzzcutCombo.webp",
    description: "Boosts every worker for 89s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.buzzcutComboBoostSeconds, balance.buzzcutComboExtraWorkers),
  },
  ponytailPowerPlay: {
    label: "Ponytail Power Play",
    color: COLOR.coinGold,
    image: "crits/gamerLife/ponytailPowerPlay.webp",
    description: "Repeats the crit above and below, 100% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.ponytailPowerPlayContinueChance),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
