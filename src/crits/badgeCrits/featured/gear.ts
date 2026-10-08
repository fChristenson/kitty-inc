import type { GEAR_CRITS } from "../critData/gear";
import type { FeaturedRewards } from "./types";

export const GEAR_REWARDS = {
  annaNyavarre: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.annaNyavarrePayouts,
    ),
  batteryCell: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.batteryCellContinueChance),
  blackBlade: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  boneFlute: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.boneFlutePayouts),
  coldSteel: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.coldSteelContinueChance),
  commando: (context, { actions, highestFloor }) =>
    actions.armCrit([highestFloor(context)], "crit"),
  corvidCrown: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.corvidCrownTierSteps,
      balance.corvidCrownUpgrades,
    ),
  daedalynx: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.daedalynxPayouts),
  dataCube: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.dataCubeFloors),
  dropTuned: (context, { actions }) => actions.hireManagers([context.floor]),
  eternalFlame: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.eternalFlameBoostSeconds,
      balance.eternalFlameExtraWorkers,
    ),
  forgeAhead: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.forgeAheadUpgrades),
  guntherHairman: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  heliopaws: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.heliopawsBoostSeconds,
      balance.heliopawsExtraWorkers,
    ),
  hornsUp: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.hornsUpWorkers),
  ironKey: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.ironKeyFloors),
  lastCall: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.lastCallPayouts),
  nanoBlade: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.nanoBladeFloors),
  peltCloak: (context, { actions }) => actions.hireManagers([context.floor]),
  pigIron: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  praxisKit: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.praxisKitTierSteps,
      balance.praxisKitUpgrades,
    ),
  quickSilver: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.quickSilverFloors),
  runicAmulet: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.runicAmuletTierSteps,
      balance.runicAmuletUpgrades,
    ),
  scaledGrip: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.scaledGripUpgrades),
  securityTurret: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.securityTurretBoostSeconds,
      balance.securityTurretExtraWorkers,
    ),
  shoulderSpikes: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.shoulderSpikesFloors),
  shredMetal: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.shredMetalContinueChance),
  signetOfSkulls: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.signetOfSkullsTierSteps,
      balance.signetOfSkullsUpgrades,
    ),
  stormFork: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.stormForkContinueChance),
  studdedBelt: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.studdedBeltUpgrades),
  swashbuckler: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.swashbucklerPayouts),
  tempered: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  theCure: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.theCurePayouts),
  titaniumGrip: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.titaniumGripWorkers),
  wardingSigil: (context, { actions, balance }) =>
    actions.upgrade(
      context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
      balance.wardingSigilUpgrades,
    ),
  potionCommotion: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.potionCommotionPayouts),
  lifelineLoot: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.lifelineLootSeconds),
  moonCloak: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.moonCloakContinueChance),
  platinumRing: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.platinumRingDiscount),
  sapphireOrbit: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.sapphireOrbitTierSteps,
      balance.sapphireOrbitUpgrades,
    ),
  stormBoots: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.stormBootsContinueChance),
  thornmailGlove: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.thornmailGloveTierSteps,
      balance.thornmailGloveUpgrades,
    ),
  catnipSatchel: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.catnipSatchelContinueChance),
  silverLaurel: (context, { actions, balance, highestFloor }) =>
    actions.payCycles([highestFloor(context)], balance.silverLaurelPayouts),
  potion: (context, { actions }) => actions.hireManagers([context.floor]),
} satisfies FeaturedRewards<typeof GEAR_CRITS>;
