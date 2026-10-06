import type { MATCHING_OUTFITS_CRITS } from "../../critData/matchingOutfits";
import type { FeaturedRewards } from "./types";

export const MATCHING_OUTFITS_REWARDS = {
  ankleWrapDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.ankleWrapDuoShare, 1),
  bunTopSwimsuits: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.bunTopSwimsuitsShare, 1),
  cocoaCropTop: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.cocoaCropTopShare, 2),
  coralTopBobs: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.coralTopBobsShare, 1),
  earringEnvy: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.earringEnvyShare, 1),
  glossySuits: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.glossySuitsShare, 1),
  goldAndOnyx: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.goldAndOnyxShare, 2),
  goldHoops: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goldHoopsShare, 1),
  goldRimGlow: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.goldRimGlowShare, 2),
  greenShortsTwins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.greenShortsTwinsShare,
      2,
    ),
  greyLeggings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.greyLeggingsShare, 2),
  legWarmers: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.legWarmersShare, 1),
  lemonShorts: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.lemonShortsShare, 2),
  limePiping: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.limePipingShare, 2),
  limeSneaker: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.limeSneakerShare, 1),
  metallicBraDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.metallicBraDuoShare, 2),
  mintAndMarigold: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.mintAndMarigoldShare,
      2,
    ),
  mustardTights: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.mustardTightsShare, 2),
  neonLeggings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.neonLeggingsShare, 2),
  orangeLeggings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.orangeLeggingsShare, 2),
  orangeTankBun: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.orangeTankBunShare, 2),
  pinkHeadband: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.pinkHeadbandShare, 2),
  plumAndMustard: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.plumAndMustardShare, 1),
  purpleAndLime: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.purpleAndLimeShare, 2),
  rainbowAnklets: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.rainbowAnkletsShare, 1),
  rustAndNavy: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.rustAndNavyShare, 1),
  rustTopWristbands: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.rustTopWristbandsShare,
      2,
    ),
  tangerineShorts: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tangerineShortsShare, 1),
  tealTrim: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.tealTrimShare, 2),
  tealWristbands: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tealWristbandsShare, 1),
  twinCrops: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.twinCropsShare, 1),
  twoToneTop: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.twoToneTopShare, 2),
  zigzagLeotards: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.zigzagLeotardsShare, 2),
  zipSuitSisters: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.zipSuitSistersShare, 2),
  pinkStripeLeggings: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      context.floors,
      balance.pinkStripeLeggingsShare,
      1,
    ),
  tealUnitard: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tealUnitardShare, 1),
  yellowSoleTrim: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.yellowSoleTrimShare, 1),
  yellowWaistband: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.yellowWaistbandShare,
      2,
    ),
  snowAndSeafoam: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.snowAndSeafoamShare, 2),
} satisfies FeaturedRewards<typeof MATCHING_OUTFITS_CRITS>;
