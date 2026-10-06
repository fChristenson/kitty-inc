import type { FANTASY_ROMANCES_CRITS } from "../../critData/fantasyRomances";
import type { FeaturedRewards } from "./types";

export const FANTASY_ROMANCES_REWARDS = {
  scaleSmooch: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.scaleSmoochContinueChance),
  hornLockKiss: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.hornLockKissDiscount),
  fireAndFrostKiss: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.fireAndFrostKissSeconds),
  sapphireEmberSmooch: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.sapphireEmberSmoochBoostSeconds, balance.sapphireEmberSmoochExtraWorkers),
  fangKissFling: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.fangKissFlingBoostSeconds, balance.fangKissFlingExtraWorkers),
  neckNibbleKiss: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.neckNibbleKissContinueChance),
  tuskTango: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.tuskTangoDiscount),
  tuskTouchKiss: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tuskTouchKissShare),
  tuskTrioTreaty: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.tuskTrioTreatyBoostSeconds, balance.tuskTrioTreatyExtraWorkers),
  earResistibleTrio: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.earResistibleTrioShare),
  fangClub: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.fangClubDiscount),
  greenWithEnvy: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.greenWithEnvyBoostSeconds, balance.greenWithEnvyExtraWorkers),
  goblinSmoochSavings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goblinSmoochSavingsShare),
  orcKissAccount: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.orcKissAccountShare),
  blondeGoblinBankroll: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.blondeGoblinBankrollPayouts),
  braidedGoblinBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.braidedGoblinBonusPayouts),
  emeraldKissEarnings: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.emeraldKissEarningsSeconds),
  goblinKissGold: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.goblinKissGoldPayouts),
  greenQueenGains: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.greenQueenGainsUpgrades),
  hoopEarringHoldings: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.hoopEarringHoldingsSeconds),
  pointyEarPay: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.pointyEarPayPayouts),
  punkGoblinPayout: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.punkGoblinPayoutPayouts),
  swampSmoochStash: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.swampSmoochStashSeconds),
  tuskKissTally: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tuskKissTallyPayouts),
  blueGoblinTwins: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.blueGoblinTwinsGrowth),
  goblinLipPrint: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.goblinLipPrintGrowth),
  goblinCrush: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.goblinCrushGrowth),
  greenCheekLick: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.greenCheekLickGrowth),
} satisfies FeaturedRewards<typeof FANTASY_ROMANCES_CRITS>;
