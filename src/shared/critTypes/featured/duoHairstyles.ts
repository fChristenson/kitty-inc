import type { DUO_HAIRSTYLES_CRITS } from "../../critData/duoHairstyles";
import type { FeaturedRewards } from "./types";

export const DUO_HAIRSTYLES_REWARDS = {
  baldAndBraided: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.baldAndBraidedShare, 2),
  blondeBuzzcut: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.blondeBuzzcutShare, 1),
  braidAndBob: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.braidAndBobShare, 1),
  braidedPair: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.braidedPairShare, 2),
  bunAndBangs: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.bunAndBangsShare, 1),
  buzzAndBraid: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.buzzAndBraidShare, 2),
  chromeDomes: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.chromeDomesShare, 1),
  cueBallCuties: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.cueBallCutiesShare, 1),
  darkBobTwins: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.darkBobTwinsShare, 2),
  hairGelPair: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.hairGelPairShare, 1),
  highPonytailPair: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      context.floors,
      balance.highPonytailPairShare,
      1,
    ),
  indigoUpdo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.indigoUpdoShare, 2),
  mirrorPixies: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.mirrorPixiesShare, 1),
  mohawkAndBraid: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.mohawkAndBraidShare, 2),
  mohawkMates: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.mohawkMatesShare, 1),
  neonBraids: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.neonBraidsShare, 1),
  pixieAndPlait: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.pixieAndPlaitShare, 2),
  pixieAndPonytail: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      context.floors,
      balance.pixieAndPonytailShare,
      1,
    ),
  platinumPixie: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.platinumPixieShare, 1),
  slickBackDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.slickBackDuoShare, 1),
  snowyBob: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.snowyBobShare, 1),
  tealPixie: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.tealPixieShare, 1),
  undercutBraidDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      context.floors,
      balance.undercutBraidDuoShare,
      1,
    ),
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
  sapphirePixie: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.sapphirePixieShare, 1),
  spikyCropBraid: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.spikyCropBraidShare, 1),
  tealStreakHair: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.tealStreakHairShare, 2),
  topKnotDuo: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.topKnotDuoShare, 2),
  yellowMane: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.yellowManeShare, 2),
  turtleneckBob: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.turtleneckBobShare, 1),
} satisfies FeaturedRewards<typeof DUO_HAIRSTYLES_CRITS>;
