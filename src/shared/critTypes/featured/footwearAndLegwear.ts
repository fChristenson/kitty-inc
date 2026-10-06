import type { FOOTWEAR_AND_LEGWEAR_CRITS } from "../../critData/footwearAndLegwear";
import type { FeaturedRewards } from "./types";

export const FOOTWEAR_AND_LEGWEAR_REWARDS = {
  sockItAway: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.sockItAwayBoostSeconds, balance.sockItAwayExtraWorkers),
  overallProfits: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.overallProfitsSeconds),
  tightLacedTeam: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.tightLacedTeamBoostSeconds, balance.tightLacedTeamExtraWorkers),
  twinBraidTreads: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.twinBraidTreadsContinueChance),
  bumblebeeLegs: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.bumblebeeLegsMultiple),
  candyLeggingsKick: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.candyLeggingsKickMultiple),
  blueLeggingsPeck: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.blueLeggingsPeckGrowth),
  rainbowLeggingsPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.rainbowLeggingsPuckerMultiple),
  neonPantsPeck: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.neonPantsPeckGrowth),
  magentaPantsMwah: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.magentaPantsMwahMultiple),
  pinkHeelPeck: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkHeelPeckMultiple),
  yellowHeelPeck: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.yellowHeelPeckMultiple),
  brickShortsPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.brickShortsPuckerMultiple),
  maroonShortsMwah: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.maroonShortsMwahGrowth),
  peachShortsPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.peachShortsPuckerMultiple),
  rustShortsSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.rustShortsSmoochMultiple),
  kneePadKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.kneePadKissUpgrades),
  patchworkPantsHug: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.patchworkPantsHugGrowth),
  mintShortsLift: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.mintShortsLiftMultiple),
  rainbowShortsSprawl: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.rainbowShortsSprawlUpgrades),
  pinkShortsSlant: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkShortsSlantMultiple),
  petticoatPriceCut: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.petticoatPriceCutDiscount),
  rainbowRuffleRally: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.rainbowRuffleRallyBoostSeconds, balance.rainbowRuffleRallyExtraWorkers),
  leotardKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.leotardKissUpgrades),
  crimsonCropPucker: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.crimsonCropPuckerGrowth),
  pinkStripePucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkStripePuckerMultiple),
  pocketPucker: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.pocketPuckerGrowth),
  redCarpetClearance: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.redCarpetClearanceDiscount),
} satisfies FeaturedRewards<typeof FOOTWEAR_AND_LEGWEAR_CRITS>;
