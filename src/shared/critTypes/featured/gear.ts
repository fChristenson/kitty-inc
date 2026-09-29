import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GEAR_CRITS = {
  annaNyavarre: {
    label: "Anna Nyavarre",
    color: COLOR.red,
    image: "crits/gear/annaNyavarre.webp",
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
    image: "crits/gear/batteryCell.webp",
    description:
      "Repeats the crit on the floor below, 15% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.batteryCellContinueChance),
  },
  blackBlade: {
    label: "Black Blade",
    color: COLOR.royalFlushPurple,
    image: "crits/gear/blackBlade.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  boneFlute: {
    label: "Bone Solo",
    color: COLOR.springCleaningMint,
    image: "crits/gear/boneFlute.webp",
    description: "Twenty payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.boneFlutePayouts),
  },
  coldSteel: {
    label: "Cold Steel",
    color: COLOR.pairBlue,
    image: "crits/gear/coldSteel.webp",
    description:
      "Repeats the crit on the floor above, 31% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.coldSteelContinueChance),
  },
  commando: {
    label: "Commando",
    color: COLOR.dressCodeGreen,
    image: "crits/gear/commando.webp",
    description: "Arms the highest floor's next click as an x5 crit",
    reward: (context, { actions, highestFloor }) =>
      actions.armCrit([highestFloor(context)], "crit"),
  },
  corvidCrown: {
    label: "Corvid Crown",
    color: COLOR.shareholdersGreen,
    image: "crits/gear/corvidCrown.webp",
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
    image: "crits/gear/daedalynx.webp",
    description: "Twenty-four payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.daedalynxPayouts),
  },
  dataCube: {
    label: "Read The Emails",
    color: COLOR.threeOfAKindGreen,
    image: "crits/gear/dataCube.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.dataCubeFloors),
  },
  dropTuned: {
    label: "Drop Tuned",
    color: COLOR.supplyRunTan,
    image: "crits/gear/dropTuned.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  eternalFlame: {
    label: "Eternal Flame",
    color: COLOR.roundUpOrange,
    image: "crits/gear/eternalFlame.webp",
    description: "Boosts every worker for 16s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.eternalFlameBoostSeconds,
        balance.eternalFlameExtraWorkers,
      ),
  },
  forgeAhead: {
    label: "Forge Ahead",
    color: COLOR.headhunterRust,
    image: "crits/gear/forgeAhead.webp",
    description: "Thirty free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.forgeAheadUpgrades),
  },
  guntherHairman: {
    label: "Gunther Hairman",
    color: COLOR.unionBossSlate,
    image: "crits/gear/guntherHairman.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  heliopaws: {
    label: "Heliopaws",
    color: COLOR.gold,
    image: "crits/gear/heliopaws.webp",
    description: "Boosts every worker for 17s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.heliopawsBoostSeconds,
        balance.heliopawsExtraWorkers,
      ),
  },
  hornsUp: {
    label: "Horns Up",
    color: COLOR.espressoShotBrown,
    image: "crits/gear/hornsUp.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.hornsUpWorkers),
  },
  ironKey: {
    label: "Iron Key",
    color: COLOR.supplyRunTan,
    image: "crits/gear/ironKey.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.ironKeyFloors),
  },
  lastCall: {
    label: "Last Call",
    color: COLOR.bonusRoundGold,
    image: "crits/gear/lastCall.webp",
    description: "Twenty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.lastCallPayouts),
  },
  nanoBlade: {
    label: "Wrist Work",
    color: COLOR.goldenHandshakeGold,
    image: "crits/gear/nanoBlade.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.nanoBladeFloors),
  },
  peltCloak: {
    label: "Pelt Cloak",
    color: COLOR.teaBreakBrown,
    image: "crits/gear/peltCloak.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  pigIron: {
    label: "Pig Iron",
    color: COLOR.unionBossSlate,
    image: "crits/gear/pigIron.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  praxisKit: {
    label: "Level Up",
    color: COLOR.goldStandardAmber,
    image: "crits/gear/praxisKit.webp",
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
    image: "crits/gear/quickSilver.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.quickSilverFloors),
  },
  runicAmulet: {
    label: "Runic Amulet",
    color: COLOR.halloweenSalePurple,
    image: "crits/gear/runicAmulet.webp",
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
    image: "crits/gear/scaledGrip.webp",
    description: "Thirty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.scaledGripUpgrades),
  },
  securityTurret: {
    label: "Friendly Fire",
    color: COLOR.luckyCloverGreen,
    image: "crits/gear/securityTurret.webp",
    description: "Boosts every worker for 15s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.securityTurretBoostSeconds,
        balance.securityTurretExtraWorkers,
      ),
  },
  shoulderSpikes: {
    label: "Shoulder Spikes",
    color: COLOR.unionBossSlate,
    image: "crits/gear/shoulderSpikes.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.shoulderSpikesFloors),
  },
  shredMetal: {
    label: "Shred Metal",
    color: COLOR.orange,
    image: "crits/gear/shredMetal.webp",
    description:
      "Repeats the crit on the floor below, 25% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.shredMetalContinueChance),
  },
  signetOfSkulls: {
    label: "Signet of Skulls",
    color: COLOR.silverTicketGray,
    image: "crits/gear/signetOfSkulls.webp",
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
    image: "crits/gear/stormFork.webp",
    description:
      "Repeats the crit on the floor above, 32% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.stormForkContinueChance),
  },
  studdedBelt: {
    label: "Studded Belt",
    color: COLOR.nightOwlIndigo,
    image: "crits/gear/studdedBelt.webp",
    description: "Eighteen free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.studdedBeltUpgrades),
  },
  swashbuckler: {
    label: "Swashbuckler",
    color: COLOR.autumnSaleAmber,
    image: "crits/gear/swashbuckler.webp",
    description: "Nineteen payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.swashbucklerPayouts),
  },
  tempered: {
    label: "Tempered",
    color: COLOR.silverTicketGray,
    image: "crits/gear/tempered.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  theCure: {
    label: "The Cure",
    color: COLOR.pairBlue,
    image: "crits/gear/theCure.webp",
    description: "Twenty-seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.theCurePayouts),
  },
  titaniumGrip: {
    label: "Titanium Grip",
    color: COLOR.fancyFridayIndigo,
    image: "crits/gear/titaniumGrip.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.titaniumGripWorkers),
  },
  wardingSigil: {
    label: "Warding Sigil",
    color: COLOR.fullHouseCrimson,
    image: "crits/gear/wardingSigil.webp",
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
    image: "crits/gear/potionCommotion.webp",
    description: "Thirty payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.potionCommotionPayouts),
  },
  lifelineLoot: {
    label: "Lifeline Loot",
    color: COLOR.red,
    image: "crits/gear/lifelineLoot.webp",
    description: "Adds 7s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.lifelineLootSeconds),
  },
  moonCloak: {
    label: "Moon Cloak",
    color: COLOR.nightShiftIndigo,
    image: "crits/gear/moonCloak.webp",
    description:
      "Repeats the crit on the floor below, 27% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.moonCloakContinueChance),
  },
  platinumRing: {
    label: "Platinum Ring",
    color: COLOR.silverTicketGray,
    image: "crits/gear/platinumRing.webp",
    description: "Cuts every price in this building by 2.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.platinumRingDiscount),
  },
  sapphireOrbit: {
    label: "Sapphire Orbit",
    color: COLOR.silverTicketGray,
    image: "crits/gear/sapphireOrbit.webp",
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
    image: "crits/gear/stormBoots.webp",
    description:
      "Repeats the crit on the floor above, 28% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.stormBootsContinueChance),
  },
  thornmailGlove: {
    label: "Thornmail Glove",
    color: COLOR.dressCodeGreen,
    image: "crits/gear/thornmailGlove.webp",
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
    image: "crits/gear/catnipSatchel.webp",
    description:
      "Repeats the crit on the floor below, 29% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.catnipSatchelContinueChance),
  },
  silverLaurel: {
    label: "Silver Laurel",
    color: COLOR.silverTicketGray,
    image: "crits/gear/silverLaurel.webp",
    description: "Twenty-nine payouts from the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.silverLaurelPayouts),
  },
  potion: {
    label: "Vial of Ventures",
    color: COLOR.cyan,
    image: "crits/gear/potion.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
