import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const WARHAMMER_CRITS = {
  emperorsFinest: {
    label: "Emperor's Finest",
    color: COLOR.blue,
    image: "crits/warhammer/emperorsFinest.webp",
    description: "Thirty-seven payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.emperorsFinestPayouts),
  },
  eternalDuty: {
    label: "Eternal Duty",
    color: COLOR.red,
    image: "crits/warhammer/eternalDuty.webp",
    description: "Boosts every worker for 17s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.eternalDutyBoostSeconds,
        balance.eternalDutyExtraWorkers,
      ),
  },
  faithIsOurShield: {
    label: "Faith Is Our Shield",
    color: COLOR.blue,
    image: "crits/warhammer/faithIsOurShield.webp",
    description: "One tier promotion and twenty-four upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.faithIsOurShieldTierSteps,
        balance.faithIsOurShieldUpgrades,
      ),
  },
  fearNotThePsyker: {
    label: "Fear Not the Psyker",
    color: COLOR.purple,
    image: "crits/warhammer/fearNotThePsyker.webp",
    description:
      "Repeats the crit on the floor above, 37% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.fearNotThePsykerContinueChance),
  },
  neverSurrender: {
    label: "Never Surrender",
    color: COLOR.red,
    image: "crits/warhammer/neverSurrender.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  },
  purge: {
    label: "Purge",
    color: COLOR.red,
    image: "crits/warhammer/purge.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  },
  toTheSkies: {
    label: "To the Skies",
    color: COLOR.blue,
    image: "crits/warhammer/toTheSkies.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  },
  whatAreYourOrders: {
    label: "What Are Your Orders",
    color: COLOR.blue,
    image: "crits/warhammer/whatAreYourOrders.webp",
    description: "Thirty free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.whatAreYourOrdersUpgrades,
      ),
  },
  emperorProvidesPurrfection: {
    label: "The Emperor Provides",
    color: COLOR.blue,
    image: "crits/warhammer/emperorProvidesPurrfection.webp",
    description: "Forty-four instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(
        context.floors,
        balance.emperorProvidesPurrfectionPayouts,
      ),
  },
  fortyKOfGold: {
    label: "40K of Gold",
    color: COLOR.gold,
    image: "crits/warhammer/40kOfGold.webp",
    description: "Forty instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.fortyKOfGoldPayouts),
  },
  chaoticTemptation: {
    label: "Chaotic Temptation",
    color: COLOR.red,
    image: "crits/warhammer/chaoticTemptation.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.chaoticTemptationFloors),
  },
  chaoticTemptation2: {
    label: "Chaos Allure",
    color: COLOR.purple,
    image: "crits/warhammer/chaoticTemptation2.webp",
    description: "Thirty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.chaoticTemptation2Upgrades),
  },
  chaoticTemptation3: {
    label: "Chaos Romance",
    color: COLOR.orange,
    image: "crits/warhammer/chaoticTemptation3.webp",
    description: "Thirty-six free upgrades on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.chaoticTemptation3Upgrades),
  },
  chaoticTemptation4: {
    label: "Chaos Jackpot",
    color: COLOR.heavenlyGold,
    image: "crits/warhammer/chaoticTemptation4.webp",
    description: "Forty-two payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.chaoticTemptation4Payouts,
      ),
  },
  emperorsDividends: {
    label: "Praise The Emperor",
    color: COLOR.blue,
    image: "crits/warhammer/emperorsDividends.webp",
    description: "Raises alternating floors to the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(alternating(context), topLevel(context)),
  },
  heavyHitter: {
    label: "Heavy Hitter",
    color: COLOR.redActive,
    image: "crits/warhammer/heavyHitter.webp",
    description: "Raises every floor to the building's top level",
    reward: (context, { actions, topLevel }) =>
      actions.raiseLevels(context.floors, topLevel(context)),
  },
  iAmSpeed: {
    label: "I Am Speed",
    color: COLOR.cyan,
    image: "crits/warhammer/iAmSpeed.webp",
    description: "Boosts every worker for 32s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.iAmSpeedBoostSeconds,
        balance.iAmSpeedExtraWorkers,
      ),
  },
  neverSurrender2: {
    label: "Never Yield",
    color: COLOR.fullHouseCrimson,
    image: "crits/warhammer/neverSurrender2.webp",
    description: "Cuts every price in this building by 12.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.neverSurrender2Discount),
  },
  powerSword: {
    label: "Power Sword",
    color: COLOR.mysticTeal,
    image: "crits/warhammer/powerSword.webp",
    description: "Two tier promotions and eighteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.powerSwordTierSteps,
        balance.powerSwordUpgrades,
      ),
  },
  powerSword2: {
    label: "Sword of the Emperor",
    color: COLOR.heavenlyGold,
    image: "crits/warhammer/powerSword2.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.powerSword2Workers);
      actions.hireManagers(context.floors);
    },
  },
  cobaltJuggernaut: {
    label: "Cobalt Juggernaut",
    color: COLOR.nightOwlIndigo,
    image: "crits/warhammer/cobaltJuggernaut.webp",
    description:
      "Repeats the crit on the floor below, 10% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "down",
        balance.cobaltJuggernautContinueChance,
      ),
  },
  amberVisor: {
    label: "Amber Visor",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/amberVisor.webp",
    description: "Promotes 87% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.amberVisorShare, 2),
  },
  blueGemPlate: {
    label: "Blue Gem Plate",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/blueGemPlate.webp",
    description: "Promotes 64.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.blueGemPlateShare, 1),
  },
  bolterAim: {
    label: "Bolter Aim",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/bolterAim.webp",
    description: "Promotes 87.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.bolterAimShare, 2),
  },
  bullseyePauldron: {
    label: "Bullseye Pauldron",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/bullseyePauldron.webp",
    description: "Promotes 65% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.bullseyePauldronShare, 1),
  },
  copperGrille: {
    label: "Copper Grille",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/copperGrille.webp",
    description: "Promotes 88% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.copperGrilleShare, 2),
  },
  crimsonStare: {
    label: "Crimson Stare",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/crimsonStare.webp",
    description: "Promotes 65.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.crimsonStareShare, 1),
  },
  crimsonWingHelm: {
    label: "Crimson Wing Helm",
    color: COLOR.rainCheckBlue,
    image: "crits/warhammer/crimsonWingHelm.webp",
    description: "Promotes 88.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.crimsonWingHelmShare, 2),
  },
  crossedBarrels: {
    label: "Crossed Barrels",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/crossedBarrels.webp",
    description: "Promotes 66% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.crossedBarrelsShare, 1),
  },
  eagleCrest: {
    label: "Eagle Crest",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/eagleCrest.webp",
    description: "Promotes 89% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.eagleCrestShare, 2),
  },
  eagleHelm: {
    label: "Eagle Helm",
    color: COLOR.rainCheckBlue,
    image: "crits/warhammer/eagleHelm.webp",
    description: "Promotes 66.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.eagleHelmShare, 1),
  },
  eagleMedallion: {
    label: "Eagle Medallion",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/eagleMedallion.webp",
    description: "Promotes 89.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.eagleMedallionShare, 2),
  },
  gemSkull: {
    label: "Gem Skull",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/gemSkull.webp",
    description: "Promotes 67% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.gemSkullShare, 1),
  },
  goldCrestBulk: {
    label: "Gold Crest Bulk",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/goldCrestBulk.webp",
    description: "Promotes 100% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.goldCrestBulkShare, 2),
  },
  goldenWingHelm: {
    label: "Golden Wing Helm",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/goldenWingHelm.webp",
    description: "Adds 110s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldenWingHelmSeconds),
  },
  goldFaceplate: {
    label: "Gold Faceplate",
    color: COLOR.rainCheckBlue,
    image: "crits/warhammer/goldFaceplate.webp",
    description: "Adds 111s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldFaceplateSeconds),
  },
  goldGlyphs: {
    label: "Gold Glyphs",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/goldGlyphs.webp",
    description: "Adds 112s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldGlyphsSeconds),
  },
  goldTrim: {
    label: "Gold Trim",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/goldTrim.webp",
    description: "Adds 35.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldTrimShare),
  },
  greenVisor: {
    label: "Green Visor",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/greenVisor.webp",
    description: "Adds 35.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.greenVisorShare),
  },
  gunwingSkull: {
    label: "Gunwing Skull",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/gunwingSkull.webp",
    description: "Adds 35.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.gunwingSkullShare),
  },
  redChestPlate: {
    label: "Red Chest Plate",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/redChestPlate.webp",
    description: "Adds 35.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.redChestPlateShare),
  },
  redEyeGunner: {
    label: "Red Eye Gunner",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/redEyeGunner.webp",
    description: "Adds 35.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.redEyeGunnerShare),
  },
  redLaurelSkull: {
    label: "Red Laurel Skull",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/redLaurelSkull.webp",
    description: "Adds 35.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.redLaurelSkullShare),
  },
  redStarPauldron: {
    label: "Red Star Pauldron",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/redStarPauldron.webp",
    description: "Adds 35.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.redStarPauldronShare),
  },
  redStripeHelm: {
    label: "Red Stripe Helm",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/redStripeHelm.webp",
    description: "Adds 35.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.redStripeHelmShare),
  },
  shieldWings: {
    label: "Shield Wings",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/shieldWings.webp",
    description: "Adds 35.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.shieldWingsShare),
  },
  shoulderSigils: {
    label: "Shoulder Sigils",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/shoulderSigils.webp",
    description: "Adds 36% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.shoulderSigilsShare),
  },
  sigilChest: {
    label: "Sigil Chest",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/sigilChest.webp",
    description: "Adds 36.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sigilChestShare),
  },
  silverVisor: {
    label: "Silver Visor",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/silverVisor.webp",
    description: "Adds 36.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.silverVisorShare),
  },
  silverWings: {
    label: "Silver Wings",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/silverWings.webp",
    description: "Adds 36.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.silverWingsShare),
  },
  skullPauldron: {
    label: "Skull Pauldron",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/skullPauldron.webp",
    description: "Adds 36.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.skullPauldronShare),
  },
  snowCrest: {
    label: "Snow Crest",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/snowCrest.webp",
    description: "Adds 36.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.snowCrestShare),
  },
  splitSkull: {
    label: "Split Skull",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/splitSkull.webp",
    description: "Adds 36.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.splitSkullShare),
  },
  steelFaceplate: {
    label: "Steel Faceplate",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/steelFaceplate.webp",
    description: "Adds 36.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.steelFaceplateShare),
  },
  tealVisor: {
    label: "Teal Visor",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/tealVisor.webp",
    description: "Adds 36.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.tealVisorShare),
  },
  whiteRune: {
    label: "White Rune",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/whiteRune.webp",
    description: "Adds 36.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.whiteRuneShare),
  },
  wingedSkull: {
    label: "Winged Skull",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammer/wingedSkull.webp",
    description: "Adds 37% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.wingedSkullShare),
  },
  yellowVisor: {
    label: "Yellow Visor",
    color: COLOR.overflowBlue,
    image: "crits/warhammer/yellowVisor.webp",
    description: "Adds 37.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.yellowVisorShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
