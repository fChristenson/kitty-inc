import type { WARHAMMER_CRITS } from "../../critData/warhammer";
import type { FeaturedRewards } from "./types";

export const WARHAMMER_REWARDS = {
  emperorsFinest: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.emperorsFinestPayouts),
  eternalDuty: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.eternalDutyBoostSeconds,
      balance.eternalDutyExtraWorkers,
    ),
  faithIsOurShield: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.faithIsOurShieldTierSteps,
      balance.faithIsOurShieldUpgrades,
    ),
  fearNotThePsyker: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.fearNotThePsykerContinueChance),
  neverSurrender: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  purge: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  toTheSkies: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  whatAreYourOrders: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade(
      [lowestLevel(context)],
      balance.whatAreYourOrdersUpgrades,
    ),
  emperorProvidesPurrfection: (context, { actions, balance }) =>
    actions.payCycles(
      context.floors,
      balance.emperorProvidesPurrfectionPayouts,
    ),
  fortyKOfGold: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.fortyKOfGoldPayouts),
  chaoticTemptation: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.chaoticTemptationFloors),
  chaoticTemptation2: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.chaoticTemptation2Upgrades),
  chaoticTemptation3: (context, { actions, balance, alternating }) =>
    actions.upgrade(alternating(context), balance.chaoticTemptation3Upgrades),
  chaoticTemptation4: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.chaoticTemptation4Payouts,
    ),
  emperorsDividends: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  heavyHitter: (context, { actions, topLevel }) =>
    actions.raiseLevels(context.floors, topLevel(context)),
  iAmSpeed: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.iAmSpeedBoostSeconds,
      balance.iAmSpeedExtraWorkers,
    ),
  neverSurrender2: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.neverSurrender2Discount),
  powerSword: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.powerSwordTierSteps,
      balance.powerSwordUpgrades,
    ),
  powerSword2: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.powerSword2Workers);
    actions.hireManagers(context.floors);
  },
  cobaltJuggernaut: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "down",
      balance.cobaltJuggernautContinueChance,
    ),
  amberVisor: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.amberVisorShare, 2),
  blueGemPlate: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.blueGemPlateShare, 1),
  bolterAim: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.bolterAimShare, 2),
  bullseyePauldron: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.bullseyePauldronShare, 1),
  copperGrille: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.copperGrilleShare, 2),
  crimsonStare: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.crimsonStareShare, 1),
  crimsonWingHelm: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.crimsonWingHelmShare, 2),
  crossedBarrels: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.crossedBarrelsShare, 1),
  eagleCrest: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.eagleCrestShare, 2),
  eagleHelm: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.eagleHelmShare, 1),
  eagleMedallion: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.eagleMedallionShare, 2),
  gemSkull: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.gemSkullShare, 1),
  goldCrestBulk: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.goldCrestBulkShare, 2),
  goldenWingHelm: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldenWingHelmSeconds),
  goldFaceplate: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldFaceplateSeconds),
  goldGlyphs: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldGlyphsSeconds),
  goldTrim: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldTrimShare),
  greenVisor: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.greenVisorShare),
  gunwingSkull: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.gunwingSkullShare),
  redChestPlate: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redChestPlateShare),
  redEyeGunner: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redEyeGunnerShare),
  redLaurelSkull: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redLaurelSkullShare),
  redStarPauldron: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redStarPauldronShare),
  redStripeHelm: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redStripeHelmShare),
  shieldWings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shieldWingsShare),
  shoulderSigils: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shoulderSigilsShare),
  sigilChest: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sigilChestShare),
  silverVisor: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.silverVisorShare),
  silverWings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.silverWingsShare),
  skullPauldron: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.skullPauldronShare),
  snowCrest: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.snowCrestShare),
  splitSkull: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.splitSkullShare),
  steelFaceplate: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.steelFaceplateShare),
  tealVisor: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tealVisorShare),
  whiteRune: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.whiteRuneShare),
  wingedSkull: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.wingedSkullShare),
  yellowVisor: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.yellowVisorShare),
} satisfies FeaturedRewards<typeof WARHAMMER_CRITS>;
