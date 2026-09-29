import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const RUNES_CRITS = {
  axeOfAssets: {
    label: "Axe of Assets",
    color: COLOR.chairGiveawayBrown,
    image: "crits/runes/axeOfAssets.webp",
    description: "Fifty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.axeOfAssetsUpgrades),
  },
  broochBankroll: {
    label: "Brooch Bankroll",
    color: COLOR.redActive,
    image: "crits/runes/broochBankroll.webp",
    description: "Sixty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.broochBankrollPayouts),
  },
  bucklerBucks: {
    label: "Buckler Bucks",
    color: COLOR.chairGiveawayBrown,
    image: "crits/runes/bucklerBucks.webp",
    description: "Sixty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.bucklerBucksPayouts),
  },
  chestplateCapital: {
    label: "Chestplate Capital",
    color: COLOR.amberMuted,
    image: "crits/runes/chestplateCapital.webp",
    description: "Adds 25.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.chestplateCapitalShare),
  },
  doublePauldronDividend: {
    label: "Double Pauldron Dividend",
    color: COLOR.nightOwlIndigo,
    image: "crits/runes/doublePauldronDividend.webp",
    description: "Sixty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.doublePauldronDividendPayouts),
  },
  emeraldBandBonus: {
    label: "Emerald Band Bonus",
    color: COLOR.gold,
    image: "crits/runes/emeraldBandBonus.webp",
    description: "Eighty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.emeraldBandBonusPayouts),
  },
  gauntletGains: {
    label: "Gauntlet Gains",
    color: COLOR.nightOwlIndigo,
    image: "crits/runes/gauntletGains.webp",
    description: "Nine free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.gauntletGainsUpgrades),
  },
  helmOfHoldings: {
    label: "Helm of Holdings",
    color: COLOR.amberMuted,
    image: "crits/runes/helmOfHoldings.webp",
    description: "Adds 25.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.helmOfHoldingsShare),
  },
  hoodedHedgeFund: {
    label: "Hooded Hedge Fund",
    color: COLOR.nightShiftIndigo,
    image: "crits/runes/hoodedHedgeFund.webp",
    description: "Adds 25.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.hoodedHedgeFundShare),
  },
  ironFistFinance: {
    label: "Iron Fist Finance",
    color: COLOR.grandOpeningRose,
    image: "crits/runes/ironFistFinance.webp",
    description: "Adds 25.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.ironFistFinanceShare),
  },
  knotworkNestEgg: {
    label: "Knotwork Nest Egg",
    color: COLOR.supplyRunTan,
    image: "crits/runes/knotworkNestEgg.webp",
    description: "Adds 25.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.knotworkNestEggShare),
  },
  mantleMargin: {
    label: "Mantle Margin",
    color: COLOR.nightShiftIndigo,
    image: "crits/runes/mantleMargin.webp",
    description: "Adds 26% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.mantleMarginShare),
  },
  pauldronPayroll: {
    label: "Pauldron Payroll",
    color: COLOR.nightOwlIndigo,
    image: "crits/runes/pauldronPayroll.webp",
    description: "Eighty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.pauldronPayrollPayouts),
  },
  pendantPortfolio: {
    label: "Pendant Portfolio",
    color: COLOR.secondWindSky,
    image: "crits/runes/pendantPortfolio.webp",
    description: "Adds 26.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pendantPortfolioShare),
  },
  runebladeRevenue: {
    label: "Runeblade Revenue",
    color: COLOR.amberMuted,
    image: "crits/runes/runebladeRevenue.webp",
    description: "Adds 26.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.runebladeRevenueShare),
  },
  runeCloakReserve: {
    label: "Rune Cloak Reserve",
    color: COLOR.nightShiftIndigo,
    image: "crits/runes/runeCloakReserve.webp",
    description: "Adds 26.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.runeCloakReserveShare),
  },
  runeRingReturns: {
    label: "Rune Ring Returns",
    color: COLOR.gold,
    image: "crits/runes/runeRingReturns.webp",
    description: "Adds 26.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.runeRingReturnsShare),
  },
  runeStoneRiches: {
    label: "Rune Stone Riches",
    color: COLOR.chairGiveawayBrown,
    image: "crits/runes/runeStoneRiches.webp",
    description: "Eighty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.runeStoneRichesPayouts),
  },
  shieldWallStreet: {
    label: "Shield Wall Street",
    color: COLOR.supplyRunTan,
    image: "crits/runes/shieldWallStreet.webp",
    description: "Adds 26.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.shieldWallStreetShare),
  },
  shoulderTheCosts: {
    label: "Shoulder the Costs",
    color: COLOR.halloweenSalePurple,
    image: "crits/runes/shoulderTheCosts.webp",
    description: "Ten free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.shoulderTheCostsUpgrades),
  },
  spearShareholder: {
    label: "Spear Shareholder",
    color: COLOR.chairGiveawayBrown,
    image: "crits/runes/spearShareholder.webp",
    description: "Adds 26.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.spearShareholderShare),
  },
  thunderMalletMargin: {
    label: "Thunder Mallet Margin",
    color: COLOR.amberMuted,
    image: "crits/runes/thunderMalletMargin.webp",
    description: "Adds 26.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.thunderMalletMarginShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
