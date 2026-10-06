import type { AFFECTIONATE_DUOS_CRITS } from "../../critData/affectionateDuos";
import type { FeaturedRewards } from "./types";

export const AFFECTIONATE_DUOS_REWARDS = {
  curvyCuddle: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.curvyCuddleShare, 2),
  cyanCuddle: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cyanCuddleShare, 1),
  pinkyLink: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.pinkyLinkShare, 2),
  squeezeTight: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.squeezeTightShare, 1),
  wristbandHuddle: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.wristbandHuddleShare, 1),
  cuddleUp: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cuddleUpSeconds),
  hugItOut: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hugItOutShare),
  halterHuddle: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.halterHuddleShare),
  sequinSqueeze: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sequinSqueezeShare),
  redBunBuddy: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.redBunBuddyShare, 1),
  baldieBesties: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.baldieBestiesShare, 2),
  pixieBesties: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.pixieBestiesShare, 1),
  pintSizePals: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.pintSizePalsShare, 2),
  ebonyAndIvory: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.ebonyAndIvoryShare, 2),
  blueLipstick: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.blueLipstickShare, 1),
  smirkAndWink: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.smirkAndWinkShare),
  helloGorgeous: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.helloGorgeousShare),
  bigSmile: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bigSmileSeconds),
  cockyGrins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cockyGrinsShare, 1),
  sweatpantsSmiles: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.sweatpantsSmilesShare,
      2,
    ),
  stickerSisters: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.stickerSistersShare, 2),
  merlotMoment: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.merlotMomentShare),
  pixieCutPals: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.pixieCutPalsShare, 1),
  ravenHairPals: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.ravenHairPalsShare, 2),
  baldBigGrins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.baldBigGrinsShare, 1),
  goldStudGrins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goldStudGrinsShare, 1),
  sideBySide: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.sideBySideShare, 2),
} satisfies FeaturedRewards<typeof AFFECTIONATE_DUOS_CRITS>;
