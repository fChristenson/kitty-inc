import type { RUNES_CRITS } from "../critData/runes";
import type { FeaturedRewards } from "./types";

export const RUNES_REWARDS = {
  axeOfAssets: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.axeOfAssetsUpgrades),
  broochBankroll: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.broochBankrollPayouts),
  bucklerBucks: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.bucklerBucksPayouts),
  chestplateCapital: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.chestplateCapitalShare),
  doublePauldronDividend: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.doublePauldronDividendPayouts),
  emeraldBandBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.emeraldBandBonusPayouts),
  gauntletGains: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.gauntletGainsUpgrades),
  helmOfHoldings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.helmOfHoldingsShare),
  hoodedHedgeFund: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hoodedHedgeFundShare),
  ironFistFinance: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.ironFistFinanceShare),
  knotworkNestEgg: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.knotworkNestEggShare),
  mantleMargin: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.mantleMarginShare),
  pauldronPayroll: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.pauldronPayrollPayouts),
  pendantPortfolio: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pendantPortfolioShare),
  runebladeRevenue: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.runebladeRevenueShare),
  runeCloakReserve: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.runeCloakReserveShare),
  runeRingReturns: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.runeRingReturnsShare),
  runeStoneRiches: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.runeStoneRichesPayouts),
  shieldWallStreet: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shieldWallStreetShare),
  shoulderTheCosts: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.shoulderTheCostsUpgrades),
  spearShareholder: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.spearShareholderShare),
  thunderMalletMargin: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.thunderMalletMarginShare),
} satisfies FeaturedRewards<typeof RUNES_CRITS>;
