import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GEAR_CRITS = {
  annaNyavarre: {
    label: "Anna Nyavarre",
    color: COLOR.red,
    image: "crits/gear/annaNyavarre.png",
    description: "Twenty-three payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.annaNyavarrePayouts,
      ),
  },
  batteryCell: {
    label: "Battery Life",
    color: COLOR.internSkyBlue,
    image: "crits/gear/batteryCell.png",
    description: "Sixteen free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.batteryCellUpgrades),
  },
  blackBlade: {
    label: "Black Blade",
    color: COLOR.royalFlushPurple,
    image: "crits/gear/blackBlade.png",
    description: "Thirty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.blackBladeUpgrades),
  },
  boneFlute: {
    label: "Bone Solo",
    color: COLOR.springCleaningMint,
    image: "crits/gear/boneFlute.png",
    description: "Twenty payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.boneFlutePayouts),
  },
  coldSteel: {
    label: "Cold Steel",
    color: COLOR.pairBlue,
    image: "crits/gear/coldSteel.png",
    description: "Thirty-three free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.coldSteelUpgrades),
  },
  commando: {
    label: "Commando",
    color: COLOR.dressCodeGreen,
    image: "crits/gear/commando.png",
    description: "Twenty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.commandoUpgrades),
  },
  corvidCrown: {
    label: "Corvid Crown",
    color: COLOR.shareholdersGreen,
    image: "crits/gear/corvidCrown.png",
    description: "Two tier promotions and ten upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.corvidCrownTierSteps,
        balance.corvidCrownUpgrades,
      ),
  },
  daedalynx: {
    label: "Daedalynx",
    color: COLOR.cyan,
    image: "crits/gear/daedalynx.png",
    description: "Twenty-four payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.daedalynxPayouts),
  },
  dataCube: {
    label: "Read The Emails",
    color: COLOR.threeOfAKindGreen,
    image: "crits/gear/dataCube.png",
    description: "Twelve upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.dataCubeUpgrades,
      ),
  },
  dropTuned: {
    label: "Drop Tuned",
    color: COLOR.supplyRunTan,
    image: "crits/gear/dropTuned.png",
    description: "Thirteen upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.dropTunedUpgrades),
  },
  eternalFlame: {
    label: "Eternal Flame",
    color: COLOR.roundUpOrange,
    image: "crits/gear/eternalFlame.png",
    description: "Twenty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.eternalFlamePayouts),
  },
  forgeAhead: {
    label: "Forge Ahead",
    color: COLOR.headhunterRust,
    image: "crits/gear/forgeAhead.png",
    description: "Thirty free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.forgeAheadUpgrades),
  },
  guntherHairman: {
    label: "Gunther Hairman",
    color: COLOR.unionBossSlate,
    image: "crits/gear/guntherHairman.png",
    description: "Twenty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.guntherHairmanUpgrades),
  },
  heliopaws: {
    label: "Heliopaws",
    color: COLOR.gold,
    image: "crits/gear/heliopaws.png",
    description: "Twenty-six free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.heliopawsUpgrades),
  },
  hornsUp: {
    label: "Horns Up",
    color: COLOR.espressoShotBrown,
    image: "crits/gear/hornsUp.png",
    description: "Twenty-two upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.hornsUpUpgrades),
  },
  ironKey: {
    label: "Iron Key",
    color: COLOR.supplyRunTan,
    image: "crits/gear/ironKey.png",
    description: "Nineteen free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.ironKeyUpgrades),
  },
  lastCall: {
    label: "Last Call",
    color: COLOR.bonusRoundGold,
    image: "crits/gear/lastCall.png",
    description: "Twenty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.lastCallPayouts),
  },
  nanoBlade: {
    label: "Wrist Work",
    color: COLOR.goldenHandshakeGold,
    image: "crits/gear/nanoBlade.png",
    description: "Twenty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.nanoBladeUpgrades),
  },
  peltCloak: {
    label: "Pelt Cloak",
    color: COLOR.teaBreakBrown,
    image: "crits/gear/peltCloak.png",
    description: "Fourteen upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.peltCloakUpgrades),
  },
  pigIron: {
    label: "Pig Iron",
    color: COLOR.unionBossSlate,
    image: "crits/gear/pigIron.png",
    description: "Thirty-one free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.pigIronUpgrades),
  },
  praxisKit: {
    label: "Level Up",
    color: COLOR.goldStandardAmber,
    image: "crits/gear/praxisKit.png",
    description: "One tier promotion and fourteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.praxisKitTierSteps,
        balance.praxisKitUpgrades,
      ),
  },
  quickSilver: {
    label: "Quicksilver",
    color: COLOR.silverTicketGray,
    image: "crits/gear/quickSilver.png",
    description: "Twenty-one payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.quickSilverPayouts),
  },
  runicAmulet: {
    label: "Runic Amulet",
    color: COLOR.halloweenSalePurple,
    image: "crits/gear/runicAmulet.png",
    description: "Two tier promotions and eleven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.runicAmuletTierSteps,
        balance.runicAmuletUpgrades,
      ),
  },
  scaledGrip: {
    label: "Scaled Grip",
    color: COLOR.redActive,
    image: "crits/gear/scaledGrip.png",
    description: "Thirty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.scaledGripUpgrades),
  },
  securityTurret: {
    label: "Friendly Fire",
    color: COLOR.luckyCloverGreen,
    image: "crits/gear/securityTurret.png",
    description: "Eighteen payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.securityTurretPayouts),
  },
  shoulderSpikes: {
    label: "Shoulder Spikes",
    color: COLOR.unionBossSlate,
    image: "crits/gear/shoulderSpikes.png",
    description: "Twenty-nine free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.shoulderSpikesUpgrades),
  },
  shredMetal: {
    label: "Shred Metal",
    color: COLOR.orange,
    image: "crits/gear/shredMetal.png",
    description: "Twenty-one upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.shredMetalUpgrades),
  },
  signetOfSkulls: {
    label: "Signet of Skulls",
    color: COLOR.silverTicketGray,
    image: "crits/gear/signetOfSkulls.png",
    description: "One tier promotion and fifteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.signetOfSkullsTierSteps,
        balance.signetOfSkullsUpgrades,
      ),
  },
  stormFork: {
    label: "Storm Fork",
    color: COLOR.fastForwardBlue,
    image: "crits/gear/stormFork.png",
    description: "Twenty-five payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.stormForkPayouts),
  },
  studdedBelt: {
    label: "Studded Belt",
    color: COLOR.nightOwlIndigo,
    image: "crits/gear/studdedBelt.png",
    description: "Eighteen free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.studdedBeltUpgrades),
  },
  swashbuckler: {
    label: "Swashbuckler",
    color: COLOR.autumnSaleAmber,
    image: "crits/gear/swashbuckler.png",
    description: "Nineteen payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.swashbucklerPayouts),
  },
  tempered: {
    label: "Tempered",
    color: COLOR.silverTicketGray,
    image: "crits/gear/tempered.png",
    description: "Twenty-five upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.temperedUpgrades),
  },
  theCure: {
    label: "The Cure",
    color: COLOR.pairBlue,
    image: "crits/gear/theCure.png",
    description: "Twenty-seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.theCurePayouts),
  },
  titaniumGrip: {
    label: "Titanium Grip",
    color: COLOR.fancyFridayIndigo,
    image: "crits/gear/titaniumGrip.png",
    description: "Twenty-four payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.titaniumGripPayouts,
      ),
  },
  wardingSigil: {
    label: "Warding Sigil",
    color: COLOR.fullHouseCrimson,
    image: "crits/gear/wardingSigil.png",
    description: "Thirteen upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.wardingSigilUpgrades,
      ),
  },
  potionCommotion: {
    label: "Potion Commotion",
    color: COLOR.teal,
    image: "crits/gear/potionCommotion.png",
    description: "Thirty payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.potionCommotionPayouts),
  },
  lifelineLoot: {
    label: "Lifeline Loot",
    color: COLOR.red,
    image: "crits/gear/lifelineLoot.png",
    description: "Twenty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.lifelineLootUpgrades),
  },
  moonCloak: {
    label: "Moon Cloak",
    color: COLOR.nightShiftIndigo,
    image: "crits/gear/moonCloak.png",
    description: "Twenty upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.moonCloakUpgrades,
      ),
  },
  platinumRing: {
    label: "Platinum Ring",
    color: COLOR.silverTicketGray,
    image: "crits/gear/platinumRing.png",
    description: "Thirty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.platinumRingUpgrades),
  },
  sapphireOrbit: {
    label: "Sapphire Orbit",
    color: COLOR.silverTicketGray,
    image: "crits/gear/sapphireOrbit.png",
    description: "One tier promotion and twenty upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.sapphireOrbitTierSteps,
        balance.sapphireOrbitUpgrades,
      ),
  },
  stormBoots: {
    label: "Storm Boots",
    color: COLOR.blue,
    image: "crits/gear/stormBoots.png",
    description: "Eighteen upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.stormBootsUpgrades),
  },
  thornmailGlove: {
    label: "Thornmail Glove",
    color: COLOR.dressCodeGreen,
    image: "crits/gear/thornmailGlove.png",
    description: "One tier promotion and nineteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.thornmailGloveTierSteps,
        balance.thornmailGloveUpgrades,
      ),
  },
  catnipSatchel: {
    label: "Catnip Satchel",
    color: COLOR.moneyGreen,
    image: "crits/gear/catnipSatchel.png",
    description: "Twenty-nine payouts from the highest-earning floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.catnipSatchelPayouts),
  },
  silverLaurel: {
    label: "Silver Laurel",
    color: COLOR.silverTicketGray,
    image: "crits/gear/silverLaurel.png",
    description: "Twenty-nine payouts from the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.silverLaurelPayouts),
  },
  potion: {
    label: "Vial of Ventures",
    color: COLOR.cyan,
    image: "crits/gear/potion.png",
    description: "Twenty-four free upgrades on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.potionUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
