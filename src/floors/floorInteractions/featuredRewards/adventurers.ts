import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createAdventurersRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    alchemyAtDusk: (context) =>
      actions.upgrade([context.floor], balance.alchemyAtDuskUpgrades),
    astropathAlleycat: (context) =>
      actions.payCycles(context.floors, balance.astropathAlleycatPayouts),
    bardOfTheBrokenLyre: (context) =>
      actions.payCycles([context.floor], balance.bardOfTheBrokenLyrePayouts),
    battleStandardBobcat: (context) =>
      actions.upgrade([context.floor], balance.battleStandardBobcatUpgrades),
    cathedralStarship: (context) =>
      actions.payCycles(context.floors, balance.cathedralStarshipPayouts),
    cursedCrownHunt: (context) =>
      actions.upgrade([context.floor], balance.cursedCrownHuntUpgrades),
    dreadnoughtWhisker: (context) =>
      actions.upgrade([context.floor], balance.dreadnoughtWhiskerUpgrades),
    elixirUnderMoonlight: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.elixirUnderMoonlightTierSteps,
        balance.elixirUnderMoonlightUpgrades,
      ),
    frostbiteTracker: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.frostbiteTrackerPayouts,
      ),
    ironpawVanguard: (context) =>
      actions.upgrade(context.floors, balance.ironpawVanguardUpgrades),
    lastStandLionheart: (context) =>
      actions.upgrade([context.floor], balance.lastStandLionheartUpgrades),
    meowchineBerserker: (context) =>
      actions.upgrade([context.floor], balance.meowchineBerserkerUpgrades),
    meowtallicanGunner: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.meowtallicanGunnerPayouts,
      ),
    midnightMonsterContract: (context) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.midnightMonsterContractUpgrades,
      ),
    moonlitWyvernHunt: (context) =>
      actions.payCycles([context.floor], balance.moonlitWyvernHuntPayouts),
    orbitalPounce: (context) =>
      actions.upgrade(context.floors, balance.orbitalPounceUpgrades),
    plasmaPurrgeon: (context) =>
      actions.upgrade([context.floor], balance.plasmaPurrgeonUpgrades),
    relicbladeRonin: (context) =>
      actions.upgrade([context.floor], balance.relicbladeRoninUpgrades),
    seaMonsterSlayer: (context) =>
      actions.payCycles([context.floor], balance.seaMonsterSlayerPayouts),
    silverclawSentinel: (context) =>
      actions.upgrade([context.floor], balance.silverclawSentinelUpgrades),
    starBastionCaptain: (context) =>
      actions.upgrade([context.floor], balance.starBastionCaptainUpgrades),
    tavernTactician: (context) =>
      actions.payCycles(context.floors, balance.tavernTacticianPayouts),
    theAntlerwoodStalker: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.theAntlerwoodStalkerTierSteps,
        balance.theAntlerwoodStalkerUpgrades,
      ),
    theCataclysmicChaplain: (context) =>
      actions.upgrade([context.floor], balance.theCataclysmicChaplainUpgrades),
    theGriffinContract: (context) =>
      actions.payCycles(
        [highestFloor(context)],
        balance.theGriffinContractPayouts,
      ),
    theSiegeScratcher: (context) =>
      actions.upgrade([context.floor], balance.theSiegeScratcherUpgrades),
    theWarpwayWatcher: (context) =>
      actions.payCycles(context.floors, balance.theWarpwayWatcherPayouts),
    theWhiteWhisker: (context) =>
      actions.upgrade([highestFloor(context)], balance.theWhiteWhiskerUpgrades),
    toxinclawInfiltrator: (context) =>
      actions.payCycles([context.floor], balance.toxinclawInfiltratorPayouts),
    voidclawVeteran: (context) =>
      actions.upgrade([context.floor], balance.voidclawVeteranUpgrades),
    voidshieldTemplar: (context) =>
      actions.upgrade(context.floors, balance.voidshieldTemplarUpgrades),
    wolfmarkWanderer: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.wolfmarkWandererPayouts,
      ),
    wolfpackFarewell: (context) =>
      actions.upgrade(context.floors, balance.wolfpackFarewellUpgrades),
    bloodlineOmen: (context) =>
      actions.upgrade([context.floor], balance.bloodlineOmenUpgrades),
    candleclawCatacomb: (context) =>
      actions.payCycles([context.floor], balance.candleclawCatacombPayouts),
    emberPawPatrol: (context) =>
      actions.upgrade(context.floors, balance.emberPawPatrolUpgrades),
    whiskerCoastSurvivor: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.whiskerCoastSurvivorPayouts,
      ),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
