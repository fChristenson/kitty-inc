import type { CHROME_GLAMOUR_CRITS } from "../../critData/chromeGlamour";
import type { FeaturedRewards } from "./types";

export const CHROME_GLAMOUR_REWARDS = {
  chromeCrush: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.chromeCrushBoostSeconds,
      balance.chromeCrushExtraWorkers,
    ),
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
  glossyGaze: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.glossyGazeUpgrades),
  goldenFreckles: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldenFrecklesSeconds),
  mirrorBob: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
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
  bicepBooster: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bicepBoosterGrowth),
  blueBoltFlex: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.blueBoltFlexGrowth),
  chromeKnuckles: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.chromeKnucklesGrowth),
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
  tealTress: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tealTressShare),
  twilightGlam: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.twilightGlamShare),
  twoToneTease: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.twoToneTeaseShare),
  violetFlex: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.violetFlexShare),
} satisfies FeaturedRewards<typeof CHROME_GLAMOUR_CRITS>;
