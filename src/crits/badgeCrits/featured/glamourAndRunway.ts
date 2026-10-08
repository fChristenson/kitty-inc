import type { GLAMOUR_AND_RUNWAY_CRITS } from "../critData/glamourAndRunway";
import type { FeaturedRewards } from "./types";

export const GLAMOUR_AND_RUNWAY_REWARDS = {
  leotardLuster: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.leotardLusterPayouts),
  outOfTheBlue: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.outOfTheBlueContinueChance),
  blondeAmbition: (context, { actions, balance, highestFloor }) =>
    actions.payCycles([highestFloor(context)], balance.blondeAmbitionPayouts),
  prizeHeifer: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.prizeHeiferTierSteps,
      balance.prizeHeiferUpgrades,
    ),
  quicksilverQueen: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.quicksilverQueenDiscount),
  ballgownBullion: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.ballgownBullionPayouts),
  coutureCapital: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.coutureCapitalSeconds),
  emeraldEarnings: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.emeraldEarningsSeconds),
  platinumPortfolio: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.platinumPortfolioSeconds),
  redDressReserve: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.redDressReservePayouts),
  ruffleReturns: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.ruffleReturnsPayouts),
  runwayRevenue: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.runwayRevenuePayouts),
  silverScreenShares: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.silverScreenSharesSeconds),
  thighHighYield: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.thighHighYieldSeconds),
  updoUpside: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.updoUpsidePayouts),
  kissCurl: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.kissCurlSeconds),
  blueStreak: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.blueStreakGrowth),
  cameoAppearance: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.cameoAppearanceUpgrades),
  cleanSlate: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.cleanSlateUpgrades),
  goldenHoops: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.goldenHoopsMultiple),
  ivoryTower: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.ivoryTowerGrowth),
  overallWinner: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.overallWinnerGrowth),
  silverBraid: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.silverBraidMultiple),
  strappedForCash: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.strappedForCashUpgrades),
  swimsuitVenus: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.swimsuitVenusGrowth),
  pinkTopPedestal: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.pinkTopPedestalUpgrades),
  leotardDivinity: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.leotardDivinityGrowth),
  aquaShortsMuse: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.aquaShortsMuseMultiple),
  pinkTightsPowerhouse: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.pinkTightsPowerhouseMultiple),
  grapeSpandex: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.grapeSpandexMultiple),
  highlighterLeggings: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.highlighterLeggingsUpgrades),
  ivoryShorts: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.ivoryShortsUpgrades),
  sterlingProwl: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sterlingProwlShare),
} satisfies FeaturedRewards<typeof GLAMOUR_AND_RUNWAY_CRITS>;
