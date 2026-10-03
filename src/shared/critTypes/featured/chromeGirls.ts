import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CHROME_GIRLS_CRITS = {
  heartOfChrome: {
    label: "Heart of Chrome",
    color: COLOR.pairBlue,
    image: "crits/chromeGirls/heartOfChrome.webp",
    description: "One tier promotion and forty-three upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.heartOfChromeTierSteps,
        balance.heartOfChromeUpgrades,
      ),
  },
  heartDrive: {
    label: "Heart Drive",
    color: COLOR.internSkyBlue,
    image: "crits/chromeGirls/heartDrive.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  },
  chromeCrush: {
    label: "Chrome Crush",
    color: COLOR.fullHouseCrimson,
    image: "crits/chromeGirls/chromeCrush.webp",
    description: "Boosts every worker for 49s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.chromeCrushBoostSeconds,
        balance.chromeCrushExtraWorkers,
      ),
  },
  heartBeam: {
    label: "Heart Beam",
    color: COLOR.peppermintPink,
    image: "crits/chromeGirls/heartBeam.webp",
    description: "Sixty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.heartBeamPayouts),
  },
  puckerProtocol: {
    label: "Pucker Protocol",
    color: COLOR.red,
    image: "crits/chromeGirls/puckerProtocol.webp",
    description: "Forty-four payouts here and on the lowest-earning floor",
    reward: (context, { actions, balance, hereAnd, selectByRate }) =>
      actions.payCycles(
        hereAnd(context, selectByRate(context, false)),
        balance.puckerProtocolPayouts,
      ),
  },
  alloyAngel: {
    label: "Alloy Angel",
    color: COLOR.goldenHandshakeGold,
    image: "crits/chromeGirls/alloyAngel.webp",
    description: "Two tier promotions and nineteen upgrades on the top earner",
    reward: (context, { balance, promoteAndUpgrade, selectByRate }) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.alloyAngelTierSteps,
        balance.alloyAngelUpgrades,
      ),
  },
  sereneSeraph: {
    label: "Serene Seraph",
    color: COLOR.white,
    image: "crits/chromeGirls/sereneSeraph.webp",
    description: "Fifty-one payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.sereneSeraphPayouts),
  },
  wingedWealth: {
    label: "Winged Wealth",
    color: COLOR.bonusRoundGold,
    image: "crits/chromeGirls/wingedWealth.webp",
    description: "Adds 45.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.wingedWealthShare),
  },
  cyberSiren: {
    label: "Cyber Siren",
    color: COLOR.royalFlushPurple,
    image: "crits/chromeGirls/cyberSiren.webp",
    description: "One tier promotion and thirteen upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(lowestLevel(context), balance.cyberSirenTierSteps, balance.cyberSirenUpgrades),
  },
  micDropMaven: {
    label: "Mic Drop Maven",
    color: COLOR.nightShiftIndigo,
    image: "crits/chromeGirls/micDropMaven.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.micDropMavenFloors),
  },
  circuitSerenade: {
    label: "Circuit Serenade",
    color: COLOR.mysticTeal,
    image: "crits/chromeGirls/circuitSerenade.webp",
    description: "Sixty upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.circuitSerenadeUpgrades),
  },
  chromeCrooner: {
    label: "Chrome Crooner",
    color: COLOR.pairBlue,
    image: "crits/chromeGirls/chromeCrooner.webp",
    description: "Fifty-nine payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.chromeCroonerPayouts),
  },
  sunkissedSignal: {
    label: "Sunkissed Signal",
    color: COLOR.autumnSaleAmber,
    image: "crits/chromeGirls/sunkissedSignal.webp",
    description: "Free office chairs for every unlocked floor",
    reward: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  },
  wiredWarble: {
    label: "Wired Warble",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/chromeGirls/wiredWarble.webp",
    description: "Free office supplies for every unlocked floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies(context.floors),
  },
  beltItOut: {
    label: "Belt It Out",
    color: COLOR.doubleDownCrimson,
    image: "crits/chromeGirls/beltItOut.webp",
    description: "Hires 1 free worker on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers(context.floors, balance.beltItOutWorkers),
  },
  glossyGaze: {
    label: "Glossy Gaze",
    color: COLOR.silverTicketGray,
    image: "crits/chromeGirls/glossyGaze.webp",
    description: "Sixty-four upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.glossyGazeUpgrades),
  },
  goldenFreckles: {
    label: "Golden Freckles",
    color: COLOR.goldenTicketYellow,
    image: "crits/chromeGirls/goldenFreckles.webp",
    description: "Adds 26s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldenFrecklesSeconds),
  },
  mirrorBob: {
    label: "Mirror Bob",
    color: COLOR.silverTicketGray,
    image: "crits/chromeGirls/mirrorBob.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  holoHeart: {
    label: "Holo Heart",
    color: COLOR.internSkyBlue,
    image: "crits/chromeGirls/holoHeart.webp",
    description: "Fifty-nine upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.holoHeartUpgrades),
  },
  pixelHeart: {
    label: "Pixel Heart",
    color: COLOR.grandOpeningRose,
    image: "crits/chromeGirls/pixelHeart.webp",
    description: "Boosts every worker for 34s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.pixelHeartBoostSeconds,
        balance.pixelHeartExtraWorkers,
      ),
  },
  heartProjection: {
    label: "Heart Projection",
    color: COLOR.mysticTeal,
    image: "crits/chromeGirls/heartProjection.webp",
    description: "Fifty-four payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.heartProjectionPayouts),
  },
  liquidMetalLashes: {
    label: "Liquid Metal Lashes",
    color: COLOR.fastForwardBlue,
    image: "crits/chromeGirls/liquidMetalLashes.webp",
    description: "Forty-six upgrades here and on the highest floor",
    reward: (context, { actions, balance, hereAnd, highestFloor }) =>
      actions.upgrade(
        hereAnd(context, highestFloor(context)),
        balance.liquidMetalLashesUpgrades,
      ),
  },
  dripAndDazzle: {
    label: "Drip and Dazzle",
    color: COLOR.goldenHandshakeGold,
    image: "crits/chromeGirls/dripAndDazzle.webp",
    description: "Forty-two payouts here and on the highest floor",
    reward: (context, { actions, balance, hereAnd, highestFloor }) =>
      actions.payCycles(
        hereAnd(context, highestFloor(context)),
        balance.dripAndDazzlePayouts,
      ),
  },
  silverPour: {
    label: "Silver Pour",
    color: COLOR.silverTicketGray,
    image: "crits/chromeGirls/silverPour.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  polishedPout: {
    label: "Polished Pout",
    color: COLOR.red,
    image: "crits/chromeGirls/polishedPout.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  loweredLenses: {
    label: "Lowered Lenses",
    color: COLOR.nightShiftIndigo,
    image: "crits/chromeGirls/loweredLenses.webp",
    description: "Cuts every price in this building by 4.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.loweredLensesDiscount),
  },
  encore: {
    label: "Encore",
    color: COLOR.cyan,
    image: "crits/chromeGirls/encore.webp",
    description: "Grows this floor's level by 8% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.encoreGrowth),
  },
  highNote: {
    label: "High Note",
    color: COLOR.peppermintPink,
    image: "crits/chromeGirls/highNote.webp",
    description: "Grows this floor's level by 3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.highNoteGrowth),
  },
  platinumRecord: {
    label: "Platinum Record",
    color: COLOR.rainCheckBlue,
    image: "crits/chromeGirls/platinumRecord.webp",
    description: "Grows this floor's level by 25% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.platinumRecordGrowth),
  },
  silverTongue: {
    label: "Silver Tongue",
    color: COLOR.rainCheckBlue,
    image: "crits/chromeGirls/silverTongue.webp",
    description: "Grows this floor's level by 5% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.silverTongueGrowth),
  },
  standingOvation: {
    label: "Standing Ovation",
    color: COLOR.cyan,
    image: "crits/chromeGirls/standingOvation.webp",
    description: "Grows every unlocked floor's level by 4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.standingOvationGrowth),
  },
  bicepBooster: {
    label: "Bicep Booster",
    color: COLOR.overflowBlue,
    image: "crits/chromeGirls/bicepBooster.webp",
    description: "Grows this floor's level by 25.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.bicepBoosterGrowth),
  },
  blueBoltFlex: {
    label: "Blue Bolt Flex",
    color: COLOR.overflowBlue,
    image: "crits/chromeGirls/blueBoltFlex.webp",
    description: "Grows this floor's level by 25.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.blueBoltFlexGrowth),
  },
  chromeKnuckles: {
    label: "Chrome Knuckles",
    color: COLOR.fastForwardBlue,
    image: "crits/chromeGirls/chromeKnuckles.webp",
    description: "Grows this floor's level by 25.5% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.chromeKnucklesGrowth),
  },
  headsetMech: {
    label: "Headset Mech",
    color: COLOR.fastForwardBlue,
    image: "crits/chromeGirls/headsetMech.webp",
    description: "Grows this floor's level by 25.6% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.headsetMechGrowth),
  },
  pinkPiston: {
    label: "Pink Piston",
    color: COLOR.sameBoatCoral,
    image: "crits/chromeGirls/pinkPiston.webp",
    description: "Grows this floor's level by 25.7% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.pinkPistonGrowth),
  },
  silverMechSuit: {
    label: "Silver Mech Suit",
    color: COLOR.overflowBlue,
    image: "crits/chromeGirls/silverMechSuit.webp",
    description: "Grows this floor's level by 25.8% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.silverMechSuitGrowth),
  },
  topazCore: {
    label: "Topaz Core",
    color: COLOR.fastForwardBlue,
    image: "crits/chromeGirls/topazCore.webp",
    description: "Grows this floor's level by 25.9% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.topazCoreGrowth),
  },
  blueBelleWave: {
    label: "Blue Belle Wave",
    color: COLOR.nightOwlIndigo,
    image: "crits/chromeGirls/blueBelleWave.webp",
    description: "Adds 38.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.blueBelleWaveShare),
  },
  cherrySlit: {
    label: "Cherry Slit",
    color: COLOR.doubleDownCrimson,
    image: "crits/chromeGirls/cherrySlit.webp",
    description: "Adds 38.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.cherrySlitShare),
  },
  cobaltPose: {
    label: "Cobalt Pose",
    color: COLOR.overflowBlue,
    image: "crits/chromeGirls/cobaltPose.webp",
    description: "Adds 38.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.cobaltPoseShare),
  },
  hourglassHips: {
    label: "Hourglass Hips",
    color: COLOR.redActive,
    image: "crits/chromeGirls/hourglassHips.webp",
    description: "Adds 38.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.hourglassHipsShare),
  },
  midnightStrapless: {
    label: "Midnight Strapless",
    color: COLOR.nightOwlIndigo,
    image: "crits/chromeGirls/midnightStrapless.webp",
    description: "Adds 38.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.midnightStraplessShare),
  },
  pageantPump: {
    label: "Pageant Pump",
    color: COLOR.fastForwardBlue,
    image: "crits/chromeGirls/pageantPump.webp",
    description: "Adds 38.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pageantPumpShare),
  },
  pinkSash: {
    label: "Pink Sash",
    color: COLOR.fastForwardBlue,
    image: "crits/chromeGirls/pinkSash.webp",
    description: "Adds 39% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pinkSashShare),
  },
  plumPower: {
    label: "Plum Power",
    color: COLOR.nightOwlIndigo,
    image: "crits/chromeGirls/plumPower.webp",
    description: "Adds 39.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.plumPowerShare),
  },
  redVelvet: {
    label: "Red Velvet",
    color: COLOR.doubleDownCrimson,
    image: "crits/chromeGirls/redVelvet.webp",
    description: "Adds 39.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.redVelvetShare),
  },
  rougeNoir: {
    label: "Rouge Noir",
    color: COLOR.doubleDownCrimson,
    image: "crits/chromeGirls/rougeNoir.webp",
    description: "Adds 39.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rougeNoirShare),
  },
  royalDrape: {
    label: "Royal Drape",
    color: COLOR.overflowBlue,
    image: "crits/chromeGirls/royalDrape.webp",
    description: "Adds 39.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.royalDrapeShare),
  },
  rubyBallgown: {
    label: "Ruby Ballgown",
    color: COLOR.doubleDownCrimson,
    image: "crits/chromeGirls/rubyBallgown.webp",
    description: "Adds 39.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rubyBallgownShare),
  },
  sapphireGala: {
    label: "Sapphire Gala",
    color: COLOR.nightOwlIndigo,
    image: "crits/chromeGirls/sapphireGala.webp",
    description: "Adds 39.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sapphireGalaShare),
  },
  tealTress: {
    label: "Teal Tress",
    color: COLOR.overflowBlue,
    image: "crits/chromeGirls/tealTress.webp",
    description: "Adds 39.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.tealTressShare),
  },
  twilightGlam: {
    label: "Twilight Glam",
    color: COLOR.overflowBlue,
    image: "crits/chromeGirls/twilightGlam.webp",
    description: "Adds 39.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.twilightGlamShare),
  },
  twoToneTease: {
    label: "Two Tone Tease",
    color: COLOR.overflowBlue,
    image: "crits/chromeGirls/twoToneTease.webp",
    description: "Adds 40% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.twoToneTeaseShare),
  },
  violetFlex: {
    label: "Violet Flex",
    color: COLOR.nightShiftIndigo,
    image: "crits/chromeGirls/violetFlex.webp",
    description: "Adds 40.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.violetFlexShare),
  },
  satinSalute: {
    label: "Satin Salute",
    color: COLOR.doubleDownCrimson,
    image: "crits/chromeGirls/satinSalute.webp",
    description: "Adds 63.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.satinSaluteShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
