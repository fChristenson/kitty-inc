import type { ELEMENTS_CRITS } from "../../critData/elements";
import type { FeaturedRewards } from "./types";

export const ELEMENTS_REWARDS = {
  californiumCrescendo: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.californiumCrescendoUpgrades,
      balance.californiumCrescendoPayouts,
    ),
  einsteiniumEpiphany: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.einsteiniumEpiphanyUpgrades,
      balance.einsteiniumEpiphanyPayouts,
    ),
  fermiumFormula: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  mendeleviumMajesty: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.mendeleviumMajestyTierSteps,
      balance.mendeleviumMajestyUpgrades,
    ),
  nobeliumLaureate: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  lawrenciumLightspeed: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.lawrenciumLightspeedBoostSeconds,
      balance.lawrenciumLightspeedExtraWorkers,
    ),
  rutherfordiumReach: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  seaborgiumSwell: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.seaborgiumSwellBoostSeconds,
      balance.seaborgiumSwellExtraWorkers,
    ),
  bohriumSummit: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.bohriumSummitFloors),
  hassiumMeteor: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.hassiumMeteorBoostSeconds,
      balance.hassiumMeteorExtraWorkers,
    ),
  meitneriumMarvel: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.meitneriumMarvelBoostSeconds,
      balance.meitneriumMarvelExtraWorkers,
    ),
  darmstadtiumDowntown: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.darmstadtiumDowntownDiscount,
    ),
  roentgeniumRevelation: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  coperniciumCarousel: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  nihoniumDaybreak: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.nihoniumDaybreakDiscount),
  fleroviumFortress: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  moscoviumMosaic: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.moscoviumMosaicUpgrades,
      balance.moscoviumMosaicPayouts,
    ),
  livermoriumLightning: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.livermoriumLightningBoostSeconds,
      balance.livermoriumLightningExtraWorkers,
    ),
  tennessineTwinkle: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  oganessonOdyssey: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.oganessonOdysseyWorkers),
  osmiumRegalia: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.osmiumRegaliaTierSteps,
      balance.osmiumRegaliaUpgrades,
    ),
  iridiumAegis: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.iridiumAegisDiscount),
  mercuryFlow: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  thalliumThrive: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.thalliumThriveUpgrades,
      balance.thalliumThrivePayouts,
    ),
  leadLode: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.leadLodeDiscount),
  bismuthBastion: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.bismuthBastionContinueChance),
  poloniumPrism: (context, { actions, balance, alternating }) =>
    actions.hireWorkers(alternating(context), balance.poloniumPrismWorkers),
  astatineAurora: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.astatineAuroraDiscount),
  radonRipple: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.radonRippleContinueChance),
  franciumFortune: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.franciumFortuneShare),
  radiumRhythm: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.radiumRhythmFloors),
  actiniumArc: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.actiniumArcUpgrades,
      balance.actiniumArcPayouts,
    ),
  thoriumThrone: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.thoriumThroneTierSteps,
      balance.thoriumThroneUpgrades,
    ),
  protactiniumOrbit: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.protactiniumOrbitDiscount),
  neptuniumNova: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.neptuniumNovaUpgrades,
      balance.neptuniumNovaPayouts,
    ),
  americiumAlarm: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.americiumAlarmUpgrades,
      balance.americiumAlarmPayouts,
    ),
  plutoniumPulse: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.plutoniumPulseContinueChance),
  curiumCrucible: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.curiumCrucibleUpgrades,
      balance.curiumCruciblePayouts,
    ),
  berkeliumBreakthrough: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.berkeliumBreakthroughDiscount,
    ),
  hydrogenHype: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.hydrogenHypeBoostSeconds,
      balance.hydrogenHypeExtraWorkers,
    ),
  heliumHighrise: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.heliumHighriseUpgrades,
      balance.heliumHighrisePayouts,
    ),
  lithiumLift: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.lithiumLiftFloors),
  berylliumBrilliance: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.berylliumBrillianceUpgrades,
      balance.berylliumBrilliancePayouts,
    ),
  carbonCrown: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.carbonCrownTierSteps,
      balance.carbonCrownUpgrades,
    ),
  nitrogenNimbus: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.nitrogenNimbusBoostSeconds,
      balance.nitrogenNimbusExtraWorkers,
    ),
  oxygenOverdrive: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.oxygenOverdriveBoostSeconds,
      balance.oxygenOverdriveExtraWorkers,
    ),
  fluorineFlash: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.fluorineFlashWorkers),
  sodiumSprinkle: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  magnesiumMagnificence: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  aluminumAllStar: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.aluminumAllStarUpgrades,
      balance.aluminumAllStarPayouts,
    ),
  siliconSpark: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.siliconSparkBoostSeconds,
      balance.siliconSparkExtraWorkers,
    ),
  phosphorusFlare: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  sulfurSunshine: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.sulfurSunshineUpgrades,
      balance.sulfurSunshinePayouts,
    ),
  chlorineConfetti: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.chlorineConfettiUpgrades,
      balance.chlorineConfettiPayouts,
    ),
  argonAfterglow: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.argonAfterglowUpgrades,
      balance.argonAfterglowPayouts,
    ),
  potassiumPop: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  calciumCornerstone: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  scandiumStronghold: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.scandiumStrongholdWorkers),
  titaniumTakeoff: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  vanadiumVoltage: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.vanadiumVoltageBoostSeconds,
      balance.vanadiumVoltageExtraWorkers,
    ),
  chromiumGleam: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  manganeseMomentum: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  ironEmpire: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  cobaltCharge: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.cobaltChargeBoostSeconds,
      balance.cobaltChargeExtraWorkers,
    ),
  nickelNestEgg: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.nickelNestEggContinueChance),
  copperCurrent: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  zincZing: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.zincZingUpgrades,
      balance.zincZingPayouts,
    ),
  galliumGlitter: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.galliumGlitterUpgrades,
      balance.galliumGlitterPayouts,
    ),
  germaniumGenius: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.germaniumGeniusUpgrades,
      balance.germaniumGeniusPayouts,
    ),
  arsenicAlchemy: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.arsenicAlchemyDiscount),
  seleniumSunburst: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.seleniumSunburstUpgrades,
      balance.seleniumSunburstPayouts,
    ),
  bromineBounty: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bromineBountySeconds),
  kryptonKeepsake: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.kryptonKeepsakeUpgrades,
      balance.kryptonKeepsakePayouts,
    ),
  rubidiumRadiance: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  strontiumSpectacle: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "up",
      balance.strontiumSpectacleContinueChance,
    ),
  yttriumYield: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  zirconiumZenith: (context, { actions }) => actions.hireManagers([context.floor]),
  niobiumNexus: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.niobiumNexusDiscount),
  molybdenumMachine: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.molybdenumMachineUpgrades,
      balance.molybdenumMachinePayouts,
    ),
  technetiumTimebank: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.technetiumTimebankShare),
  rutheniumRiches: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.rutheniumRichesSeconds),
  rhodiumReflection: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  palladiumPilot: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.palladiumPilotDiscount),
  silverMoonrise: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.silverMoonriseWorkers),
  cadmiumCatalyst: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.cadmiumCatalystUpgrades,
      balance.cadmiumCatalystPayouts,
    ),
  indiumInsight: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.indiumInsightUpgrades,
      balance.indiumInsightPayouts,
    ),
  tinTreasure: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tinTreasureShare),
  antimonyAscension: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.antimonyAscensionFloors),
  telluriumTreasurelight: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.telluriumTreasurelightSeconds),
  iodineIridescence: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.iodineIridescenceDiscount),
  xenonSpotlight: (context, { actions }) => actions.hireManagers([context.floor]),
  cesiumClockwork: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.cesiumClockworkDiscount),
  bariumBeacon: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.bariumBeaconUpgrades,
      balance.bariumBeaconPayouts,
    ),
  lanthanumLuster: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  ceriumShine: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.ceriumShineDiscount),
  praseodymiumPrism: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.praseodymiumPrismWorkers),
  neodymiumNorthstar: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.neodymiumNorthstarDiscount,
    ),
  promethiumPulse: (context, { actions }) => actions.hireManagers([context.floor]),
  samariumSanctuary: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  europiumEncore: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.europiumEncoreContinueChance),
  gadoliniumGlance: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.gadoliniumGlanceUpgrades,
      balance.gadoliniumGlancePayouts,
    ),
  terbiumTempo: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.terbiumTempoWorkers),
  dysprosiumDirection: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.dysprosiumDirectionUpgrades,
      balance.dysprosiumDirectionPayouts,
    ),
  holmiumHalo: (context, { actions }) => actions.hireManagers([context.floor]),
  erbiumElegance: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  thuliumThaw: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.thuliumThawWorkers),
  ytterbiumHourglass: (context, { actions }) => actions.hireManagers([context.floor]),
  lutetiumLimelight: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  hafniumHorizon: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.hafniumHorizonWorkers),
  tantalumTrove: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  tungstenTriumph: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.tungstenTriumphUpgrades,
      balance.tungstenTriumphPayouts,
    ),
  rheniumRocket: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.rheniumRocketFloors),
  platinumPodium: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  goldenAtom: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldenAtomSeconds),
  uraniumUplift: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.uraniumUpliftFloors),
  heavyElement: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.heavyElementWorkers),
  nucleusDividend: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.nucleusDividendSeconds),
  quicksilverDrop: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.quicksilverDropShare),
} satisfies FeaturedRewards<typeof ELEMENTS_CRITS>;
