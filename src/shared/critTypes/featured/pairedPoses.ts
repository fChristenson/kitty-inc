import type { PAIRED_POSES_CRITS } from "../../critData/pairedPoses";
import type { FeaturedRewards } from "./types";

export const PAIRED_POSES_REWARDS = {
  blueLipsRecline: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.blueLipsReclineShare,
      2,
    ),
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
  frontRowFeet: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.frontRowFeetShare, 2),
  gymMat: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.gymMatShare, 2),
  handsPlanted: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.handsPlantedShare, 1),
  jumboSoles: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.jumboSolesShare, 1),
  kneeHuggers: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.kneeHuggersShare, 2),
  kneesUp: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.kneesUpShare, 1),
  leanBackLasses: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.leanBackLassesShare, 2),
  lotusLounge: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.lotusLoungeShare, 1),
  midnightManeSprawl: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      context.floors,
      balance.midnightManeSprawlShare,
      1,
    ),
  neonStripeLean: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.neonStripeLeanShare, 1),
  shySitters: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.shySittersShare, 1),
  solesUpFront: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.solesUpFrontShare, 2),
  wideSitBraid: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.wideSitBraidShare, 2),
  ropeBraidRest: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.ropeBraidRestShare, 2),
  longPonytailRecline: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.longPonytailReclineShare,
      2,
    ),
  silverPonytailLean: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(
      [context.floor],
      balance.silverPonytailLeanShare,
      2,
    ),
  wavyLocksLean: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.wavyLocksLeanShare, 2),
  twinBobTiptoes: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.twinBobTiptoesShare, 2),
  mintGlowLounge: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.mintGlowLoungeShare, 2),
  chinLift: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.chinLiftShare),
  poutAndPose: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.poutAndPoseShare),
  capeSwish: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.capeSwishSeconds),
  slenderSwirl: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.slenderSwirlShare),
  proudGuardian: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.proudGuardianShare),
  powerBun: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.powerBunShare),
  coralPads: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.coralPadsShare, 2),
  plumLipsPower: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.plumLipsPowerShare, 2),
} satisfies FeaturedRewards<typeof PAIRED_POSES_CRITS>;
