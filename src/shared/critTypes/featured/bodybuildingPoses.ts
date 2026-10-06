import type { BODYBUILDING_POSES_CRITS } from "../../critData/bodybuildingPoses";
import type { FeaturedRewards } from "./types";

export const BODYBUILDING_POSES_REWARDS = {
  bicepBombshell: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.bicepBombshellTierSteps,
      balance.bicepBombshellUpgrades,
    ),
  kissTheGuns: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.kissTheGunsPayouts,
    ),
  flexAppeal: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.flexAppealFloors),
  coinFlexer: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.coinFlexerSeconds),
  pointTaken: (context, { actions, balance, hereAnd, highestFloor }) =>
    actions.payCycles(
      hereAnd(context, highestFloor(context)),
      balance.pointTakenPayouts,
    ),
  inkedApproval: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.inkedApprovalContinueChance),
  leatherFlex: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.leatherFlexContinueChance),
  muscleMommy: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.muscleMommyBoostSeconds,
      balance.muscleMommyExtraWorkers,
    ),
  neonFlex: (context, { balance, cheapest, upgradeAndPay }) =>
    upgradeAndPay(
      [cheapest(context)],
      balance.neonFlexUpgrades,
      balance.neonFlexPayouts,
    ),
  sixPackSweetheart: (context, { actions }) => actions.hireManagers(context.floors),
  absOfHearts: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.absOfHeartsFloors),
  backDayBeauty: (context, { actions, balance, hereAnd, selectByRate }) =>
    actions.upgrade(
      hereAnd(context, selectByRate(context, false)),
      balance.backDayBeautyUpgrades,
    ),
  farmhandFlex: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.farmhandFlexWorkers),
  moolahMaker: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.moolahMakerShare),
  mirrorFinish: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "up",
      balance.mirrorFinishContinueChance,
    ),
  doubleBicepBonanza: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "up",
      balance.doubleBicepBonanzaContinueChance,
    ),
  flexAppealFunds: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.flexAppealFundsShare),
  handsOnHipsHoldings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.handsOnHipsHoldingsShare),
  baldAndBold: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.baldAndBoldUpgrades),
  bigShoulderEnergy: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.bigShoulderEnergyMultiple),
  buzzcutTitaness: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.buzzcutTitanessGrowth),
  marbleAbsVigil: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.marbleAbsVigilGrowth),
  flexSwoon: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.flexSwoonMultiple),
  gildedMuscleBow: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.gildedMuscleBowUpgrades),
  washboardKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.washboardKissGrowth),
  bronzeAbsShrine: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bronzeAbsShrineUpgrades),
  creamCropAbs: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.creamCropAbsUpgrades),
  crimsonCoreAwe: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.crimsonCoreAweMultiple),
  absAltar: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.absAltarGrowth),
  bellyBlessing: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bellyBlessingGrowth),
  waistWorship: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.waistWorshipUpgrades),
  chiseledAbsKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.chiseledAbsKissGrowth),
  absOfStone: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.absOfStoneUpgrades),
  abdominalAdoration: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.abdominalAdorationMultiple),
  abGridGlory: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.abGridGloryGrowth),
  bicepPlea: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bicepPleaUpgrades),
  buzzcutBackside: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.buzzcutBacksideMultiple),
  backDay: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.backDayShare),
  blondeBicep: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blondeBicepShare),
} satisfies FeaturedRewards<typeof BODYBUILDING_POSES_CRITS>;
