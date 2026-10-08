import type { COZY_CUTE_CRITS } from "../critData/cozyCute";
import type { FeaturedRewards } from "./types";

export const COZY_CUTE_REWARDS = {
  plushieDog: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.plushieDogBoostSeconds,
      balance.plushieDogExtraWorkers,
    ),
  plushieElephant: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.plushieElephantContinueChance),
  plushieHamster: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.plushieHamsterShare),
  plushieOtter: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.plushieOtterFloors),
  plushiePand: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.plushiePandFloors),
  plushiePenguin: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.plushiePenguinFloors),
  plushieRabbit: (context, { actions, balance, alternating }) =>
    actions.upgrade(alternating(context), balance.plushieRabbitUpgrades),
  plushieRacoon: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.plushieRacoonShare),
  plushieSeal: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.plushieSealUpgrades),
  plushieTiger: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.plushieTigerUpgrades),
  ribbonRub: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.ribbonRubDiscount),
  blushPat: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blushPatShare),
  sleepyPat: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.sleepyPatBoostSeconds, balance.sleepyPatExtraWorkers),
  gratefulPat: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.gratefulPatContinueChance),
  gigglePat: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.gigglePatDiscount),
  beamingPat: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.beamingPatShare),
  fedoraFrown: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.fedoraFrownBoostSeconds, balance.fedoraFrownExtraWorkers),
  midnightMobster: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.midnightMobsterContinueChance),
  trenchCoatSquint: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.trenchCoatSquintDiscount),
  crimsonFedora: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.crimsonFedoraShare),
  winkAndBlush: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.winkAndBlushBoostSeconds, balance.winkAndBlushExtraWorkers),
  bedtimeSelfie: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bedtimeSelfieGrowth),
  duvetDaydream: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.duvetDaydreamUpgrades),
  lazySunday: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.lazySundayGrowth),
  pillowFort: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pillowFortUpgrades),
  shoulderSlip: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.shoulderSlipGrowth),
  skyBlueNightshirt: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.skyBlueNightshirtGrowth),
  sleepoverTwins: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.sleepoverTwinsGrowth),
} satisfies FeaturedRewards<typeof COZY_CUTE_CRITS>;
