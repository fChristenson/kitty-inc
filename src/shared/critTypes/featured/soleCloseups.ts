import type { SOLE_CLOSEUPS_CRITS } from "../../critData/soleCloseups";
import type { FeaturedRewards } from "./types";

export const SOLE_CLOSEUPS_REWARDS = {
  archEnemyAssets: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.archEnemyAssetsBoostSeconds, balance.archEnemyAssetsExtraWorkers),
  barefootBanker: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.barefootBankerWorkers);
    actions.hireManagers(context.floors);
  },
  bestFootForward: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.bestFootForwardContinueChance),
  coldFeetCash: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.coldFeetCashTierSteps, balance.coldFeetCashUpgrades),
  footInTheDoor: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.footInTheDoorDiscount),
  heelTurnHaul: (context, { actions, balance }) =>
    actions.boostWorkers([context.floor], balance.heelTurnHaulBoostSeconds, balance.heelTurnHaulExtraWorkers),
  soleProprietor: (context, { actions, balance, alternating }) =>
    actions.hireWorkers(alternating(context), balance.soleProprietorWorkers),
  tenToeTreasury: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.tenToeTreasuryTierSteps, balance.tenToeTreasuryUpgrades),
  toeTally: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.toeTallySeconds),
  doubleSoleMoo: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.doubleSoleMooDiscount),
  lazySundaySoles: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.lazySundaySolesContinueChance),
  logLoungeSoles: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.logLoungeSolesSeconds),
  mirrorImageSoles: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.mirrorImageSolesBoostSeconds, balance.mirrorImageSolesExtraWorkers),
  muscleToeMogul: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.muscleToeMogulContinueChance),
  scrapyardSoles: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.scrapyardSolesContinueChance),
  soleSpotlight: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.soleSpotlightDiscount),
  sunnySoleSisters: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.sunnySoleSistersSeconds),
  tickleTax: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.tickleTaxContinueChance),
  feelingBlue: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.feelingBlueShare),
  oddCouple: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.oddCoupleShare),
  pixieCutPayday: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pixieCutPaydayShare),
  faceValue: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.faceValueShare),
  heelDeal: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.heelDealPayouts),
  soleCustody: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.soleCustodyShare),
  footTheBill: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.footTheBillPayouts),
  toeToToeTrade: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.toeToToeTradeUpgrades),
  toeTussle: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.toeTussleGrowth),
  toeGrip: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.toeGripUpgrades),
  giantArchDare: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.giantArchDareGrowth),
  peekabooSole: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.peekabooSoleGrowth),
  bigSoleSpread: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bigSoleSpreadGrowth),
  sidewaysSoles: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.sidewaysSolesMultiple),
  soleSandwich: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.soleSandwichGrowth),
} satisfies FeaturedRewards<typeof SOLE_CLOSEUPS_CRITS>;
