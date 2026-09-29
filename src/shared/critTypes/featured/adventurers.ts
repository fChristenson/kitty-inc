import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ADVENTURERS_CRITS = {
  alchemyAtDusk: {
    label: "Alchemy at Dusk",
    color: COLOR.purple,
    image: "crits/adventurers/alchemyAtDusk.webp",
    description:
      "Repeats the crit on the floor above, 12% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.alchemyAtDuskContinueChance),
  },
  astropathAlleycat: {
    label: "Astropath Alleycat",
    color: COLOR.nightShiftIndigo,
    image: "crits/adventurers/astropathAlleycat.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  bardOfTheBrokenLyre: {
    label: "Bard of the Broken Lyre",
    color: COLOR.peppermintPink,
    image: "crits/adventurers/bardOfTheBrokenLyre.webp",
    description: "Seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.bardOfTheBrokenLyrePayouts),
  },
  battleStandardBobcat: {
    label: "Battle Standard Bobcat",
    color: COLOR.red,
    image: "crits/adventurers/battleStandardBobcat.webp",
    description: "Ten free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.battleStandardBobcatUpgrades),
  },
  cathedralStarship: {
    label: "Cathedral Starship",
    color: COLOR.blue,
    image: "crits/adventurers/cathedralStarship.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.cathedralStarshipFloors),
  },
  cursedCrownHunt: {
    label: "Cursed Crown Hunt",
    color: COLOR.fullHouseCrimson,
    image: "crits/adventurers/cursedCrownHunt.webp",
    description: "One tier promotion and 10 upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.cursedCrownHuntTierSteps,
        balance.cursedCrownHuntUpgrades,
      ),
  },
  dreadnoughtWhisker: {
    label: "Dreadnought Whisker",
    color: COLOR.unionBossSlate,
    image: "crits/adventurers/dreadnoughtWhisker.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.dreadnoughtWhiskerWorkers),
  },
  elixirUnderMoonlight: {
    label: "Elixir Under Moonlight",
    color: COLOR.silverTicketGray,
    image: "crits/adventurers/elixirUnderMoonlight.webp",
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
    image: "crits/adventurers/frostbiteTracker.webp",
    description: "Cuts every price in this building by 1.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.frostbiteTrackerDiscount),
  },
  ironpawVanguard: {
    label: "Ironpaw Vanguard",
    color: COLOR.gold,
    image: "crits/adventurers/ironpawVanguard.webp",
    description: "Free office chairs for this floor",
    reward: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  },
  lastStandLionheart: {
    label: "Last Stand Lionheart",
    color: COLOR.red,
    image: "crits/adventurers/lastStandLionheart.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
  meowchineBerserker: {
    label: "Meowchine Berserker",
    color: COLOR.orange,
    image: "crits/adventurers/meowchineBerserker.webp",
    description: "Eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.meowchineBerserkerUpgrades),
  },
  meowtallicanGunner: {
    label: "Meowtallican Gunner",
    color: COLOR.silverTicketGray,
    image: "crits/adventurers/meowtallicanGunner.webp",
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
    image: "crits/adventurers/midnightMonsterContract.webp",
    description: "Boosts this floor's workers for 22s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.midnightMonsterContractBoostSeconds,
        balance.midnightMonsterContractExtraWorkers,
      ),
  },
  moonlitWyvernHunt: {
    label: "Moonlit Wyvern Hunt",
    color: COLOR.blue,
    image: "crits/adventurers/moonlitWyvernHunt.webp",
    description: "Thirteen payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.moonlitWyvernHuntPayouts),
  },
  orbitalPounce: {
    label: "Orbital Pounce",
    color: COLOR.cyan,
    image: "crits/adventurers/orbitalPounce.webp",
    description: "Five free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.orbitalPounceUpgrades),
  },
  plasmaPurrgeon: {
    label: "Plasma Purrgeon",
    color: COLOR.blue,
    image: "crits/adventurers/plasmaPurrgeon.webp",
    description: "Nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.plasmaPurrgeonUpgrades),
  },
  relicbladeRonin: {
    label: "Relicblade Ronin",
    color: COLOR.fullHouseCrimson,
    image: "crits/adventurers/relicbladeRonin.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.relicbladeRoninFloors),
  },
  seaMonsterSlayer: {
    label: "Sea Monster Slayer",
    color: COLOR.cyan,
    image: "crits/adventurers/seaMonsterSlayer.webp",
    description: "Ten instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.seaMonsterSlayerPayouts),
  },
  silverclawSentinel: {
    label: "Silverclaw Sentinel",
    color: COLOR.silverTicketGray,
    image: "crits/adventurers/silverclawSentinel.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.silverclawSentinelFloors),
  },
  starBastionCaptain: {
    label: "Star Bastion Captain",
    color: COLOR.blue,
    image: "crits/adventurers/starBastionCaptain.webp",
    description:
      "Repeats the crit on the floor below, 16% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "down",
        balance.starBastionCaptainContinueChance,
      ),
  },
  tavernTactician: {
    label: "Tavern Tactician",
    color: COLOR.autumnSaleAmber,
    image: "crits/adventurers/tavernTactician.webp",
    description: "Eight payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.tavernTacticianPayouts),
  },
  theAntlerwoodStalker: {
    label: "The Antlerwood Stalker",
    color: COLOR.moneyGreen,
    image: "crits/adventurers/theAntlerwoodStalker.webp",
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
    image: "crits/adventurers/theCataclysmicChaplain.webp",
    description: "Fifteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.theCataclysmicChaplainUpgrades),
  },
  theGriffinContract: {
    label: "The Griffin Contract",
    color: COLOR.gold,
    image: "crits/adventurers/theGriffinContract.webp",
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
    image: "crits/adventurers/theSiegeScratcher.webp",
    description: "Cuts every price in this building by 1.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.theSiegeScratcherDiscount),
  },
  theWarpwayWatcher: {
    label: "The Warpway Watcher",
    color: COLOR.purple,
    image: "crits/adventurers/theWarpwayWatcher.webp",
    description: "Boosts this floor's workers for 23s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.theWarpwayWatcherBoostSeconds,
        balance.theWarpwayWatcherExtraWorkers,
      ),
  },
  theWhiteWhisker: {
    label: "The White Whisker",
    color: COLOR.white,
    image: "crits/adventurers/theWhiteWhisker.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  toxinclawInfiltrator: {
    label: "Toxinclaw Infiltrator",
    color: COLOR.dressCodeGreen,
    image: "crits/adventurers/toxinclawInfiltrator.webp",
    description: "Seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.toxinclawInfiltratorPayouts),
  },
  voidclawVeteran: {
    label: "Voidclaw Veteran",
    color: COLOR.nightShiftIndigo,
    image: "crits/adventurers/voidclawVeteran.webp",
    description: "Thirteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.voidclawVeteranUpgrades),
  },
  voidshieldTemplar: {
    label: "Voidshield Templar",
    color: COLOR.blue,
    image: "crits/adventurers/voidshieldTemplar.webp",
    description: "Eight free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.voidshieldTemplarUpgrades),
  },
  wolfmarkWanderer: {
    label: "Wolfmark Wanderer",
    color: COLOR.silverTicketGray,
    image: "crits/adventurers/wolfmarkWanderer.webp",
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
    image: "crits/adventurers/wolfpackFarewell.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.wolfpackFarewellFloors),
  },
  bloodlineOmen: {
    label: "Bloodline Omen",
    color: COLOR.fullHouseCrimson,
    image: "crits/adventurers/bloodlineOmen.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  candleclawCatacomb: {
    label: "Candleclaw Catacomb",
    color: COLOR.nightShiftIndigo,
    image: "crits/adventurers/candleclawCatacomb.webp",
    description: "Fourteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.candleclawCatacombPayouts),
  },
  emberPawPatrol: {
    label: "Ember Paw Patrol",
    color: COLOR.orange,
    image: "crits/adventurers/emberPawPatrol.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.emberPawPatrolFloors),
  },
  whiskerCoastSurvivor: {
    label: "Whisker Coast Survivor",
    color: COLOR.cyan,
    image: "crits/adventurers/whiskerCoastSurvivor.webp",
    description: "Seventeen payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.whiskerCoastSurvivorPayouts,
      ),
  },
  chromeCrusader: {
    label: "Chrome Crusader",
    color: COLOR.nightShiftIndigo,
    image: "crits/adventurers/chromeCrusader.webp",
    description: "Locks every floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent(context.floors, "spendingFreeze"),
  },
  facelessFixer: {
    label: "Faceless Fixer",
    color: COLOR.overflowBlue,
    image: "crits/adventurers/facelessFixer.webp",
    description: "Boosts every worker for 22s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.facelessFixerBoostSeconds, balance.facelessFixerExtraWorkers),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
