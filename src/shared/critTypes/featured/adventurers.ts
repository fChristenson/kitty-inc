import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ADVENTURERS_CRITS = {
  alchemyAtDusk: {
    label: "Alchemy at Dusk",
    color: COLOR.purple,
    image: "crits/adventurers/alchemyAtDusk.png",
    description: "Six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.alchemyAtDuskUpgrades),
  },
  astropathAlleycat: {
    label: "Astropath Alleycat",
    color: COLOR.nightShiftIndigo,
    image: "crits/adventurers/astropathAlleycat.png",
    description: "Eight payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.astropathAlleycatPayouts),
  },
  bardOfTheBrokenLyre: {
    label: "Bard of the Broken Lyre",
    color: COLOR.peppermintPink,
    image: "crits/adventurers/bardOfTheBrokenLyre.png",
    description: "Seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.bardOfTheBrokenLyrePayouts),
  },
  battleStandardBobcat: {
    label: "Battle Standard Bobcat",
    color: COLOR.red,
    image: "crits/adventurers/battleStandardBobcat.png",
    description: "Ten free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.battleStandardBobcatUpgrades),
  },
  cathedralStarship: {
    label: "Cathedral Starship",
    color: COLOR.blue,
    image: "crits/adventurers/cathedralStarship.png",
    description: "Twelve payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.cathedralStarshipPayouts),
  },
  cursedCrownHunt: {
    label: "Cursed Crown Hunt",
    color: COLOR.fullHouseCrimson,
    image: "crits/adventurers/cursedCrownHunt.png",
    description: "Fifteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.cursedCrownHuntUpgrades),
  },
  dreadnoughtWhisker: {
    label: "Dreadnought Whisker",
    color: COLOR.unionBossSlate,
    image: "crits/adventurers/dreadnoughtWhisker.png",
    description: "Twenty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.dreadnoughtWhiskerUpgrades),
  },
  elixirUnderMoonlight: {
    label: "Elixir Under Moonlight",
    color: COLOR.silverTicketGray,
    image: "crits/adventurers/elixirUnderMoonlight.png",
    description: "One tier promotion and seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.elixirUnderMoonlightTierSteps,
        balance.elixirUnderMoonlightUpgrades,
      ),
  },
  frostbiteTracker: {
    label: "Frostbite Tracker",
    color: COLOR.frozenIceBlue,
    image: "crits/adventurers/frostbiteTracker.png",
    description: "Nine payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.frostbiteTrackerPayouts,
      ),
  },
  ironpawVanguard: {
    label: "Ironpaw Vanguard",
    color: COLOR.gold,
    image: "crits/adventurers/ironpawVanguard.png",
    description: "Eleven free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.ironpawVanguardUpgrades),
  },
  lastStandLionheart: {
    label: "Last Stand Lionheart",
    color: COLOR.red,
    image: "crits/adventurers/lastStandLionheart.png",
    description: "Fourteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.lastStandLionheartUpgrades),
  },
  meowchineBerserker: {
    label: "Meowchine Berserker",
    color: COLOR.orange,
    image: "crits/adventurers/meowchineBerserker.png",
    description: "Eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.meowchineBerserkerUpgrades),
  },
  meowtallicanGunner: {
    label: "Meowtallican Gunner",
    color: COLOR.silverTicketGray,
    image: "crits/adventurers/meowtallicanGunner.png",
    description: "Ten payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.meowtallicanGunnerPayouts,
      ),
  },
  midnightMonsterContract: {
    label: "Midnight Monster Contract",
    color: COLOR.nightShiftIndigo,
    image: "crits/adventurers/midnightMonsterContract.png",
    description: "Six free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.midnightMonsterContractUpgrades,
      ),
  },
  moonlitWyvernHunt: {
    label: "Moonlit Wyvern Hunt",
    color: COLOR.blue,
    image: "crits/adventurers/moonlitWyvernHunt.png",
    description: "Thirteen payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.moonlitWyvernHuntPayouts),
  },
  orbitalPounce: {
    label: "Orbital Pounce",
    color: COLOR.cyan,
    image: "crits/adventurers/orbitalPounce.png",
    description: "Five free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.orbitalPounceUpgrades),
  },
  plasmaPurrgeon: {
    label: "Plasma Purrgeon",
    color: COLOR.blue,
    image: "crits/adventurers/plasmaPurrgeon.png",
    description: "Nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.plasmaPurrgeonUpgrades),
  },
  relicbladeRonin: {
    label: "Relicblade Ronin",
    color: COLOR.fullHouseCrimson,
    image: "crits/adventurers/relicbladeRonin.png",
    description: "Sixteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.relicbladeRoninUpgrades),
  },
  seaMonsterSlayer: {
    label: "Sea Monster Slayer",
    color: COLOR.cyan,
    image: "crits/adventurers/seaMonsterSlayer.png",
    description: "Ten instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.seaMonsterSlayerPayouts),
  },
  silverclawSentinel: {
    label: "Silverclaw Sentinel",
    color: COLOR.silverTicketGray,
    image: "crits/adventurers/silverclawSentinel.png",
    description: "Seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.silverclawSentinelUpgrades),
  },
  starBastionCaptain: {
    label: "Star Bastion Captain",
    color: COLOR.blue,
    image: "crits/adventurers/starBastionCaptain.png",
    description: "Twelve free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.starBastionCaptainUpgrades),
  },
  tavernTactician: {
    label: "Tavern Tactician",
    color: COLOR.autumnSaleAmber,
    image: "crits/adventurers/tavernTactician.png",
    description: "Eight payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.tavernTacticianPayouts),
  },
  theAntlerwoodStalker: {
    label: "The Antlerwood Stalker",
    color: COLOR.moneyGreen,
    image: "crits/adventurers/theAntlerwoodStalker.png",
    description: "One tier promotion and five upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.theAntlerwoodStalkerTierSteps,
        balance.theAntlerwoodStalkerUpgrades,
      ),
  },
  theCataclysmicChaplain: {
    label: "The Cataclysmic Chaplain",
    color: COLOR.fullHouseCrimson,
    image: "crits/adventurers/theCataclysmicChaplain.png",
    description: "Fifteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.theCataclysmicChaplainUpgrades),
  },
  theGriffinContract: {
    label: "The Griffin Contract",
    color: COLOR.gold,
    image: "crits/adventurers/theGriffinContract.png",
    description: "Nine payouts on the highest-earning floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles(
        [highestFloor(context)],
        balance.theGriffinContractPayouts,
      ),
  },
  theSiegeScratcher: {
    label: "The Siege Scratcher",
    color: COLOR.red,
    image: "crits/adventurers/theSiegeScratcher.png",
    description: "Eighteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.theSiegeScratcherUpgrades),
  },
  theWarpwayWatcher: {
    label: "The Warpway Watcher",
    color: COLOR.purple,
    image: "crits/adventurers/theWarpwayWatcher.png",
    description: "Six payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.theWarpwayWatcherPayouts),
  },
  theWhiteWhisker: {
    label: "The White Whisker",
    color: COLOR.white,
    image: "crits/adventurers/theWhiteWhisker.png",
    description: "Ten free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.theWhiteWhiskerUpgrades),
  },
  toxinclawInfiltrator: {
    label: "Toxinclaw Infiltrator",
    color: COLOR.dressCodeGreen,
    image: "crits/adventurers/toxinclawInfiltrator.png",
    description: "Seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.toxinclawInfiltratorPayouts),
  },
  voidclawVeteran: {
    label: "Voidclaw Veteran",
    color: COLOR.nightShiftIndigo,
    image: "crits/adventurers/voidclawVeteran.png",
    description: "Thirteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.voidclawVeteranUpgrades),
  },
  voidshieldTemplar: {
    label: "Voidshield Templar",
    color: COLOR.blue,
    image: "crits/adventurers/voidshieldTemplar.png",
    description: "Eight free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.voidshieldTemplarUpgrades),
  },
  wolfmarkWanderer: {
    label: "Wolfmark Wanderer",
    color: COLOR.silverTicketGray,
    image: "crits/adventurers/wolfmarkWanderer.png",
    description: "Eleven payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.wolfmarkWandererPayouts,
      ),
  },
  wolfpackFarewell: {
    label: "Wolfpack Farewell",
    color: COLOR.peppermintPink,
    image: "crits/adventurers/wolfpackFarewell.png",
    description: "Six free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.wolfpackFarewellUpgrades),
  },
  bloodlineOmen: {
    label: "Bloodline Omen",
    color: COLOR.fullHouseCrimson,
    image: "crits/adventurers/bloodlineOmen.png",
    description: "Seventeen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.bloodlineOmenUpgrades),
  },
  candleclawCatacomb: {
    label: "Candleclaw Catacomb",
    color: COLOR.nightShiftIndigo,
    image: "crits/adventurers/candleclawCatacomb.png",
    description: "Fourteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.candleclawCatacombPayouts),
  },
  emberPawPatrol: {
    label: "Ember Paw Patrol",
    color: COLOR.orange,
    image: "crits/adventurers/emberPawPatrol.png",
    description: "Fourteen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.emberPawPatrolUpgrades),
  },
  whiskerCoastSurvivor: {
    label: "Whisker Coast Survivor",
    color: COLOR.cyan,
    image: "crits/adventurers/whiskerCoastSurvivor.png",
    description: "Seventeen payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.whiskerCoastSurvivorPayouts,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
