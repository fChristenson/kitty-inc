import type { CHROME_GIRLS_CRITS } from "../../critData/chromeGirls";
import type { FeaturedRewards } from "./types";

export const CHROME_GIRLS_REWARDS = {
  heartOfChrome: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.heartOfChromeTierSteps,
      balance.heartOfChromeUpgrades,
    ),
  heartDrive: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  chromeCrush: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.chromeCrushBoostSeconds,
      balance.chromeCrushExtraWorkers,
    ),
  heartBeam: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.heartBeamPayouts),
  puckerProtocol: (context, { actions, balance, hereAnd, selectByRate }) =>
    actions.payCycles(
      hereAnd(context, selectByRate(context, false)),
      balance.puckerProtocolPayouts,
    ),
  alloyAngel: (context, { balance, promoteAndUpgrade, selectByRate }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.alloyAngelTierSteps,
      balance.alloyAngelUpgrades,
    ),
  sereneSeraph: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.sereneSeraphPayouts),
  wingedWealth: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.wingedWealthShare),
  cyberSiren: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(lowestLevel(context), balance.cyberSirenTierSteps, balance.cyberSirenUpgrades),
  micDropMaven: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.micDropMavenFloors),
  circuitSerenade: (context, { actions, balance, alternating }) =>
    actions.upgrade(alternating(context), balance.circuitSerenadeUpgrades),
  chromeCrooner: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.chromeCroonerPayouts),
  sunkissedSignal: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  wiredWarble: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  beltItOut: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.beltItOutWorkers),
  glossyGaze: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.glossyGazeUpgrades),
  goldenFreckles: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldenFrecklesSeconds),
  mirrorBob: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  holoHeart: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.holoHeartUpgrades),
  pixelHeart: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.pixelHeartBoostSeconds,
      balance.pixelHeartExtraWorkers,
    ),
  heartProjection: (context, { actions, balance, belowAndHere }) =>
    actions.payCycles(belowAndHere(context), balance.heartProjectionPayouts),
  liquidMetalLashes: (context, { actions, balance, hereAnd, highestFloor }) =>
    actions.upgrade(
      hereAnd(context, highestFloor(context)),
      balance.liquidMetalLashesUpgrades,
    ),
  dripAndDazzle: (context, { actions, balance, hereAnd, highestFloor }) =>
    actions.payCycles(
      hereAnd(context, highestFloor(context)),
      balance.dripAndDazzlePayouts,
    ),
  silverPour: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  polishedPout: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  loweredLenses: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.loweredLensesDiscount),
  encore: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.encoreGrowth),
  highNote: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.highNoteGrowth),
  platinumRecord: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.platinumRecordGrowth),
  silverTongue: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.silverTongueGrowth),
  standingOvation: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.standingOvationGrowth),
  bicepBooster: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bicepBoosterGrowth),
  blueBoltFlex: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.blueBoltFlexGrowth),
  chromeKnuckles: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.chromeKnucklesGrowth),
  headsetMech: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.headsetMechGrowth),
  pinkPiston: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.pinkPistonGrowth),
  silverMechSuit: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.silverMechSuitGrowth),
  topazCore: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.topazCoreGrowth),
  blueBelleWave: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blueBelleWaveShare),
  cherrySlit: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.cherrySlitShare),
  cobaltPose: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.cobaltPoseShare),
  hourglassHips: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hourglassHipsShare),
  midnightStrapless: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.midnightStraplessShare),
  pageantPump: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pageantPumpShare),
  pinkSash: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkSashShare),
  plumPower: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.plumPowerShare),
  redVelvet: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redVelvetShare),
  rougeNoir: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rougeNoirShare),
  royalDrape: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.royalDrapeShare),
  rubyBallgown: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rubyBallgownShare),
  sapphireGala: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sapphireGalaShare),
  tealTress: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tealTressShare),
  twilightGlam: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.twilightGlamShare),
  twoToneTease: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.twoToneTeaseShare),
  violetFlex: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.violetFlexShare),
  satinSalute: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.satinSaluteShare),
} satisfies FeaturedRewards<typeof CHROME_GIRLS_CRITS>;
