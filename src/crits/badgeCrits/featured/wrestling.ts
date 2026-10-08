import type { WRESTLING_CRITS } from "../critData/wrestling";
import type { FeaturedRewards } from "./types";

export const WRESTLING_REWARDS = {
  goblinArmbar: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.goblinArmbarGrowth),
  backMount: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.backMountUpgrades),
  cattleClinch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.cattleClinchMultiple),
  collarTie: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.collarTieGrowth),
  friendlyHeadlock: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.friendlyHeadlockUpgrades),
  heiferHeadlock: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.heiferHeadlockMultiple),
  hornedCradle: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.hornedCradleGrowth),
  kneeToKnee: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.kneeToKneeUpgrades),
  knuckleDown: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.knuckleDownMultiple),
  mountAndCount: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.mountAndCountGrowth),
  pileOn: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pileOnUpgrades),
  pinfall: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinfallMultiple),
  pinnedAndGrinning: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.pinnedAndGrinningGrowth),
  humanPretzel: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.humanPretzelUpgrades),
  tangledLegs: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.tangledLegsMultiple),
  sprawl: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.sprawlGrowth),
  smilingSubmission: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.smilingSubmissionUpgrades),
  swampSlam: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.swampSlamMultiple),
  tagTeam: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tagTeamGrowth),
  sneakerTakedown: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.sneakerTakedownUpgrades),
  allFoursAmbush: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.allFoursAmbushUpgrades),
  braidedBearHug: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.braidedBearHugMultiple),
  cornrowCradle: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.cornrowCradleGrowth),
  goldCuffCrush: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goldCuffCrushUpgrades),
  legTangle: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.legTangleMultiple),
  lemonSqueeze: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.lemonSqueezeGrowth),
  pinkOverGreen: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pinkOverGreenUpgrades),
  platinumPinfall: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.platinumPinfallMultiple),
  rubySideControl: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.rubySideControlGrowth),
  sleeperHold: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.sleeperHoldUpgrades),
  sunnySideHug: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.sunnySideHugGrowth),
  tangerineTakedown: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.tangerineTakedownUpgrades),
  undercutUpperHand: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.undercutUpperHandGrowth),
} satisfies FeaturedRewards<typeof WRESTLING_CRITS>;
