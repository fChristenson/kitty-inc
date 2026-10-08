import type { WEIGHT_TRAINING_CRITS } from "../critData/weightTraining";
import type { FeaturedRewards } from "./types";

export const WEIGHT_TRAINING_REWARDS = {
  barbellBelle: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  ponytailPress: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.ponytailPressBoostSeconds,
      balance.ponytailPressExtraWorkers,
    ),
  glitterGrip: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  curlCutie: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  deadliftDiva: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.deadliftDivaFloors),
  goldPlated: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldPlatedSeconds),
  dumbbellDarling: (context, { actions, balance, cheapest }) =>
    actions.payCycles([cheapest(context)], balance.dumbbellDarlingPayouts),
  gymCrush: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.gymCrushBoostSeconds,
      balance.gymCrushExtraWorkers,
    ),
  ironHeartthrob: (context, { balance, promoteAndUpgrade, selectByRate }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.ironHeartthrobTierSteps,
      balance.ironHeartthrobUpgrades,
    ),
  kettlebellKiss: (context, { actions, balance, lowestLevel }) =>
    actions.payCycles([lowestLevel(context)], balance.kettlebellKissPayouts),
  headbandHustle: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  proteinPrincess: (context, { balance, highestFloor, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      highestFloor(context),
      balance.proteinPrincessTierSteps,
      balance.proteinPrincessUpgrades,
    ),
  shakerSovereign: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.shakerSovereignBoostSeconds,
      balance.shakerSovereignExtraWorkers,
    ),
  crownedChug: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.crownedChugBoostSeconds,
      balance.crownedChugExtraWorkers,
    ),
  rackAndReady: (context, { actions, balance, cheapest, hereAnd }) =>
    actions.upgrade(
      hereAnd(context, cheapest(context)),
      balance.rackAndReadyUpgrades,
    ),
  overheadOkay: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.overheadOkayBoostSeconds,
      balance.overheadOkayExtraWorkers,
    ),
  bluePlateSpecial: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.bluePlateSpecialFloors),
  barbellBow: (context, { balance, highestFloor, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      highestFloor(context),
      balance.barbellBowTierSteps,
      balance.barbellBowUpgrades,
    ),
  rackPullRiches: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  ringMyBell: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.ringMyBellWorkers);
    actions.hireManagers(context.floors);
  },
  goldBeltBudget: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldBeltBudgetSeconds),
  chinUp: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.chinUpGrowth),
  formCheck: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.formCheckGrowth),
  bearyBuff: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bearyBuffGrowth),
  labRatLifters: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.labRatLiftersGrowth),
  backpackBabes: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.backpackBabesShare),
} satisfies FeaturedRewards<typeof WEIGHT_TRAINING_CRITS>;
