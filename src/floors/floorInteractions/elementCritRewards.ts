import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";
import type { CritRewardContext } from "./index";

export function createElementCritRewards(actions: {
  upgrade: (floors: Floor[], count: number) => void;
  payCycles: (floors: Floor[], count: number) => void;
}) {
  const balance = CONFIG.crit;
  const reward = (
    context: CritRewardContext,
    upgrades: number,
    payouts: number,
  ): void => {
    const highest =
      context.floors.filter((floor) => floor.unlocked).at(-1) ?? context.floor;
    actions.upgrade([context.floor], upgrades);
    actions.payCycles([highest], payouts);
  };
  return {
    californiumCrescendo: (context: CritRewardContext) =>
      reward(
        context,
        balance.californiumCrescendoUpgrades,
        balance.californiumCrescendoPayouts,
      ),
    einsteiniumEpiphany: (context: CritRewardContext) =>
      reward(
        context,
        balance.einsteiniumEpiphanyUpgrades,
        balance.einsteiniumEpiphanyPayouts,
      ),
    fermiumFormula: (context: CritRewardContext) =>
      reward(
        context,
        balance.fermiumFormulaUpgrades,
        balance.fermiumFormulaPayouts,
      ),
    mendeleviumMajesty: (context: CritRewardContext) =>
      reward(
        context,
        balance.mendeleviumMajestyUpgrades,
        balance.mendeleviumMajestyPayouts,
      ),
    nobeliumLaureate: (context: CritRewardContext) =>
      reward(
        context,
        balance.nobeliumLaureateUpgrades,
        balance.nobeliumLaureatePayouts,
      ),
    lawrenciumLightspeed: (context: CritRewardContext) =>
      reward(
        context,
        balance.lawrenciumLightspeedUpgrades,
        balance.lawrenciumLightspeedPayouts,
      ),
    rutherfordiumReach: (context: CritRewardContext) =>
      reward(
        context,
        balance.rutherfordiumReachUpgrades,
        balance.rutherfordiumReachPayouts,
      ),
    seaborgiumSwell: (context: CritRewardContext) =>
      reward(
        context,
        balance.seaborgiumSwellUpgrades,
        balance.seaborgiumSwellPayouts,
      ),
    bohriumSummit: (context: CritRewardContext) =>
      reward(
        context,
        balance.bohriumSummitUpgrades,
        balance.bohriumSummitPayouts,
      ),
    hassiumMeteor: (context: CritRewardContext) =>
      reward(
        context,
        balance.hassiumMeteorUpgrades,
        balance.hassiumMeteorPayouts,
      ),
    meitneriumMarvel: (context: CritRewardContext) =>
      reward(
        context,
        balance.meitneriumMarvelUpgrades,
        balance.meitneriumMarvelPayouts,
      ),
    darmstadtiumDowntown: (context: CritRewardContext) =>
      reward(
        context,
        balance.darmstadtiumDowntownUpgrades,
        balance.darmstadtiumDowntownPayouts,
      ),
    roentgeniumRevelation: (context: CritRewardContext) =>
      reward(
        context,
        balance.roentgeniumRevelationUpgrades,
        balance.roentgeniumRevelationPayouts,
      ),
    coperniciumCarousel: (context: CritRewardContext) =>
      reward(
        context,
        balance.coperniciumCarouselUpgrades,
        balance.coperniciumCarouselPayouts,
      ),
    nihoniumDaybreak: (context: CritRewardContext) =>
      reward(
        context,
        balance.nihoniumDaybreakUpgrades,
        balance.nihoniumDaybreakPayouts,
      ),
    fleroviumFortress: (context: CritRewardContext) =>
      reward(
        context,
        balance.fleroviumFortressUpgrades,
        balance.fleroviumFortressPayouts,
      ),
    moscoviumMosaic: (context: CritRewardContext) =>
      reward(
        context,
        balance.moscoviumMosaicUpgrades,
        balance.moscoviumMosaicPayouts,
      ),
    livermoriumLightning: (context: CritRewardContext) =>
      reward(
        context,
        balance.livermoriumLightningUpgrades,
        balance.livermoriumLightningPayouts,
      ),
    tennessineTwinkle: (context: CritRewardContext) =>
      reward(
        context,
        balance.tennessineTwinkleUpgrades,
        balance.tennessineTwinklePayouts,
      ),
    oganessonOdyssey: (context: CritRewardContext) =>
      reward(
        context,
        balance.oganessonOdysseyUpgrades,
        balance.oganessonOdysseyPayouts,
      ),
    osmiumRegalia: (context: CritRewardContext) =>
      reward(
        context,
        balance.osmiumRegaliaUpgrades,
        balance.osmiumRegaliaPayouts,
      ),
    iridiumAegis: (context: CritRewardContext) =>
      reward(
        context,
        balance.iridiumAegisUpgrades,
        balance.iridiumAegisPayouts,
      ),
    mercuryFlow: (context: CritRewardContext) =>
      reward(context, balance.mercuryFlowUpgrades, balance.mercuryFlowPayouts),
    thalliumThrive: (context: CritRewardContext) =>
      reward(
        context,
        balance.thalliumThriveUpgrades,
        balance.thalliumThrivePayouts,
      ),
    leadLode: (context: CritRewardContext) =>
      reward(context, balance.leadLodeUpgrades, balance.leadLodePayouts),
    bismuthBastion: (context: CritRewardContext) =>
      reward(
        context,
        balance.bismuthBastionUpgrades,
        balance.bismuthBastionPayouts,
      ),
    poloniumPrism: (context: CritRewardContext) =>
      reward(
        context,
        balance.poloniumPrismUpgrades,
        balance.poloniumPrismPayouts,
      ),
    astatineAurora: (context: CritRewardContext) =>
      reward(
        context,
        balance.astatineAuroraUpgrades,
        balance.astatineAuroraPayouts,
      ),
    radonRipple: (context: CritRewardContext) =>
      reward(context, balance.radonRippleUpgrades, balance.radonRipplePayouts),
    franciumFortune: (context: CritRewardContext) =>
      reward(
        context,
        balance.franciumFortuneUpgrades,
        balance.franciumFortunePayouts,
      ),
    radiumRhythm: (context: CritRewardContext) =>
      reward(
        context,
        balance.radiumRhythmUpgrades,
        balance.radiumRhythmPayouts,
      ),
    actiniumArc: (context: CritRewardContext) =>
      reward(context, balance.actiniumArcUpgrades, balance.actiniumArcPayouts),
    thoriumThrone: (context: CritRewardContext) =>
      reward(
        context,
        balance.thoriumThroneUpgrades,
        balance.thoriumThronePayouts,
      ),
    protactiniumOrbit: (context: CritRewardContext) =>
      reward(
        context,
        balance.protactiniumOrbitUpgrades,
        balance.protactiniumOrbitPayouts,
      ),
    neptuniumNova: (context: CritRewardContext) =>
      reward(
        context,
        balance.neptuniumNovaUpgrades,
        balance.neptuniumNovaPayouts,
      ),
    plutoniumPulse: (context: CritRewardContext) =>
      reward(
        context,
        balance.plutoniumPulseUpgrades,
        balance.plutoniumPulsePayouts,
      ),
    americiumAlarm: (context: CritRewardContext) =>
      reward(
        context,
        balance.americiumAlarmUpgrades,
        balance.americiumAlarmPayouts,
      ),
    curiumCrucible: (context: CritRewardContext) =>
      reward(
        context,
        balance.curiumCrucibleUpgrades,
        balance.curiumCruciblePayouts,
      ),
    berkeliumBreakthrough: (context: CritRewardContext) =>
      reward(
        context,
        balance.berkeliumBreakthroughUpgrades,
        balance.berkeliumBreakthroughPayouts,
      ),
    hydrogenHype: (context: CritRewardContext) =>
      reward(
        context,
        balance.hydrogenHypeUpgrades,
        balance.hydrogenHypePayouts,
      ),
    heliumHighrise: (context: CritRewardContext) =>
      reward(
        context,
        balance.heliumHighriseUpgrades,
        balance.heliumHighrisePayouts,
      ),
    lithiumLift: (context: CritRewardContext) =>
      reward(context, balance.lithiumLiftUpgrades, balance.lithiumLiftPayouts),
    berylliumBrilliance: (context: CritRewardContext) =>
      reward(
        context,
        balance.berylliumBrillianceUpgrades,
        balance.berylliumBrilliancePayouts,
      ),
    carbonCrown: (context: CritRewardContext) =>
      reward(context, balance.carbonCrownUpgrades, balance.carbonCrownPayouts),
    nitrogenNimbus: (context: CritRewardContext) =>
      reward(
        context,
        balance.nitrogenNimbusUpgrades,
        balance.nitrogenNimbusPayouts,
      ),
    oxygenOverdrive: (context: CritRewardContext) =>
      reward(
        context,
        balance.oxygenOverdriveUpgrades,
        balance.oxygenOverdrivePayouts,
      ),
    fluorineFlash: (context: CritRewardContext) =>
      reward(
        context,
        balance.fluorineFlashUpgrades,
        balance.fluorineFlashPayouts,
      ),
    sodiumSprinkle: (context: CritRewardContext) =>
      reward(
        context,
        balance.sodiumSprinkleUpgrades,
        balance.sodiumSprinklePayouts,
      ),
    magnesiumMagnificence: (context: CritRewardContext) =>
      reward(
        context,
        balance.magnesiumMagnificenceUpgrades,
        balance.magnesiumMagnificencePayouts,
      ),
    aluminumAllStar: (context: CritRewardContext) =>
      reward(
        context,
        balance.aluminumAllStarUpgrades,
        balance.aluminumAllStarPayouts,
      ),
    siliconSpark: (context: CritRewardContext) =>
      reward(
        context,
        balance.siliconSparkUpgrades,
        balance.siliconSparkPayouts,
      ),
    phosphorusFlare: (context: CritRewardContext) =>
      reward(
        context,
        balance.phosphorusFlareUpgrades,
        balance.phosphorusFlarePayouts,
      ),
    sulfurSunshine: (context: CritRewardContext) =>
      reward(
        context,
        balance.sulfurSunshineUpgrades,
        balance.sulfurSunshinePayouts,
      ),
    chlorineConfetti: (context: CritRewardContext) =>
      reward(
        context,
        balance.chlorineConfettiUpgrades,
        balance.chlorineConfettiPayouts,
      ),
    argonAfterglow: (context: CritRewardContext) =>
      reward(
        context,
        balance.argonAfterglowUpgrades,
        balance.argonAfterglowPayouts,
      ),
    potassiumPop: (context: CritRewardContext) =>
      reward(
        context,
        balance.potassiumPopUpgrades,
        balance.potassiumPopPayouts,
      ),
    calciumCornerstone: (context: CritRewardContext) =>
      reward(
        context,
        balance.calciumCornerstoneUpgrades,
        balance.calciumCornerstonePayouts,
      ),
    scandiumStronghold: (context: CritRewardContext) =>
      reward(
        context,
        balance.scandiumStrongholdUpgrades,
        balance.scandiumStrongholdPayouts,
      ),
    titaniumTakeoff: (context: CritRewardContext) =>
      reward(
        context,
        balance.titaniumTakeoffUpgrades,
        balance.titaniumTakeoffPayouts,
      ),
    vanadiumVoltage: (context: CritRewardContext) =>
      reward(
        context,
        balance.vanadiumVoltageUpgrades,
        balance.vanadiumVoltagePayouts,
      ),
    chromiumGleam: (context: CritRewardContext) =>
      reward(
        context,
        balance.chromiumGleamUpgrades,
        balance.chromiumGleamPayouts,
      ),
    manganeseMomentum: (context: CritRewardContext) =>
      reward(
        context,
        balance.manganeseMomentumUpgrades,
        balance.manganeseMomentumPayouts,
      ),
    ironEmpire: (context: CritRewardContext) =>
      reward(context, balance.ironEmpireUpgrades, balance.ironEmpirePayouts),
    cobaltCharge: (context: CritRewardContext) =>
      reward(
        context,
        balance.cobaltChargeUpgrades,
        balance.cobaltChargePayouts,
      ),
    nickelNestEgg: (context: CritRewardContext) =>
      reward(
        context,
        balance.nickelNestEggUpgrades,
        balance.nickelNestEggPayouts,
      ),
    copperCurrent: (context: CritRewardContext) =>
      reward(
        context,
        balance.copperCurrentUpgrades,
        balance.copperCurrentPayouts,
      ),
    zincZing: (context: CritRewardContext) =>
      reward(context, balance.zincZingUpgrades, balance.zincZingPayouts),
    galliumGlitter: (context: CritRewardContext) =>
      reward(
        context,
        balance.galliumGlitterUpgrades,
        balance.galliumGlitterPayouts,
      ),
    germaniumGenius: (context: CritRewardContext) =>
      reward(
        context,
        balance.germaniumGeniusUpgrades,
        balance.germaniumGeniusPayouts,
      ),
    arsenicAlchemy: (context: CritRewardContext) =>
      reward(
        context,
        balance.arsenicAlchemyUpgrades,
        balance.arsenicAlchemyPayouts,
      ),
    seleniumSunburst: (context: CritRewardContext) =>
      reward(
        context,
        balance.seleniumSunburstUpgrades,
        balance.seleniumSunburstPayouts,
      ),
    bromineBounty: (context: CritRewardContext) =>
      reward(
        context,
        balance.bromineBountyUpgrades,
        balance.bromineBountyPayouts,
      ),
    kryptonKeepsake: (context: CritRewardContext) =>
      reward(
        context,
        balance.kryptonKeepsakeUpgrades,
        balance.kryptonKeepsakePayouts,
      ),
    rubidiumRadiance: (context: CritRewardContext) =>
      reward(
        context,
        balance.rubidiumRadianceUpgrades,
        balance.rubidiumRadiancePayouts,
      ),
    strontiumSpectacle: (context: CritRewardContext) =>
      reward(
        context,
        balance.strontiumSpectacleUpgrades,
        balance.strontiumSpectaclePayouts,
      ),
    yttriumYield: (context: CritRewardContext) =>
      reward(
        context,
        balance.yttriumYieldUpgrades,
        balance.yttriumYieldPayouts,
      ),
    zirconiumZenith: (context: CritRewardContext) =>
      reward(
        context,
        balance.zirconiumZenithUpgrades,
        balance.zirconiumZenithPayouts,
      ),
    niobiumNexus: (context: CritRewardContext) =>
      reward(
        context,
        balance.niobiumNexusUpgrades,
        balance.niobiumNexusPayouts,
      ),
    molybdenumMachine: (context: CritRewardContext) =>
      reward(
        context,
        balance.molybdenumMachineUpgrades,
        balance.molybdenumMachinePayouts,
      ),
    technetiumTimebank: (context: CritRewardContext) =>
      reward(
        context,
        balance.technetiumTimebankUpgrades,
        balance.technetiumTimebankPayouts,
      ),
    rutheniumRiches: (context: CritRewardContext) =>
      reward(
        context,
        balance.rutheniumRichesUpgrades,
        balance.rutheniumRichesPayouts,
      ),
    rhodiumReflection: (context: CritRewardContext) =>
      reward(
        context,
        balance.rhodiumReflectionUpgrades,
        balance.rhodiumReflectionPayouts,
      ),
    palladiumPilot: (context: CritRewardContext) =>
      reward(
        context,
        balance.palladiumPilotUpgrades,
        balance.palladiumPilotPayouts,
      ),
    silverMoonrise: (context: CritRewardContext) =>
      reward(
        context,
        balance.silverMoonriseUpgrades,
        balance.silverMoonrisePayouts,
      ),
    cadmiumCatalyst: (context: CritRewardContext) =>
      reward(
        context,
        balance.cadmiumCatalystUpgrades,
        balance.cadmiumCatalystPayouts,
      ),
    indiumInsight: (context: CritRewardContext) =>
      reward(
        context,
        balance.indiumInsightUpgrades,
        balance.indiumInsightPayouts,
      ),
    tinTreasure: (context: CritRewardContext) =>
      reward(context, balance.tinTreasureUpgrades, balance.tinTreasurePayouts),
    antimonyAscension: (context: CritRewardContext) =>
      reward(
        context,
        balance.antimonyAscensionUpgrades,
        balance.antimonyAscensionPayouts,
      ),
    telluriumTreasurelight: (context: CritRewardContext) =>
      reward(
        context,
        balance.telluriumTreasurelightUpgrades,
        balance.telluriumTreasurelightPayouts,
      ),
    iodineIridescence: (context: CritRewardContext) =>
      reward(
        context,
        balance.iodineIridescenceUpgrades,
        balance.iodineIridescencePayouts,
      ),
    xenonSpotlight: (context: CritRewardContext) =>
      reward(
        context,
        balance.xenonSpotlightUpgrades,
        balance.xenonSpotlightPayouts,
      ),
    cesiumClockwork: (context: CritRewardContext) =>
      reward(
        context,
        balance.cesiumClockworkUpgrades,
        balance.cesiumClockworkPayouts,
      ),
    bariumBeacon: (context: CritRewardContext) =>
      reward(
        context,
        balance.bariumBeaconUpgrades,
        balance.bariumBeaconPayouts,
      ),
    lanthanumLuster: (context: CritRewardContext) =>
      reward(
        context,
        balance.lanthanumLusterUpgrades,
        balance.lanthanumLusterPayouts,
      ),
    ceriumShine: (context: CritRewardContext) =>
      reward(context, balance.ceriumShineUpgrades, balance.ceriumShinePayouts),
    praseodymiumPrism: (context: CritRewardContext) =>
      reward(
        context,
        balance.praseodymiumPrismUpgrades,
        balance.praseodymiumPrismPayouts,
      ),
    neodymiumNorthstar: (context: CritRewardContext) =>
      reward(
        context,
        balance.neodymiumNorthstarUpgrades,
        balance.neodymiumNorthstarPayouts,
      ),
    promethiumPulse: (context: CritRewardContext) =>
      reward(
        context,
        balance.promethiumPulseUpgrades,
        balance.promethiumPulsePayouts,
      ),
    samariumSanctuary: (context: CritRewardContext) =>
      reward(
        context,
        balance.samariumSanctuaryUpgrades,
        balance.samariumSanctuaryPayouts,
      ),
    europiumEncore: (context: CritRewardContext) =>
      reward(
        context,
        balance.europiumEncoreUpgrades,
        balance.europiumEncorePayouts,
      ),
    gadoliniumGlance: (context: CritRewardContext) =>
      reward(
        context,
        balance.gadoliniumGlanceUpgrades,
        balance.gadoliniumGlancePayouts,
      ),
    terbiumTempo: (context: CritRewardContext) =>
      reward(
        context,
        balance.terbiumTempoUpgrades,
        balance.terbiumTempoPayouts,
      ),
    dysprosiumDirection: (context: CritRewardContext) =>
      reward(
        context,
        balance.dysprosiumDirectionUpgrades,
        balance.dysprosiumDirectionPayouts,
      ),
    holmiumHalo: (context: CritRewardContext) =>
      reward(context, balance.holmiumHaloUpgrades, balance.holmiumHaloPayouts),
    erbiumElegance: (context: CritRewardContext) =>
      reward(
        context,
        balance.erbiumEleganceUpgrades,
        balance.erbiumElegancePayouts,
      ),
    thuliumThaw: (context: CritRewardContext) =>
      reward(context, balance.thuliumThawUpgrades, balance.thuliumThawPayouts),
    ytterbiumHourglass: (context: CritRewardContext) =>
      reward(
        context,
        balance.ytterbiumHourglassUpgrades,
        balance.ytterbiumHourglassPayouts,
      ),
    lutetiumLimelight: (context: CritRewardContext) =>
      reward(
        context,
        balance.lutetiumLimelightUpgrades,
        balance.lutetiumLimelightPayouts,
      ),
    hafniumHorizon: (context: CritRewardContext) =>
      reward(
        context,
        balance.hafniumHorizonUpgrades,
        balance.hafniumHorizonPayouts,
      ),
    tantalumTrove: (context: CritRewardContext) =>
      reward(
        context,
        balance.tantalumTroveUpgrades,
        balance.tantalumTrovePayouts,
      ),
    tungstenTriumph: (context: CritRewardContext) =>
      reward(
        context,
        balance.tungstenTriumphUpgrades,
        balance.tungstenTriumphPayouts,
      ),
    rheniumRocket: (context: CritRewardContext) =>
      reward(
        context,
        balance.rheniumRocketUpgrades,
        balance.rheniumRocketPayouts,
      ),
    platinumPodium: (context: CritRewardContext) =>
      reward(
        context,
        balance.platinumPodiumUpgrades,
        balance.platinumPodiumPayouts,
      ),
    goldenAtom: (context: CritRewardContext) =>
      reward(context, balance.goldenAtomUpgrades, balance.goldenAtomPayouts),
    uraniumUplift: (context: CritRewardContext) =>
      reward(
        context,
        balance.uraniumUpliftUpgrades,
        balance.uraniumUpliftPayouts,
      ),
  };
}
