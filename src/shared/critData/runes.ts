import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const RUNES_CRITS = {
  axeOfAssets: {
    label: "Axe of Assets",
    color: COLOR.chairGiveawayBrown,
    image: "crits/runes/axeOfAssets.webp",
    description: "Fifty-six free upgrades on this floor",
  },
  broochBankroll: {
    label: "Brooch Bankroll",
    color: COLOR.redActive,
    image: "crits/runes/broochBankroll.webp",
    description: "Sixty-two instant payouts on this floor",
  },
  bucklerBucks: {
    label: "Buckler Bucks",
    color: COLOR.chairGiveawayBrown,
    image: "crits/runes/bucklerBucks.webp",
    description: "Sixty-three instant payouts on this floor",
  },
  chestplateCapital: {
    label: "Chestplate Capital",
    color: COLOR.amberMuted,
    image: "crits/runes/chestplateCapital.webp",
    description: "Adds 25.5% of your total income",
  },
  doublePauldronDividend: {
    label: "Double Pauldron Dividend",
    color: COLOR.nightOwlIndigo,
    image: "crits/runes/doublePauldronDividend.webp",
    description: "Sixty-four instant payouts on this floor",
  },
  emeraldBandBonus: {
    label: "Emerald Band Bonus",
    color: COLOR.gold,
    image: "crits/runes/emeraldBandBonus.webp",
    description: "Eighty instant payouts on this floor",
  },
  gauntletGains: {
    label: "Gauntlet Gains",
    color: COLOR.nightOwlIndigo,
    image: "crits/runes/gauntletGains.webp",
    description: "Nine free upgrades on the lowest-level floor",
  },
  helmOfHoldings: {
    label: "Helm of Holdings",
    color: COLOR.amberMuted,
    image: "crits/runes/helmOfHoldings.webp",
    description: "Adds 25.6% of your total income",
  },
  hoodedHedgeFund: {
    label: "Hooded Hedge Fund",
    color: COLOR.nightShiftIndigo,
    image: "crits/runes/hoodedHedgeFund.webp",
    description: "Adds 25.7% of your total income",
  },
  ironFistFinance: {
    label: "Iron Fist Finance",
    color: COLOR.grandOpeningRose,
    image: "crits/runes/ironFistFinance.webp",
    description: "Adds 25.8% of your total income",
  },
  knotworkNestEgg: {
    label: "Knotwork Nest Egg",
    color: COLOR.supplyRunTan,
    image: "crits/runes/knotworkNestEgg.webp",
    description: "Adds 25.9% of your total income",
  },
  mantleMargin: {
    label: "Mantle Margin",
    color: COLOR.nightShiftIndigo,
    image: "crits/runes/mantleMargin.webp",
    description: "Adds 26% of your total income",
  },
  pauldronPayroll: {
    label: "Pauldron Payroll",
    color: COLOR.nightOwlIndigo,
    image: "crits/runes/pauldronPayroll.webp",
    description: "Eighty-two instant payouts on this floor",
  },
  pendantPortfolio: {
    label: "Pendant Portfolio",
    color: COLOR.secondWindSky,
    image: "crits/runes/pendantPortfolio.webp",
    description: "Adds 26.1% of your total income",
  },
  runebladeRevenue: {
    label: "Runeblade Revenue",
    color: COLOR.amberMuted,
    image: "crits/runes/runebladeRevenue.webp",
    description: "Adds 26.2% of your total income",
  },
  runeCloakReserve: {
    label: "Rune Cloak Reserve",
    color: COLOR.nightShiftIndigo,
    image: "crits/runes/runeCloakReserve.webp",
    description: "Adds 26.3% of your total income",
  },
  runeRingReturns: {
    label: "Rune Ring Returns",
    color: COLOR.gold,
    image: "crits/runes/runeRingReturns.webp",
    description: "Adds 26.4% of your total income",
  },
  runeStoneRiches: {
    label: "Rune Stone Riches",
    color: COLOR.chairGiveawayBrown,
    image: "crits/runes/runeStoneRiches.webp",
    description: "Eighty-three instant payouts on this floor",
  },
  shieldWallStreet: {
    label: "Shield Wall Street",
    color: COLOR.supplyRunTan,
    image: "crits/runes/shieldWallStreet.webp",
    description: "Adds 26.5% of your total income",
  },
  shoulderTheCosts: {
    label: "Shoulder the Costs",
    color: COLOR.halloweenSalePurple,
    image: "crits/runes/shoulderTheCosts.webp",
    description: "Ten free upgrades on the lowest-level floor",
  },
  spearShareholder: {
    label: "Spear Shareholder",
    color: COLOR.chairGiveawayBrown,
    image: "crits/runes/spearShareholder.webp",
    description: "Adds 26.6% of your total income",
  },
  thunderMalletMargin: {
    label: "Thunder Mallet Margin",
    color: COLOR.amberMuted,
    image: "crits/runes/thunderMalletMargin.webp",
    description: "Adds 26.7% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
