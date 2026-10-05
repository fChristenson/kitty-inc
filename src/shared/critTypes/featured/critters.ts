import type { CRITTERS_CRITS } from "../../critData/critters";
import type { FeaturedRewards } from "./types";

export const CRITTERS_REWARDS = {
  crownHedgehog: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.crownHedgehogTierSteps,
      balance.crownHedgehogUpgrades,
    ),
  lanternFox: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.lanternFoxPayouts,
    ),
  lanternLynx: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.lanternLynxBoostSeconds,
      balance.lanternLynxExtraWorkers,
    ),
  pearlOtter: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pearlOtterShare),
  profitPigeon: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.profitPigeonSeconds),
  redPanda: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.redPandaFloors),
  goldenGardenGolem: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldenGardenGolemShare),
  vaultBeetle: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.vaultBeetleSeconds),
  antleredFoxFortune: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.antleredFoxFortuneShare),
  bestestBoy: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.bestestBoyUpgrades),
  doggo: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.doggoPayouts),
  otterlyAdorable: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.otterlyAdorableBoostSeconds,
      balance.otterlyAdorableExtraWorkers,
    ),
  sleepyFox: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.sleepyFoxPayouts),
  sleepyPanda: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.sleepyPandaDiscount),
  samoyedSmile: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.samoyedSmilePayouts),
  fluffball: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.fluffballDiscount),
  cloudPup: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.cloudPupDiscount),
  snowdriftSammy: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  corgiCrossing: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.corgiCrossingBoostSeconds, balance.corgiCrossingExtraWorkers),
  feetsOfFury: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.feetsOfFuryMultiple),
  denimRat: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.denimRatGrowth),
  kettleCrew: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kettleCrewShare),
  shipshapeCats: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shipshapeCatsShare),
} satisfies FeaturedRewards<typeof CRITTERS_CRITS>;
