import type { FANTASY_AND_WORSHIP_CRITS } from "../critData/fantasyAndWorship";
import type { FeaturedRewards } from "./types";

export const FANTASY_AND_WORSHIP_REWARDS = {
  hellfireHug: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.hellfireHugDiscount),
  hornedHeartbreakers: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.hornedHeartbreakersBoostSeconds,
      balance.hornedHeartbreakersExtraWorkers,
    ),
  shoulderDevilDuo: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.shoulderDevilDuoBoostSeconds,
      balance.shoulderDevilDuoExtraWorkers,
    ),
  goblinGluteGains: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.goblinGluteGainsDiscount),
  greenKisser: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.greenKisserPayouts),
  cheekyGoblin: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.cheekyGoblinMultiple),
  evergreenGains: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.evergreenGainsMultiple),
  forestFlirt: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.forestFlirtGrowth),
  goblinSmirk: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goblinSmirkUpgrades),
  pointedLook: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pointedLookUpgrades),
  axeDeduction: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.axeDeductionMultiple),
  chopChop: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.chopChopGrowth),
  norseCode: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.norseCodeUpgrades),
  plunderPose: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.plunderPoseMultiple),
  raidDay: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.raidDayGrowth),
  shieldMaiden: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.shieldMaidenUpgrades),
  valhallaVenture: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.valhallaVentureMultiple),
  orcMatronHomage: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.orcMatronHomageMultiple),
  goldenBraidIdol: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.goldenBraidIdolMultiple),
  goblinAcolyte: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.goblinAcolyteGrowth),
  adoringGaze: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.adoringGazeMultiple),
  kneepadOrcSovereign: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.kneepadOrcSovereignGrowth),
  loinclothDeity: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.loinclothDeityUpgrades),
  mountainGoddess: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.mountainGoddessMultiple),
  armoredOrcIdol: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.armoredOrcIdolGrowth),
  tealTribute: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tealTributeGrowth),
  armsCrossedGoddess: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.armsCrossedGoddessUpgrades),
  cherryTopColossus: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.cherryTopColossusMultiple),
  coralCropVeneration: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.coralCropVenerationGrowth),
  platinumAmazon: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.platinumAmazonMultiple),
  navySanctum: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.navySanctumUpgrades),
  plumMatriarch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.plumMatriarchGrowth),
  giantessSanctuary: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.giantessSanctuaryUpgrades),
  ponytailPriestess: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.ponytailPriestessMultiple),
  rainbowShortsShrine: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.rainbowShortsShrineGrowth),
  sunnyDivaAltar: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.sunnyDivaAltarUpgrades),
  emeraldTopAdoration: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.emeraldTopAdorationMultiple),
  blondeDisciple: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.blondeDiscipleUpgrades),
} satisfies FeaturedRewards<typeof FANTASY_AND_WORSHIP_CRITS>;
