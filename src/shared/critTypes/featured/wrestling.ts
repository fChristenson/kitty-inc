import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const WRESTLING_CRITS = {
  goblinArmbar: {
    label: "Goblin Armbar",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/wrestling/goblinArmbar.webp",
    description: "Grows every unlocked floor's level by 2.9% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.goblinArmbarGrowth),
  },
  backMount: {
    label: "Back Mount",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/wrestling/backMount.webp",
    description: "Spreads 23 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.backMountUpgrades),
  },
  cattleClinch: {
    label: "Cattle Clinch",
    color: COLOR.coinGold,
    image: "crits/wrestling/cattleClinch.webp",
    description: "Pays 37 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.cattleClinchMultiple),
  },
  collarTie: {
    label: "Collar Tie",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/wrestling/collarTie.webp",
    description: "Grows this floor's level by 8.7% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.collarTieGrowth),
  },
  friendlyHeadlock: {
    label: "Friendly Headlock",
    color: COLOR.coinGold,
    image: "crits/wrestling/friendlyHeadlock.webp",
    description: "Spreads 24 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.friendlyHeadlockUpgrades),
  },
  heiferHeadlock: {
    label: "Heifer Headlock",
    color: COLOR.chairGiveawayBrown,
    image: "crits/wrestling/heiferHeadlock.webp",
    description: "Pays 52 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.heiferHeadlockMultiple),
  },
  hornedCradle: {
    label: "Horned Cradle",
    color: COLOR.sameBoatCoral,
    image: "crits/wrestling/hornedCradle.webp",
    description: "Grows this floor's level by 8.8% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.hornedCradleGrowth),
  },
  kneeToKnee: {
    label: "Knee to Knee",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/wrestling/kneeToKnee.webp",
    description: "Spreads 25 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.kneeToKneeUpgrades),
  },
  knuckleDown: {
    label: "Knuckle Down",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/wrestling/knuckleDown.webp",
    description: "Pays 53 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.knuckleDownMultiple),
  },
  mountAndCount: {
    label: "Mount and Count",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/wrestling/mountAndCount.webp",
    description: "Grows this floor's level by 8.9% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.mountAndCountGrowth),
  },
  pileOn: {
    label: "Pile On",
    color: COLOR.summerSaleOrange,
    image: "crits/wrestling/pileOn.webp",
    description: "Spreads 26 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.pileOnUpgrades),
  },
  pinfall: {
    label: "Pinfall",
    color: COLOR.sameBoatCoral,
    image: "crits/wrestling/pinfall.webp",
    description: "Pays 54 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.pinfallMultiple),
  },
  pinnedAndGrinning: {
    label: "Pinned and Grinning",
    color: COLOR.amberMuted,
    image: "crits/wrestling/pinnedAndGrinning.webp",
    description: "Grows this floor's level by 9% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.pinnedAndGrinningGrowth),
  },
  humanPretzel: {
    label: "Human Pretzel",
    color: COLOR.amberMuted,
    image: "crits/wrestling/humanPretzel.webp",
    description: "Spreads 27 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.humanPretzelUpgrades),
  },
  tangledLegs: {
    label: "Tangled Legs",
    color: COLOR.summerSaleOrange,
    image: "crits/wrestling/tangledLegs.webp",
    description: "Pays 55 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.tangledLegsMultiple),
  },
  sprawl: {
    label: "Sprawl",
    color: COLOR.summerSaleOrange,
    image: "crits/wrestling/sprawl.webp",
    description: "Grows this floor's level by 9.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.sprawlGrowth),
  },
  smilingSubmission: {
    label: "Smiling Submission",
    color: COLOR.summerSaleOrange,
    image: "crits/wrestling/smilingSubmission.webp",
    description: "Spreads 31 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.smilingSubmissionUpgrades),
  },
  swampSlam: {
    label: "Swamp Slam",
    color: COLOR.luckyCloverGreen,
    image: "crits/wrestling/swampSlam.webp",
    description: "Pays 56 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.swampSlamMultiple),
  },
  tagTeam: {
    label: "Tag Team",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/wrestling/tagTeam.webp",
    description: "Grows this floor's level by 9.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.tagTeamGrowth),
  },
  sneakerTakedown: {
    label: "Sneaker Takedown",
    color: COLOR.teaBreakBrown,
    image: "crits/wrestling/sneakerTakedown.webp",
    description: "Spreads 32 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.sneakerTakedownUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
