import type { CAT_GIRLS_CRITS } from "../critData/catGirls";
import type { FeaturedRewards } from "./types";

export const CAT_GIRLS_REWARDS = {
  pawsAndEffect: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  catwalkQueen: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.catwalkQueenTierSteps,
      balance.catwalkQueenUpgrades,
    ),
  runwayRoyalty: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.runwayRoyaltyTierSteps,
      balance.runwayRoyaltyUpgrades,
    ),
  blueHourStrut: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.blueHourStrutDiscount),
  felineFine: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.felineFineUpgrades),
  kittenHeels: (context, { actions }) => actions.armCrit(context.floors, "crit"),
  catsPajamas: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.catsPajamasFloors),
  bedtimeBonus: (context, { alternating, balance, upgradeAndPay }) =>
    upgradeAndPay(
      alternating(context),
      balance.bedtimeBonusUpgrades,
      balance.bedtimeBonusPayouts,
    ),
  purrsuasion: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.purrsuasionFloors),
  coinBoop: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.coinBoopShare),
  topCat: (context, { actions, balance, alternating }) =>
    actions.hireWorkers(alternating(context), balance.topCatWorkers),
  clawContract: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.clawContractContinueChance),
  kittenKaboodle: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.kittenKaboodleTierSteps, balance.kittenKaboodleUpgrades),
  meowtivation: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  nineLivesLedger: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.nineLivesLedgerFloors),
  purrfectPose: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.purrfectPoseDiscount),
  tailSpinTycoon: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.tailSpinTycoonSeconds),
  whiskerWink: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.whiskerWinkContinueChance),
  primaryPaws: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.primaryPawsGrowth),
  snowyAndSandy: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.snowyAndSandyGrowth),
} satisfies FeaturedRewards<typeof CAT_GIRLS_CRITS>;
