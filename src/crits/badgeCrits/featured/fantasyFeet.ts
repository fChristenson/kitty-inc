import type { FANTASY_FEET_CRITS } from "../critData/fantasyFeet";
import type { FeaturedRewards } from "./types";

export const FANTASY_FEET_REWARDS = {
  magentaScaleSoles: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.magentaScaleSolesDiscount),
  rubyWyrmSoles: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.rubyWyrmSolesBoostSeconds, balance.rubyWyrmSolesExtraWorkers),
  azureDrakeToes: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.azureDrakeToesContinueChance),
  emberHeelHoard: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.emberHeelHoardShare),
  pinkPadWyvern: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.pinkPadWyvernBoostSeconds, balance.pinkPadWyvernExtraWorkers),
  midnightSoles: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.midnightSolesDiscount),
  crimsonCapeSoles: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.crimsonCapeSolesSeconds),
  tenderTuskRub: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.tenderTuskRubBoostSeconds, balance.tenderTuskRubExtraWorkers),
  tuskedToeTrade: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tuskedToeTradeShare),
  tusksAndToes: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.tusksAndToesBoostSeconds, balance.tusksAndToesExtraWorkers),
  warbandWiggles: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.warbandWigglesDiscount),
  warchiefPedicure: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.warchiefPedicureShare),
  barefootRangers: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.barefootRangersBoostSeconds, balance.barefootRangersExtraWorkers),
  bloodBank: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bloodBankDiscount),
  cryptKeeper: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.cryptKeeperBoostSeconds, balance.cryptKeeperExtraWorkers),
  fangShui: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.fangShuiDiscount),
  ghostOfAChance: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.ghostOfAChanceBoostSeconds, balance.ghostOfAChanceExtraWorkers),
  redVelvetCape: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.redVelvetCapeDiscount),
  theCountess: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.theCountessShare),
  woodlandWanderers: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.woodlandWanderersBoostSeconds, balance.woodlandWanderersExtraWorkers),
  goblinGrins: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goblinGrinsUpgrades),
  armbandGoblinLounge: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.armbandGoblinLoungeMultiple),
  cobaltCropGoblin: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.cobaltCropGoblinGrowth),
  goblinKneeSqueeze: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goblinKneeSqueezeUpgrades),
  plumBunGoblin: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.plumBunGoblinMultiple),
  tealTopGoblin: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.tealTopGoblinGrowth),
  beanCounterPaws: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.beanCounterPawsDiscount),
  kittyToeCapital: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kittyToeCapitalShare),
  pawprintProfits: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.pawprintProfitsContinueChance),
  toeBeanTreasury: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.toeBeanTreasuryTierSteps, balance.toeBeanTreasuryUpgrades),
  whiskerWalk: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.whiskerWalkDiscount),
} satisfies FeaturedRewards<typeof FANTASY_FEET_CRITS>;
