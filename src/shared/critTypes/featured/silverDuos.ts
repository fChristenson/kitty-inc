import type { SILVER_DUOS_CRITS } from "../../critData/silverDuos";
import type { FeaturedRewards } from "./types";

export const SILVER_DUOS_REWARDS = {
  ankleWrapDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.ankleWrapDuoShare, 1),
  baldAndBraided: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.baldAndBraidedShare, 2),
  baldBigGrins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.baldBigGrinsShare, 1),
  baldieBesties: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.baldieBestiesShare, 2),
  blondeBuzzcut: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.blondeBuzzcutShare, 1),
  blueLipsRecline: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.blueLipsReclineShare,
      2,
    ),
  blueLipstick: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.blueLipstickShare, 1),
  bobSquad: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.bobSquadShare, 2),
  braidAndBob: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.braidAndBobShare, 1),
  braidedPair: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.braidedPairShare, 2),
  bunAndBangs: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.bunAndBangsShare, 1),
  bunTopSwimsuits: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.bunTopSwimsuitsShare, 1),
  buzzAndBraid: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.buzzAndBraidShare, 2),
  candyHairCrew: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.candyHairCrewShare, 2),
  chromeDomes: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.chromeDomesShare, 1),
  cockyGrins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cockyGrinsShare, 1),
  cocoaCropTop: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.cocoaCropTopShare, 2),
  coralPads: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.coralPadsShare, 2),
  coralTopBobs: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.coralTopBobsShare, 1),
  crimsonTopSpread: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.crimsonTopSpreadShare,
      2,
    ),
  crossedArms: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.crossedArmsShare, 1),
  crossedLegsChill: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.crossedLegsChillShare,
      2,
    ),
  cueBallCuties: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cueBallCutiesShare, 1),
  curvyCuddle: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.curvyCuddleShare, 2),
  cyanCuddle: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cyanCuddleShare, 1),
  darkBobTwins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.darkBobTwinsShare, 2),
  earringEnvy: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.earringEnvyShare, 1),
  ebonyAndIvory: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.ebonyAndIvoryShare, 2),
  eclipseBuns: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.eclipseBunsShare, 1),
  frontRowFeet: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.frontRowFeetShare, 2),
  glossySuits: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.glossySuitsShare, 1),
  goldAndOnyx: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.goldAndOnyxShare, 2),
  goldHoops: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goldHoopsShare, 1),
  goldRimGlow: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.goldRimGlowShare, 2),
  goldStudGrins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goldStudGrinsShare, 1),
  greenShortsTwins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.greenShortsTwinsShare,
      2,
    ),
  greyLeggings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.greyLeggingsShare, 2),
  gymMat: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.gymMatShare, 2),
  hairGelPair: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.hairGelPairShare, 1),
  handsPlanted: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.handsPlantedShare, 1),
  highPonytailPair: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      context.floors,
      balance.highPonytailPairShare,
      1,
    ),
  indigoUpdo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.indigoUpdoShare, 2),
  jumboSoles: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.jumboSolesShare, 1),
  kneeHuggers: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.kneeHuggersShare, 2),
  kneesUp: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.kneesUpShare, 1),
  leanBackLasses: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.leanBackLassesShare, 2),
  legWarmers: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.legWarmersShare, 1),
  lemonShorts: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.lemonShortsShare, 2),
  leotardLineup: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.leotardLineupShare, 1),
  limePiping: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.limePipingShare, 2),
  limeSneaker: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.limeSneakerShare, 1),
  longPonytailRecline: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.longPonytailReclineShare,
      2,
    ),
  lotusLounge: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.lotusLoungeShare, 1),
  metallicBraDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.metallicBraDuoShare, 2),
  midnightManeSprawl: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      context.floors,
      balance.midnightManeSprawlShare,
      1,
    ),
  mintAndMarigold: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.mintAndMarigoldShare,
      2,
    ),
  mirrorPixies: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.mirrorPixiesShare, 1),
  mohawkAndBraid: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.mohawkAndBraidShare, 2),
  mohawkMates: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.mohawkMatesShare, 1),
  mustardTights: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.mustardTightsShare, 2),
  neonBraids: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.neonBraidsShare, 1),
  neonLeggings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.neonLeggingsShare, 2),
  neonStripeLean: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.neonStripeLeanShare, 1),
  orangeLeggings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.orangeLeggingsShare, 2),
  orangeTankBun: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.orangeTankBunShare, 2),
  pinkHeadband: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.pinkHeadbandShare, 2),
  pinkyLink: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.pinkyLinkShare, 2),
  pintSizePals: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.pintSizePalsShare, 2),
  pixieAndPlait: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.pixieAndPlaitShare, 2),
  pixieAndPonytail: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      context.floors,
      balance.pixieAndPonytailShare,
      1,
    ),
  pixieBesties: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.pixieBestiesShare, 1),
  pixieCutPals: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.pixieCutPalsShare, 1),
  platinumPixie: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.platinumPixieShare, 1),
  plumAndMustard: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.plumAndMustardShare, 1),
  primAndProper: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.primAndProperShare, 1),
  purpleAndLime: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.purpleAndLimeShare, 2),
  rainbowAnklets: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.rainbowAnkletsShare, 1),
  ravenHairPals: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.ravenHairPalsShare, 2),
  redBunBuddy: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.redBunBuddyShare, 1),
  ropeBraidRest: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.ropeBraidRestShare, 2),
  rustAndNavy: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.rustAndNavyShare, 1),
  rustTopWristbands: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.rustTopWristbandsShare,
      2,
    ),
  shySitters: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.shySittersShare, 1),
  sideBySide: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.sideBySideShare, 2),
  slickBackDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.slickBackDuoShare, 1),
  snowAndSeafoam: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.snowAndSeafoamShare, 2),
  snowyBob: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.snowyBobShare, 1),
  solesUpFront: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.solesUpFrontShare, 2),
  squeezeTight: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.squeezeTightShare, 1),
  stickerSisters: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.stickerSistersShare, 2),
  sweatbandSquad: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.sweatbandSquadShare, 1),
  sweatpantsSmiles: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.sweatpantsSmilesShare,
      2,
    ),
  tangerineShorts: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tangerineShortsShare, 1),
  tealPixie: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tealPixieShare, 1),
  tealTrim: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.tealTrimShare, 2),
  tealWristbands: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tealWristbandsShare, 1),
  twinBobTiptoes: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.twinBobTiptoesShare, 2),
  twinCrops: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.twinCropsShare, 1),
  twoToneTop: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.twoToneTopShare, 2),
  undercutBraidDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      context.floors,
      balance.undercutBraidDuoShare,
      1,
    ),
  wideSitBraid: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.wideSitBraidShare, 2),
  wristbandHuddle: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.wristbandHuddleShare, 1),
  yellowMane: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.yellowManeShare, 2),
  zigzagLeotards: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.zigzagLeotardsShare, 2),
  zipSuitSisters: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.zipSuitSistersShare, 2),
  baldAndSidecut: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.baldAndSidecutShare, 2),
  boxBraidsBlush: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.boxBraidsBlushShare, 1),
  buzzcutTwins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.buzzcutTwinsShare, 1),
  jetBlackLocks: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.jetBlackLocksShare, 1),
  limePonytail: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.limePonytailShare, 1),
  mintGlowLounge: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.mintGlowLoungeShare, 2),
  pinkStripeLeggings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      context.floors,
      balance.pinkStripeLeggingsShare,
      1,
    ),
  plumLipsPower: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.plumLipsPowerShare, 2),
  sapphirePixie: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.sapphirePixieShare, 1),
  silverPonytailLean: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.silverPonytailLeanShare,
      2,
    ),
  spikyCropBraid: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.spikyCropBraidShare, 1),
  tealStreakHair: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.tealStreakHairShare, 2),
  tealUnitard: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tealUnitardShare, 1),
  topKnotDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.topKnotDuoShare, 2),
  turtleneckBob: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.turtleneckBobShare, 1),
  wavyLocksLean: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.wavyLocksLeanShare, 2),
  yellowSoleTrim: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.yellowSoleTrimShare, 1),
  yellowWaistband: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.yellowWaistbandShare,
      2,
    ),
  ballroomSnapshot: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.ballroomSnapshotSeconds),
  bangsAndBlues: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bangsAndBluesSeconds),
  bigSmile: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bigSmileSeconds),
  blackTieBall: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.blackTieBallSeconds),
  blueSteelRedHot: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.blueSteelRedHotSeconds),
  bodiceBulk: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bodiceBulkSeconds),
  capeSwish: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.capeSwishSeconds),
  cocktailHour: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cocktailHourSeconds),
  cuddleUp: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cuddleUpSeconds),
  discoDiva: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.discoDivaSeconds),
  fuchsiaFortress: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.fuchsiaFortressShare),
  halterHuddle: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.halterHuddleShare),
  helloGorgeous: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.helloGorgeousShare),
  hugItOut: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hugItOutShare),
  jadeGiantess: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.jadeGiantessShare),
  jewelTones: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.jewelTonesShare),
  matchingTrims: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.matchingTrimsShare),
  merlotMoment: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.merlotMomentShare),
  mermaidTail: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.mermaidTailShare),
  navyShimmer: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.navyShimmerShare),
  offTheShoulder: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.offTheShoulderShare),
  photoBooth: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.photoBoothShare),
  pixieCuts: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pixieCutsShare),
  ponytailPride: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.ponytailPrideShare),
  poutAndPose: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.poutAndPoseShare),
  powerBun: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.powerBunShare),
  promenade: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.promenadeShare),
  proudGuardian: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.proudGuardianShare),
  purpleReign: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.purpleReignShare),
  rainbowHem: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rainbowHemShare),
  sequinSqueeze: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sequinSqueezeShare),
  slenderSwirl: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.slenderSwirlShare),
  smirkAndWink: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.smirkAndWinkShare),
  sunnyCurls: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sunnyCurlsShare),
  tallAndTiny: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tallAndTinyShare),
  chinLift: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.chinLiftShare),
  earringGlint: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.earringGlintShare),
  jadeAndNavy: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.jadeAndNavyShare),
  pinkGloves: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkGlovesShare),
} satisfies FeaturedRewards<typeof SILVER_DUOS_CRITS>;
