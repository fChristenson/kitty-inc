import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createGearRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    annaNyavarre: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.annaNyavarrePayouts,
      ),
    batteryCell: (context) =>
      actions.upgrade([lowestLevel(context)], balance.batteryCellUpgrades),
    blackBlade: (context) =>
      actions.upgrade([context.floor], balance.blackBladeUpgrades),
    boneFlute: (context) =>
      actions.payCycles(alternating(context), balance.boneFlutePayouts),
    coldSteel: (context) =>
      actions.upgrade([context.floor], balance.coldSteelUpgrades),
    commando: (context) =>
      actions.upgrade([context.floor], balance.commandoUpgrades),
    corvidCrown: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.corvidCrownTierSteps,
        balance.corvidCrownUpgrades,
      ),
    daedalynx: (context) =>
      actions.payCycles(context.floors, balance.daedalynxPayouts),
    dataCube: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.dataCubeUpgrades,
      ),
    dropTuned: (context) =>
      actions.upgrade(alternating(context), balance.dropTunedUpgrades),
    eternalFlame: (context) =>
      actions.payCycles([context.floor], balance.eternalFlamePayouts),
    forgeAhead: (context) =>
      actions.upgrade(context.floors, balance.forgeAheadUpgrades),
    guntherHairman: (context) =>
      actions.upgrade([context.floor], balance.guntherHairmanUpgrades),
    heliopaws: (context) =>
      actions.upgrade(context.floors, balance.heliopawsUpgrades),
    hornsUp: (context) =>
      actions.upgrade([highestFloor(context)], balance.hornsUpUpgrades),
    ironKey: (context) =>
      actions.upgrade([lowestLevel(context)], balance.ironKeyUpgrades),
    lastCall: (context) =>
      actions.payCycles([context.floor], balance.lastCallPayouts),
    nanoBlade: (context) =>
      actions.upgrade([context.floor], balance.nanoBladeUpgrades),
    peltCloak: (context) =>
      actions.upgrade(alternating(context), balance.peltCloakUpgrades),
    pigIron: (context) =>
      actions.upgrade(context.floors, balance.pigIronUpgrades),
    praxisKit: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.praxisKitTierSteps,
        balance.praxisKitUpgrades,
      ),
    quickSilver: (context) =>
      actions.payCycles(alternating(context), balance.quickSilverPayouts),
    runicAmulet: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.runicAmuletTierSteps,
        balance.runicAmuletUpgrades,
      ),
    scaledGrip: (context) =>
      actions.upgrade([context.floor], balance.scaledGripUpgrades),
    securityTurret: (context) =>
      actions.payCycles([highestFloor(context)], balance.securityTurretPayouts),
    shoulderSpikes: (context) =>
      actions.upgrade(context.floors, balance.shoulderSpikesUpgrades),
    shredMetal: (context) =>
      actions.upgrade([highestFloor(context)], balance.shredMetalUpgrades),
    signetOfSkulls: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.signetOfSkullsTierSteps,
        balance.signetOfSkullsUpgrades,
      ),
    stormFork: (context) =>
      actions.payCycles(context.floors, balance.stormForkPayouts),
    studdedBelt: (context) =>
      actions.upgrade([lowestLevel(context)], balance.studdedBeltUpgrades),
    swashbuckler: (context) =>
      actions.payCycles(alternating(context), balance.swashbucklerPayouts),
    tempered: (context) =>
      actions.upgrade([highestFloor(context)], balance.temperedUpgrades),
    theCure: (context) =>
      actions.payCycles([context.floor], balance.theCurePayouts),
    titaniumGrip: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.titaniumGripPayouts,
      ),
    wardingSigil: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.wardingSigilUpgrades,
      ),
    potionCommotion: (context) =>
      actions.payCycles([context.floor], balance.potionCommotionPayouts),
    lifelineLoot: (context) =>
      actions.upgrade([context.floor], balance.lifelineLootUpgrades),
    moonCloak: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.moonCloakUpgrades,
      ),
    platinumRing: (context) =>
      actions.upgrade([context.floor], balance.platinumRingUpgrades),
    sapphireOrbit: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.sapphireOrbitTierSteps,
        balance.sapphireOrbitUpgrades,
      ),
    stormBoots: (context) =>
      actions.upgrade(alternating(context), balance.stormBootsUpgrades),
    thornmailGlove: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.thornmailGloveTierSteps,
        balance.thornmailGloveUpgrades,
      ),
    catnipSatchel: (context) =>
      actions.payCycles([highestFloor(context)], balance.catnipSatchelPayouts),
    silverLaurel: (context) =>
      actions.payCycles([highestFloor(context)], balance.silverLaurelPayouts),
    potion: (context) =>
      actions.upgrade(alternating(context), balance.potionUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
