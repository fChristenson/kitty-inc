import type { ADVENTURERS_CRITS } from "../critData/adventurers";
import type { FeaturedRewards } from "./types";

export const ADVENTURERS_REWARDS = {
  alchemyAtDusk: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.alchemyAtDuskContinueChance),
  astropathAlleycat: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  bardOfTheBrokenLyre: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.bardOfTheBrokenLyrePayouts),
  battleStandardBobcat: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.battleStandardBobcatUpgrades),
  cathedralStarship: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.cathedralStarshipFloors),
  cursedCrownHunt: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.cursedCrownHuntTierSteps,
      balance.cursedCrownHuntUpgrades,
    ),
  dreadnoughtWhisker: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.dreadnoughtWhiskerWorkers),
  elixirUnderMoonlight: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.elixirUnderMoonlightTierSteps,
      balance.elixirUnderMoonlightUpgrades,
    ),
  frostbiteTracker: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.frostbiteTrackerDiscount),
  ironpawVanguard: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  lastStandLionheart: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  meowchineBerserker: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.meowchineBerserkerUpgrades),
  meowtallicanGunner: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.meowtallicanGunnerPayouts,
    ),
  midnightMonsterContract: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.midnightMonsterContractBoostSeconds,
      balance.midnightMonsterContractExtraWorkers,
    ),
  moonlitWyvernHunt: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.moonlitWyvernHuntPayouts),
  orbitalPounce: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.orbitalPounceUpgrades),
  plasmaPurrgeon: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.plasmaPurrgeonUpgrades),
  relicbladeRonin: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.relicbladeRoninFloors),
  seaMonsterSlayer: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.seaMonsterSlayerPayouts),
  silverclawSentinel: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.silverclawSentinelFloors),
  starBastionCaptain: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "down",
      balance.starBastionCaptainContinueChance,
    ),
  tavernTactician: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.tavernTacticianPayouts),
  theAntlerwoodStalker: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.theAntlerwoodStalkerTierSteps,
      balance.theAntlerwoodStalkerUpgrades,
    ),
  theCataclysmicChaplain: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.theCataclysmicChaplainUpgrades),
  theGriffinContract: (context, { actions, balance, highestFloor }) =>
    actions.payCycles(
      [highestFloor(context)],
      balance.theGriffinContractPayouts,
    ),
  theSiegeScratcher: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.theSiegeScratcherDiscount),
  theWarpwayWatcher: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.theWarpwayWatcherBoostSeconds,
      balance.theWarpwayWatcherExtraWorkers,
    ),
  theWhiteWhisker: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  toxinclawInfiltrator: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.toxinclawInfiltratorPayouts),
  voidclawVeteran: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.voidclawVeteranUpgrades),
  voidshieldTemplar: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.voidshieldTemplarUpgrades),
  wolfmarkWanderer: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.wolfmarkWandererPayouts,
    ),
  wolfpackFarewell: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.wolfpackFarewellFloors),
  bloodlineOmen: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  candleclawCatacomb: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.candleclawCatacombPayouts),
  emberPawPatrol: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.emberPawPatrolFloors),
  whiskerCoastSurvivor: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.whiskerCoastSurvivorPayouts,
    ),
  chromeCrusader: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  facelessFixer: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.facelessFixerBoostSeconds, balance.facelessFixerExtraWorkers),
} satisfies FeaturedRewards<typeof ADVENTURERS_CRITS>;
