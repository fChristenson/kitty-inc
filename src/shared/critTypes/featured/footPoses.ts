import type { FOOT_POSES_CRITS } from "../../critData/footPoses";
import type { FeaturedRewards } from "./types";

export const FOOT_POSES_REWARDS = {
  cooldownStretch: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cooldownStretchSeconds),
  flexiblePricing: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.flexiblePricingDiscount),
  highKickMarkdown: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.highKickMarkdownDiscount),
  splitTheProfits: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.splitTheProfitsShare),
  legUpLedger: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.legUpLedgerShare),
  butterflySplit: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.butterflySplitUpgrades),
  ponytailVSplit: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.ponytailVSplitGrowth),
  bunTopPike: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bunTopPikeGrowth),
  frogSitFlex: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.frogSitFlexGrowth),
  goldenLocksLegUp: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goldenLocksLegUpUpgrades),
  huggedStilts: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.huggedStiltsMultiple),
  kneeHugHuddle: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.kneeHugHuddleGrowth),
  lowFadeFootrest: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.lowFadeFootrestUpgrades),
  pinkCropPowerhouse: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pinkCropPowerhouseUpgrades),
  reclineRaise: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.reclineRaiseMultiple),
  redheadCrossover: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.redheadCrossoverGrowth),
  redTankRaise: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.redTankRaiseUpgrades),
  crisscrossBun: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.crisscrossBunMultiple),
  blondeBallUp: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.blondeBallUpUpgrades),
  onTheBall: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.onTheBallBoostSeconds, balance.onTheBallExtraWorkers),
  toePyramid: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.toePyramidMultiple),
  toeStackLean: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.toeStackLeanUpgrades),
  cherryBobBundle: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.cherryBobBundleGrowth),
  victoryVSoles: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.victoryVSolesMultiple),
  tippyToeTycoon: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.tippyToeTycoonFloors),
  topknotTiptoe: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.topknotTiptoeUpgrades),
  stepUpStocks: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.stepUpStocksContinueChance),
  kickBackCapital: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.kickBackCapitalBoostSeconds, balance.kickBackCapitalExtraWorkers),
  lyingLowLedger: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.lyingLowLedgerShare),
  cobaltBobKick: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.cobaltBobKickGrowth),
  frontKickPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.frontKickPuckerMultiple),
  flexPosePeck: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.flexPosePeckUpgrades),
  pinkCarpetKickoff: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.pinkCarpetKickoffBoostSeconds, balance.pinkCarpetKickoffExtraWorkers),
  silverBuzzFlex: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.silverBuzzFlexUpgrades),
} satisfies FeaturedRewards<typeof FOOT_POSES_CRITS>;
