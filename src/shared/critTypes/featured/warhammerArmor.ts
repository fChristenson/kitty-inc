import type { WARHAMMER_ARMOR_CRITS } from "../../critData/warhammerArmor";
import type { FeaturedRewards } from "./types";

export const WARHAMMER_ARMOR_REWARDS = {
  amberVisor: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.amberVisorShare, 2),
  blueGemPlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.blueGemPlateShare, 1),
  bullseyePauldron: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.bullseyePauldronShare, 1),
  copperGrille: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.copperGrilleShare, 2),
  crimsonWingHelm: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.crimsonWingHelmShare, 2),
  crossedBarrels: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.crossedBarrelsShare, 1),
  eagleCrest: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.eagleCrestShare, 2),
  eagleHelm: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.eagleHelmShare, 1),
  eagleMedallion: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.eagleMedallionShare, 2),
  gemSkull: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.gemSkullShare, 1),
  goldenWingHelm: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldenWingHelmSeconds),
  goldFaceplate: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldFaceplateSeconds),
  goldGlyphs: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldGlyphsSeconds),
  goldTrim: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldTrimShare),
  greenVisor: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.greenVisorShare),
  gunwingSkull: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.gunwingSkullShare),
  redChestPlate: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redChestPlateShare),
  redLaurelSkull: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redLaurelSkullShare),
  redStarPauldron: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redStarPauldronShare),
  redStripeHelm: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redStripeHelmShare),
  shieldWings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shieldWingsShare),
  shoulderSigils: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shoulderSigilsShare),
  sigilChest: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sigilChestShare),
  silverVisor: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.silverVisorShare),
  silverWings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.silverWingsShare),
  skullPauldron: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.skullPauldronShare),
  snowCrest: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.snowCrestShare),
  splitSkull: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.splitSkullShare),
  steelFaceplate: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.steelFaceplateShare),
  tealVisor: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tealVisorShare),
  whiteRune: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.whiteRuneShare),
  wingedSkull: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.wingedSkullShare),
  yellowVisor: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.yellowVisorShare),
} satisfies FeaturedRewards<typeof WARHAMMER_ARMOR_CRITS>;
