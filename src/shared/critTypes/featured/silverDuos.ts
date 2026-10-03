import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const SILVER_DUOS_CRITS = {
  ankleWrapDuo: {
    label: "Ankle Wrap Duo",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/ankleWrapDuo.webp",
    description: "Promotes 5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.ankleWrapDuoShare, 1),
  },
  baldAndBraided: {
    label: "Bald And Braided",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/baldAndBraided.webp",
    description: "Promotes 25% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.baldAndBraidedShare, 2),
  },
  baldBigGrins: {
    label: "Bald Big Grins",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/baldBigGrins.webp",
    description: "Promotes 20% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.baldBigGrinsShare, 1),
  },
  baldieBesties: {
    label: "Baldie Besties",
    color: COLOR.peppermintPink,
    image: "crits/silverDuos/baldieBesties.webp",
    description: "Promotes 60% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.baldieBestiesShare, 2),
  },
  blondeBuzzcut: {
    label: "Blonde Buzzcut",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/blondeBuzzcut.webp",
    description: "Promotes 5.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.blondeBuzzcutShare, 1),
  },
  blueLipsRecline: {
    label: "Blue Lips Recline",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/blueLipsRecline.webp",
    description: "Promotes 25.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.blueLipsReclineShare,
        2,
      ),
  },
  blueLipstick: {
    label: "Blue Lipstick",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/blueLipstick.webp",
    description: "Promotes 55% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.blueLipstickShare, 1),
  },
  bobSquad: {
    label: "Bob Squad",
    color: COLOR.cyan,
    image: "crits/silverDuos/bobSquad.webp",
    description: "Promotes 40% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.bobSquadShare, 2),
  },
  braidAndBob: {
    label: "Braid And Bob",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/braidAndBob.webp",
    description: "Promotes 6% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.braidAndBobShare, 1),
  },
  braidedPair: {
    label: "Braided Pair",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/braidedPair.webp",
    description: "Promotes 26% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.braidedPairShare, 2),
  },
  bunAndBangs: {
    label: "Bun And Bangs",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/bunAndBangs.webp",
    description: "Promotes 80% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.bunAndBangsShare, 1),
  },
  bunTopSwimsuits: {
    label: "Bun Top Swimsuits",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/bunTopSwimsuits.webp",
    description: "Promotes 6.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.bunTopSwimsuitsShare, 1),
  },
  buzzAndBraid: {
    label: "Buzz And Braid",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/buzzAndBraid.webp",
    description: "Promotes 60.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.buzzAndBraidShare, 2),
  },
  candyHairCrew: {
    label: "Candy Hair Crew",
    color: COLOR.teal,
    image: "crits/silverDuos/candyHairCrew.webp",
    description: "Promotes 40.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.candyHairCrewShare, 2),
  },
  chromeDomes: {
    label: "Chrome Domes",
    color: COLOR.teal,
    image: "crits/silverDuos/chromeDomes.webp",
    description: "Promotes 10% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.chromeDomesShare, 1),
  },
  cockyGrins: {
    label: "Cocky Grins",
    color: COLOR.springCleaningMint,
    image: "crits/silverDuos/cockyGrins.webp",
    description: "Promotes 7% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.cockyGrinsShare, 1),
  },
  cocoaCropTop: {
    label: "Cocoa Crop Top",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/cocoaCropTop.webp",
    description: "Promotes 41% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.cocoaCropTopShare, 2),
  },
  coralPads: {
    label: "Coral Pads",
    color: COLOR.teamBuildingCoral,
    image: "crits/silverDuos/coralPads.webp",
    description: "Promotes 26.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.coralPadsShare, 2),
  },
  coralTopBobs: {
    label: "Coral Top Bobs",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/coralTopBobs.webp",
    description: "Promotes 10.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.coralTopBobsShare, 1),
  },
  crimsonTopSpread: {
    label: "Crimson Top Spread",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/crimsonTopSpread.webp",
    description: "Promotes 27% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.crimsonTopSpreadShare,
        2,
      ),
  },
  crossedArms: {
    label: "Crossed Arms",
    color: COLOR.teal,
    image: "crits/silverDuos/crossedArms.webp",
    description: "Promotes 11% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.crossedArmsShare, 1),
  },
  crossedLegsChill: {
    label: "Crossed Legs Chill",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/crossedLegsChill.webp",
    description: "Promotes 27.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.crossedLegsChillShare,
        2,
      ),
  },
  cueBallCuties: {
    label: "Cue Ball Cuties",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/cueBallCuties.webp",
    description: "Promotes 11.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.cueBallCutiesShare, 1),
  },
  curvyCuddle: {
    label: "Curvy Cuddle",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/curvyCuddle.webp",
    description: "Promotes 28% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.curvyCuddleShare, 2),
  },
  cyanCuddle: {
    label: "Cyan Cuddle",
    color: COLOR.cyan,
    image: "crits/silverDuos/cyanCuddle.webp",
    description: "Promotes 12% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.cyanCuddleShare, 1),
  },
  darkBobTwins: {
    label: "Dark Bob Twins",
    color: COLOR.peppermintPink,
    image: "crits/silverDuos/darkBobTwins.webp",
    description: "Promotes 28.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.darkBobTwinsShare, 2),
  },
  earringEnvy: {
    label: "Earring Envy",
    color: COLOR.springCleaningMint,
    image: "crits/silverDuos/earringEnvy.webp",
    description: "Promotes 12.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.earringEnvyShare, 1),
  },
  ebonyAndIvory: {
    label: "Ebony And Ivory",
    color: COLOR.peppermintPink,
    image: "crits/silverDuos/ebonyAndIvory.webp",
    description: "Promotes 29% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.ebonyAndIvoryShare, 2),
  },
  eclipseBuns: {
    label: "Eclipse Buns",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/eclipseBuns.webp",
    description: "Promotes 13% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.eclipseBunsShare, 1),
  },
  frontRowFeet: {
    label: "Front Row Feet",
    color: COLOR.teal,
    image: "crits/silverDuos/frontRowFeet.webp",
    description: "Promotes 29.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.frontRowFeetShare, 2),
  },
  glossySuits: {
    label: "Glossy Suits",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/glossySuits.webp",
    description: "Promotes 13.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.glossySuitsShare, 1),
  },
  goldAndOnyx: {
    label: "Gold And Onyx",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/goldAndOnyx.webp",
    description: "Promotes 30% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.goldAndOnyxShare, 2),
  },
  goldHoops: {
    label: "Gold Hoops",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/goldHoops.webp",
    description: "Promotes 14% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.goldHoopsShare, 1),
  },
  goldRimGlow: {
    label: "Gold Rim Glow",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/goldRimGlow.webp",
    description: "Promotes 30.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.goldRimGlowShare, 2),
  },
  goldStudGrins: {
    label: "Gold Stud Grins",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/goldStudGrins.webp",
    description: "Promotes 14.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.goldStudGrinsShare, 1),
  },
  greenShortsTwins: {
    label: "Green Shorts Twins",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/greenShortsTwins.webp",
    description: "Promotes 31% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.greenShortsTwinsShare,
        2,
      ),
  },
  greyLeggings: {
    label: "Grey Leggings",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/greyLeggings.webp",
    description: "Promotes 31.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.greyLeggingsShare, 2),
  },
  gymMat: {
    label: "Gym Mat",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/gymMat.webp",
    description: "Promotes 32% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.gymMatShare, 2),
  },
  hairGelPair: {
    label: "Hair Gel Pair",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/hairGelPair.webp",
    description: "Promotes 20.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.hairGelPairShare, 1),
  },
  handsPlanted: {
    label: "Hands Planted",
    color: COLOR.springCleaningMint,
    image: "crits/silverDuos/handsPlanted.webp",
    description: "Promotes 21% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.handsPlantedShare, 1),
  },
  highPonytailPair: {
    label: "High Ponytail Pair",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/highPonytailPair.webp",
    description: "Promotes 21.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        context.floors,
        balance.highPonytailPairShare,
        1,
      ),
  },
  indigoUpdo: {
    label: "Indigo Updo",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/indigoUpdo.webp",
    description: "Promotes 41.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.indigoUpdoShare, 2),
  },
  jumboSoles: {
    label: "Jumbo Soles",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/jumboSoles.webp",
    description: "Promotes 22% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.jumboSolesShare, 1),
  },
  kneeHuggers: {
    label: "Knee Huggers",
    color: COLOR.springCleaningMint,
    image: "crits/silverDuos/kneeHuggers.webp",
    description: "Promotes 42% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.kneeHuggersShare, 2),
  },
  kneesUp: {
    label: "Knees Up",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/kneesUp.webp",
    description: "Promotes 22.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.kneesUpShare, 1),
  },
  leanBackLasses: {
    label: "Lean Back Lasses",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/leanBackLasses.webp",
    description: "Promotes 42.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.leanBackLassesShare, 2),
  },
  legWarmers: {
    label: "Leg Warmers",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/legWarmers.webp",
    description: "Promotes 23% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.legWarmersShare, 1),
  },
  lemonShorts: {
    label: "Lemon Shorts",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/lemonShorts.webp",
    description: "Promotes 43% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.lemonShortsShare, 2),
  },
  leotardLineup: {
    label: "Leotard Lineup",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/leotardLineup.webp",
    description: "Promotes 23.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.leotardLineupShare, 1),
  },
  limePiping: {
    label: "Lime Piping",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/limePiping.webp",
    description: "Promotes 43.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.limePipingShare, 2),
  },
  limeSneaker: {
    label: "Lime Sneaker",
    color: COLOR.peppermintPink,
    image: "crits/silverDuos/limeSneaker.webp",
    description: "Promotes 24% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.limeSneakerShare, 1),
  },
  longPonytailRecline: {
    label: "Long Ponytail Recline",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/longPonytailRecline.webp",
    description: "Promotes 44% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.longPonytailReclineShare,
        2,
      ),
  },
  lotusLounge: {
    label: "Lotus Lounge",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/lotusLounge.webp",
    description: "Promotes 24.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.lotusLoungeShare, 1),
  },
  metallicBraDuo: {
    label: "Metallic Bra Duo",
    color: COLOR.disabledGray,
    image: "crits/silverDuos/metallicBraDuo.webp",
    description: "Promotes 44.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.metallicBraDuoShare, 2),
  },
  midnightManeSprawl: {
    label: "Midnight Mane Sprawl",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/midnightManeSprawl.webp",
    description: "Promotes 25% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        context.floors,
        balance.midnightManeSprawlShare,
        1,
      ),
  },
  mintAndMarigold: {
    label: "Mint And Marigold",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/mintAndMarigold.webp",
    description: "Promotes 45% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.mintAndMarigoldShare,
        2,
      ),
  },
  mirrorPixies: {
    label: "Mirror Pixies",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/mirrorPixies.webp",
    description: "Promotes 25.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.mirrorPixiesShare, 1),
  },
  mohawkAndBraid: {
    label: "Mohawk And Braid",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/mohawkAndBraid.webp",
    description: "Promotes 45.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.mohawkAndBraidShare, 2),
  },
  mohawkMates: {
    label: "Mohawk Mates",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/mohawkMates.webp",
    description: "Promotes 26% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.mohawkMatesShare, 1),
  },
  mustardTights: {
    label: "Mustard Tights",
    color: COLOR.sunshineGold,
    image: "crits/silverDuos/mustardTights.webp",
    description: "Promotes 46% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.mustardTightsShare, 2),
  },
  neonBraids: {
    label: "Neon Braids",
    color: COLOR.sameBoatCoral,
    image: "crits/silverDuos/neonBraids.webp",
    description: "Promotes 26.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.neonBraidsShare, 1),
  },
  neonLeggings: {
    label: "Neon Leggings",
    color: COLOR.peppermintPink,
    image: "crits/silverDuos/neonLeggings.webp",
    description: "Promotes 46.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.neonLeggingsShare, 2),
  },
  neonStripeLean: {
    label: "Neon Stripe Lean",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/neonStripeLean.webp",
    description: "Promotes 27% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.neonStripeLeanShare, 1),
  },
  orangeLeggings: {
    label: "Orange Leggings",
    color: COLOR.roundUpOrange,
    image: "crits/silverDuos/orangeLeggings.webp",
    description: "Promotes 47% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.orangeLeggingsShare, 2),
  },
  orangeTankBun: {
    label: "Orange Tank Bun",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/orangeTankBun.webp",
    description: "Promotes 47.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.orangeTankBunShare, 2),
  },
  pinkHeadband: {
    label: "Pink Headband",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/pinkHeadband.webp",
    description: "Promotes 48% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.pinkHeadbandShare, 2),
  },
  pinkyLink: {
    label: "Pinky Link",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/pinkyLink.webp",
    description: "Promotes 48.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.pinkyLinkShare, 2),
  },
  pintSizePals: {
    label: "Pint Size Pals",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/pintSizePals.webp",
    description: "Promotes 49% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.pintSizePalsShare, 2),
  },
  pixieAndPlait: {
    label: "Pixie And Plait",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/pixieAndPlait.webp",
    description: "Promotes 49.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.pixieAndPlaitShare, 2),
  },
  pixieAndPonytail: {
    label: "Pixie And Ponytail",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/pixieAndPonytail.webp",
    description: "Promotes 35% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        context.floors,
        balance.pixieAndPonytailShare,
        1,
      ),
  },
  pixieBesties: {
    label: "Pixie Besties",
    color: COLOR.springCleaningMint,
    image: "crits/silverDuos/pixieBesties.webp",
    description: "Promotes 35.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.pixieBestiesShare, 1),
  },
  pixieCutPals: {
    label: "Pixie Cut Pals",
    color: COLOR.coffeeRunTeal,
    image: "crits/silverDuos/pixieCutPals.webp",
    description: "Promotes 36% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.pixieCutPalsShare, 1),
  },
  platinumPixie: {
    label: "Platinum Pixie",
    color: COLOR.springCleaningMint,
    image: "crits/silverDuos/platinumPixie.webp",
    description: "Promotes 36.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.platinumPixieShare, 1),
  },
  plumAndMustard: {
    label: "Plum And Mustard",
    color: COLOR.springCleaningMint,
    image: "crits/silverDuos/plumAndMustard.webp",
    description: "Promotes 37% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.plumAndMustardShare, 1),
  },
  primAndProper: {
    label: "Prim And Proper",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/primAndProper.webp",
    description: "Promotes 37.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.primAndProperShare, 1),
  },
  purpleAndLime: {
    label: "Purple And Lime",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/silverDuos/purpleAndLime.webp",
    description: "Promotes 61% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.purpleAndLimeShare, 2),
  },
  rainbowAnklets: {
    label: "Rainbow Anklets",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/rainbowAnklets.webp",
    description: "Promotes 38% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.rainbowAnkletsShare, 1),
  },
  ravenHairPals: {
    label: "Raven Hair Pals",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/ravenHairPals.webp",
    description: "Promotes 61.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.ravenHairPalsShare, 2),
  },
  redBunBuddy: {
    label: "Red Bun Buddy",
    color: COLOR.springCleaningMint,
    image: "crits/silverDuos/redBunBuddy.webp",
    description: "Promotes 38.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.redBunBuddyShare, 1),
  },
  ropeBraidRest: {
    label: "Rope Braid Rest",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/ropeBraidRest.webp",
    description: "Promotes 62% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.ropeBraidRestShare, 2),
  },
  rustAndNavy: {
    label: "Rust And Navy",
    color: COLOR.nightShiftIndigo,
    image: "crits/silverDuos/rustAndNavy.webp",
    description: "Promotes 39% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.rustAndNavyShare, 1),
  },
  rustTopWristbands: {
    label: "Rust Top Wristbands",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/rustTopWristbands.webp",
    description: "Promotes 62.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.rustTopWristbandsShare,
        2,
      ),
  },
  shySitters: {
    label: "Shy Sitters",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/shySitters.webp",
    description: "Promotes 39.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.shySittersShare, 1),
  },
  sideBySide: {
    label: "Side By Side",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/sideBySide.webp",
    description: "Promotes 63% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.sideBySideShare, 2),
  },
  slickBackDuo: {
    label: "Slick Back Duo",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/slickBackDuo.webp",
    description: "Promotes 40% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.slickBackDuoShare, 1),
  },
  snowAndSeafoam: {
    label: "Snow And Seafoam",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/snowAndSeafoam.webp",
    description: "Promotes 63.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.snowAndSeafoamShare, 2),
  },
  snowyBob: {
    label: "Snowy Bob",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/snowyBob.webp",
    description: "Promotes 40.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.snowyBobShare, 1),
  },
  solesUpFront: {
    label: "Soles Up Front",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/solesUpFront.webp",
    description: "Promotes 64% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.solesUpFrontShare, 2),
  },
  squeezeTight: {
    label: "Squeeze Tight",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/squeezeTight.webp",
    description: "Promotes 41% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.squeezeTightShare, 1),
  },
  stickerSisters: {
    label: "Sticker Sisters",
    color: COLOR.teal,
    image: "crits/silverDuos/stickerSisters.webp",
    description: "Promotes 64.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.stickerSistersShare, 2),
  },
  sweatbandSquad: {
    label: "Sweatband Squad",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/sweatbandSquad.webp",
    description: "Promotes 41.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.sweatbandSquadShare, 1),
  },
  sweatpantsSmiles: {
    label: "Sweatpants Smiles",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/sweatpantsSmiles.webp",
    description: "Promotes 65% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.sweatpantsSmilesShare,
        2,
      ),
  },
  tangerineShorts: {
    label: "Tangerine Shorts",
    color: COLOR.roundUpOrange,
    image: "crits/silverDuos/tangerineShorts.webp",
    description: "Promotes 42% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.tangerineShortsShare, 1),
  },
  tealAndPinkKicks: {
    label: "Teal And Pink Kicks",
    color: COLOR.peppermintPink,
    image: "crits/silverDuos/tealAndPinkKicks.webp",
    description: "Promotes 65.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.tealAndPinkKicksShare,
        2,
      ),
  },
  tealPixie: {
    label: "Teal Pixie",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/tealPixie.webp",
    description: "Promotes 42.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.tealPixieShare, 1),
  },
  tealTrim: {
    label: "Teal Trim",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/tealTrim.webp",
    description: "Promotes 66% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.tealTrimShare, 2),
  },
  tealWristbands: {
    label: "Teal Wristbands",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/tealWristbands.webp",
    description: "Promotes 43% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.tealWristbandsShare, 1),
  },
  twinBobTiptoes: {
    label: "Twin Bob Tiptoes",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/twinBobTiptoes.webp",
    description: "Promotes 66.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.twinBobTiptoesShare, 2),
  },
  twinCrops: {
    label: "Twin Crops",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/twinCrops.webp",
    description: "Promotes 43.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.twinCropsShare, 1),
  },
  twoToneTop: {
    label: "Two Tone Top",
    color: COLOR.peppermintPink,
    image: "crits/silverDuos/twoToneTop.webp",
    description: "Promotes 67% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.twoToneTopShare, 2),
  },
  undercutBraidDuo: {
    label: "Undercut Braid Duo",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/undercutBraidDuo.webp",
    description: "Promotes 44% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        context.floors,
        balance.undercutBraidDuoShare,
        1,
      ),
  },
  wideSitBraid: {
    label: "Wide Sit Braid",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/wideSitBraid.webp",
    description: "Promotes 67.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.wideSitBraidShare, 2),
  },
  wristbandHuddle: {
    label: "Wristband Huddle",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/wristbandHuddle.webp",
    description: "Promotes 44.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.wristbandHuddleShare, 1),
  },
  yellowMane: {
    label: "Yellow Mane",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/yellowMane.webp",
    description: "Promotes 68% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.yellowManeShare, 2),
  },
  zigzagLeotards: {
    label: "Zigzag Leotards",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/zigzagLeotards.webp",
    description: "Promotes 68.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.zigzagLeotardsShare, 2),
  },
  zipSuitSisters: {
    label: "Zip Suit Sisters",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/zipSuitSisters.webp",
    description: "Promotes 69% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.zipSuitSistersShare, 2),
  },
  baldAndSidecut: {
    label: "Bald And Sidecut",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/baldAndSidecut.webp",
    description: "Promotes 69.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.baldAndSidecutShare, 2),
  },
  boxBraidsBlush: {
    label: "Box Braids Blush",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/boxBraidsBlush.webp",
    description: "Promotes 55.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.boxBraidsBlushShare, 1),
  },
  buzzcutTwins: {
    label: "Buzzcut Twins",
    color: COLOR.rainCheckBlue,
    image: "crits/silverDuos/buzzcutTwins.webp",
    description: "Promotes 56% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.buzzcutTwinsShare, 1),
  },
  jetBlackLocks: {
    label: "Jet Black Locks",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/jetBlackLocks.webp",
    description: "Promotes 56.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.jetBlackLocksShare, 1),
  },
  limePonytail: {
    label: "Lime Ponytail",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/limePonytail.webp",
    description: "Promotes 57% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.limePonytailShare, 1),
  },
  mintGlowLounge: {
    label: "Mint Glow Lounge",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/mintGlowLounge.webp",
    description: "Promotes 80% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.mintGlowLoungeShare, 2),
  },
  pinkStripeLeggings: {
    label: "Pink Stripe Leggings",
    color: COLOR.nightShiftIndigo,
    image: "crits/silverDuos/pinkStripeLeggings.webp",
    description: "Promotes 57.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        context.floors,
        balance.pinkStripeLeggingsShare,
        1,
      ),
  },
  plumLipsPower: {
    label: "Plum Lips Power",
    color: COLOR.springCleaningMint,
    image: "crits/silverDuos/plumLipsPower.webp",
    description: "Promotes 80.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.plumLipsPowerShare, 2),
  },
  sapphirePixie: {
    label: "Sapphire Pixie",
    color: COLOR.nightOwlIndigo,
    image: "crits/silverDuos/sapphirePixie.webp",
    description: "Promotes 58% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.sapphirePixieShare, 1),
  },
  silverPonytailLean: {
    label: "Silver Ponytail Lean",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/silverPonytailLean.webp",
    description: "Promotes 81% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.silverPonytailLeanShare,
        2,
      ),
  },
  spikyCropBraid: {
    label: "Spiky Crop Braid",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/spikyCropBraid.webp",
    description: "Promotes 58.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.spikyCropBraidShare, 1),
  },
  tealStreakHair: {
    label: "Teal Streak Hair",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/tealStreakHair.webp",
    description: "Promotes 81.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.tealStreakHairShare, 2),
  },
  tealUnitard: {
    label: "Teal Unitard",
    color: COLOR.coffeeRunTeal,
    image: "crits/silverDuos/tealUnitard.webp",
    description: "Promotes 59% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.tealUnitardShare, 1),
  },
  topKnotDuo: {
    label: "Top Knot Duo",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/topKnotDuo.webp",
    description: "Promotes 82% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.topKnotDuoShare, 2),
  },
  turtleneckBob: {
    label: "Turtleneck Bob",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/turtleneckBob.webp",
    description: "Promotes 59.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.turtleneckBobShare, 1),
  },
  wavyLocksLean: {
    label: "Wavy Locks Lean",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/wavyLocksLean.webp",
    description: "Promotes 82.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.wavyLocksLeanShare, 2),
  },
  yellowSoleTrim: {
    label: "Yellow Sole Trim",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/yellowSoleTrim.webp",
    description: "Promotes 60% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.yellowSoleTrimShare, 1),
  },
  yellowWaistband: {
    label: "Yellow Waistband",
    color: COLOR.fastForwardBlue,
    image: "crits/silverDuos/yellowWaistband.webp",
    description: "Promotes 83% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(
        [context.floor],
        balance.yellowWaistbandShare,
        2,
      ),
  },
  ballroomSnapshot: {
    label: "Ballroom Snapshot",
    color: COLOR.doubleDownCrimson,
    image: "crits/silverDuos/ballroomSnapshot.webp",
    description: "Adds 157s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.ballroomSnapshotSeconds),
  },
  bangsAndBlues: {
    label: "Bangs And Blues",
    color: COLOR.nightOwlIndigo,
    image: "crits/silverDuos/bangsAndBlues.webp",
    description: "Adds 158s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.bangsAndBluesSeconds),
  },
  bigSmile: {
    label: "Big Smile",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/bigSmile.webp",
    description: "Adds 159s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.bigSmileSeconds),
  },
  blackTieBall: {
    label: "Black Tie Ball",
    color: COLOR.nightShiftIndigo,
    image: "crits/silverDuos/blackTieBall.webp",
    description: "Adds 160s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.blackTieBallSeconds),
  },
  blueSteelRedHot: {
    label: "Blue Steel Red Hot",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/blueSteelRedHot.webp",
    description: "Adds 161s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.blueSteelRedHotSeconds),
  },
  bodiceBulk: {
    label: "Bodice Bulk",
    color: COLOR.nightOwlIndigo,
    image: "crits/silverDuos/bodiceBulk.webp",
    description: "Adds 162s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.bodiceBulkSeconds),
  },
  capeSwish: {
    label: "Cape Swish",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/capeSwish.webp",
    description: "Adds 164s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.capeSwishSeconds),
  },
  cocktailHour: {
    label: "Cocktail Hour",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/cocktailHour.webp",
    description: "Adds 165s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.cocktailHourSeconds),
  },
  cuddleUp: {
    label: "Cuddle Up",
    color: COLOR.redActive,
    image: "crits/silverDuos/cuddleUp.webp",
    description: "Adds 166s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.cuddleUpSeconds),
  },
  discoDiva: {
    label: "Disco Diva",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/discoDiva.webp",
    description: "Adds 167s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.discoDivaSeconds),
  },
  fuchsiaFortress: {
    label: "Fuchsia Fortress",
    color: COLOR.fullHouseCrimson,
    image: "crits/silverDuos/fuchsiaFortress.webp",
    description: "Adds 60.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.fuchsiaFortressShare),
  },
  halterHuddle: {
    label: "Halter Huddle",
    color: COLOR.redActive,
    image: "crits/silverDuos/halterHuddle.webp",
    description: "Adds 60.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.halterHuddleShare),
  },
  helloGorgeous: {
    label: "Hello Gorgeous",
    color: COLOR.nightShiftIndigo,
    image: "crits/silverDuos/helloGorgeous.webp",
    description: "Adds 60.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.helloGorgeousShare),
  },
  hugItOut: {
    label: "Hug It Out",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/hugItOut.webp",
    description: "Adds 60.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.hugItOutShare),
  },
  jadeGiantess: {
    label: "Jade Giantess",
    color: COLOR.dressCodeGreen,
    image: "crits/silverDuos/jadeGiantess.webp",
    description: "Adds 60.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.jadeGiantessShare),
  },
  jewelTones: {
    label: "Jewel Tones",
    color: COLOR.doubleDownCrimson,
    image: "crits/silverDuos/jewelTones.webp",
    description: "Adds 60.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.jewelTonesShare),
  },
  matchingTrims: {
    label: "Matching Trims",
    color: COLOR.nightOwlIndigo,
    image: "crits/silverDuos/matchingTrims.webp",
    description: "Adds 60.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.matchingTrimsShare),
  },
  merlotMoment: {
    label: "Merlot Moment",
    color: COLOR.nightOwlIndigo,
    image: "crits/silverDuos/merlotMoment.webp",
    description: "Adds 60.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.merlotMomentShare),
  },
  mermaidTail: {
    label: "Mermaid Tail",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/mermaidTail.webp",
    description: "Adds 60.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.mermaidTailShare),
  },
  navyShimmer: {
    label: "Navy Shimmer",
    color: COLOR.nightOwlIndigo,
    image: "crits/silverDuos/navyShimmer.webp",
    description: "Adds 61% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.navyShimmerShare),
  },
  offTheShoulder: {
    label: "Off The Shoulder",
    color: COLOR.nightShiftIndigo,
    image: "crits/silverDuos/offTheShoulder.webp",
    description: "Adds 61.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.offTheShoulderShare),
  },
  photoBooth: {
    label: "Photo Booth",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/photoBooth.webp",
    description: "Adds 61.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.photoBoothShare),
  },
  pixieCuts: {
    label: "Pixie Cuts",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/pixieCuts.webp",
    description: "Adds 61.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pixieCutsShare),
  },
  ponytailPride: {
    label: "Ponytail Pride",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/ponytailPride.webp",
    description: "Adds 61.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.ponytailPrideShare),
  },
  poutAndPose: {
    label: "Pout And Pose",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/poutAndPose.webp",
    description: "Adds 61.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.poutAndPoseShare),
  },
  powerBun: {
    label: "Power Bun",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/powerBun.webp",
    description: "Adds 61.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.powerBunShare),
  },
  promenade: {
    label: "Promenade",
    color: COLOR.nightShiftIndigo,
    image: "crits/silverDuos/promenade.webp",
    description: "Adds 61.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.promenadeShare),
  },
  proudGuardian: {
    label: "Proud Guardian",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/proudGuardian.webp",
    description: "Adds 61.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.proudGuardianShare),
  },
  purpleReign: {
    label: "Purple Reign",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/purpleReign.webp",
    description: "Adds 61.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.purpleReignShare),
  },
  rainbowHem: {
    label: "Rainbow Hem",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/rainbowHem.webp",
    description: "Adds 62% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rainbowHemShare),
  },
  sequinSqueeze: {
    label: "Sequin Squeeze",
    color: COLOR.coffeeRunTeal,
    image: "crits/silverDuos/sequinSqueeze.webp",
    description: "Adds 62.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sequinSqueezeShare),
  },
  slenderSwirl: {
    label: "Slender Swirl",
    color: COLOR.fullHouseCrimson,
    image: "crits/silverDuos/slenderSwirl.webp",
    description: "Adds 62.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.slenderSwirlShare),
  },
  smirkAndWink: {
    label: "Smirk And Wink",
    color: COLOR.nightShiftIndigo,
    image: "crits/silverDuos/smirkAndWink.webp",
    description: "Adds 62.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.smirkAndWinkShare),
  },
  sunnyCurls: {
    label: "Sunny Curls",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/sunnyCurls.webp",
    description: "Adds 62.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sunnyCurlsShare),
  },
  tallAndTiny: {
    label: "Tall And Tiny",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/tallAndTiny.webp",
    description: "Adds 62.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.tallAndTinyShare),
  },
  chinLift: {
    label: "Chin Lift",
    color: COLOR.nightOwlIndigo,
    image: "crits/silverDuos/chinLift.webp",
    description: "Adds 63.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.chinLiftShare),
  },
  earringGlint: {
    label: "Earring Glint",
    color: COLOR.nightOwlIndigo,
    image: "crits/silverDuos/earringGlint.webp",
    description: "Adds 64% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.earringGlintShare),
  },
  jadeAndNavy: {
    label: "Jade And Navy",
    color: COLOR.nightOwlIndigo,
    image: "crits/silverDuos/jadeAndNavy.webp",
    description: "Adds 64.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.jadeAndNavyShare),
  },
  pinkGloves: {
    label: "Pink Gloves",
    color: COLOR.overflowBlue,
    image: "crits/silverDuos/pinkGloves.webp",
    description: "Adds 64.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pinkGlovesShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
