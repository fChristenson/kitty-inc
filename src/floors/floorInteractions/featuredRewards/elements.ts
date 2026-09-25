import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createElementsRewards({
  actions,
  balance,
}: RewardHelpers) {
  // every element crit: upgrades here, then payouts on the highest floor
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
    californiumCrescendo: (context) =>
      reward(
        context,
        balance.californiumCrescendoUpgrades,
        balance.californiumCrescendoPayouts,
      ),
    einsteiniumEpiphany: (context) =>
      reward(
        context,
        balance.einsteiniumEpiphanyUpgrades,
        balance.einsteiniumEpiphanyPayouts,
      ),
    fermiumFormula: (context) =>
      reward(
        context,
        balance.fermiumFormulaUpgrades,
        balance.fermiumFormulaPayouts,
      ),
    mendeleviumMajesty: (context) =>
      reward(
        context,
        balance.mendeleviumMajestyUpgrades,
        balance.mendeleviumMajestyPayouts,
      ),
    nobeliumLaureate: (context) =>
      reward(
        context,
        balance.nobeliumLaureateUpgrades,
        balance.nobeliumLaureatePayouts,
      ),
    lawrenciumLightspeed: (context) =>
      reward(
        context,
        balance.lawrenciumLightspeedUpgrades,
        balance.lawrenciumLightspeedPayouts,
      ),
    rutherfordiumReach: (context) =>
      reward(
        context,
        balance.rutherfordiumReachUpgrades,
        balance.rutherfordiumReachPayouts,
      ),
    seaborgiumSwell: (context) =>
      reward(
        context,
        balance.seaborgiumSwellUpgrades,
        balance.seaborgiumSwellPayouts,
      ),
    bohriumSummit: (context) =>
      reward(
        context,
        balance.bohriumSummitUpgrades,
        balance.bohriumSummitPayouts,
      ),
    hassiumMeteor: (context) =>
      reward(
        context,
        balance.hassiumMeteorUpgrades,
        balance.hassiumMeteorPayouts,
      ),
    meitneriumMarvel: (context) =>
      reward(
        context,
        balance.meitneriumMarvelUpgrades,
        balance.meitneriumMarvelPayouts,
      ),
    darmstadtiumDowntown: (context) =>
      reward(
        context,
        balance.darmstadtiumDowntownUpgrades,
        balance.darmstadtiumDowntownPayouts,
      ),
    roentgeniumRevelation: (context) =>
      reward(
        context,
        balance.roentgeniumRevelationUpgrades,
        balance.roentgeniumRevelationPayouts,
      ),
    coperniciumCarousel: (context) =>
      reward(
        context,
        balance.coperniciumCarouselUpgrades,
        balance.coperniciumCarouselPayouts,
      ),
    nihoniumDaybreak: (context) =>
      reward(
        context,
        balance.nihoniumDaybreakUpgrades,
        balance.nihoniumDaybreakPayouts,
      ),
    fleroviumFortress: (context) =>
      reward(
        context,
        balance.fleroviumFortressUpgrades,
        balance.fleroviumFortressPayouts,
      ),
    moscoviumMosaic: (context) =>
      reward(
        context,
        balance.moscoviumMosaicUpgrades,
        balance.moscoviumMosaicPayouts,
      ),
    livermoriumLightning: (context) =>
      reward(
        context,
        balance.livermoriumLightningUpgrades,
        balance.livermoriumLightningPayouts,
      ),
    tennessineTwinkle: (context) =>
      reward(
        context,
        balance.tennessineTwinkleUpgrades,
        balance.tennessineTwinklePayouts,
      ),
    oganessonOdyssey: (context) =>
      reward(
        context,
        balance.oganessonOdysseyUpgrades,
        balance.oganessonOdysseyPayouts,
      ),
    osmiumRegalia: (context) =>
      reward(
        context,
        balance.osmiumRegaliaUpgrades,
        balance.osmiumRegaliaPayouts,
      ),
    iridiumAegis: (context) =>
      reward(
        context,
        balance.iridiumAegisUpgrades,
        balance.iridiumAegisPayouts,
      ),
    mercuryFlow: (context) =>
      reward(context, balance.mercuryFlowUpgrades, balance.mercuryFlowPayouts),
    thalliumThrive: (context) =>
      reward(
        context,
        balance.thalliumThriveUpgrades,
        balance.thalliumThrivePayouts,
      ),
    leadLode: (context) =>
      reward(context, balance.leadLodeUpgrades, balance.leadLodePayouts),
    bismuthBastion: (context) =>
      reward(
        context,
        balance.bismuthBastionUpgrades,
        balance.bismuthBastionPayouts,
      ),
    poloniumPrism: (context) =>
      reward(
        context,
        balance.poloniumPrismUpgrades,
        balance.poloniumPrismPayouts,
      ),
    astatineAurora: (context) =>
      reward(
        context,
        balance.astatineAuroraUpgrades,
        balance.astatineAuroraPayouts,
      ),
    radonRipple: (context) =>
      reward(context, balance.radonRippleUpgrades, balance.radonRipplePayouts),
    franciumFortune: (context) =>
      reward(
        context,
        balance.franciumFortuneUpgrades,
        balance.franciumFortunePayouts,
      ),
    radiumRhythm: (context) =>
      reward(
        context,
        balance.radiumRhythmUpgrades,
        balance.radiumRhythmPayouts,
      ),
    actiniumArc: (context) =>
      reward(context, balance.actiniumArcUpgrades, balance.actiniumArcPayouts),
    thoriumThrone: (context) =>
      reward(
        context,
        balance.thoriumThroneUpgrades,
        balance.thoriumThronePayouts,
      ),
    protactiniumOrbit: (context) =>
      reward(
        context,
        balance.protactiniumOrbitUpgrades,
        balance.protactiniumOrbitPayouts,
      ),
    neptuniumNova: (context) =>
      reward(
        context,
        balance.neptuniumNovaUpgrades,
        balance.neptuniumNovaPayouts,
      ),
    americiumAlarm: (context) =>
      reward(
        context,
        balance.americiumAlarmUpgrades,
        balance.americiumAlarmPayouts,
      ),
    plutoniumPulse: (context) =>
      reward(
        context,
        balance.plutoniumPulseUpgrades,
        balance.plutoniumPulsePayouts,
      ),
    curiumCrucible: (context) =>
      reward(
        context,
        balance.curiumCrucibleUpgrades,
        balance.curiumCruciblePayouts,
      ),
    berkeliumBreakthrough: (context) =>
      reward(
        context,
        balance.berkeliumBreakthroughUpgrades,
        balance.berkeliumBreakthroughPayouts,
      ),
    hydrogenHype: (context) =>
      reward(
        context,
        balance.hydrogenHypeUpgrades,
        balance.hydrogenHypePayouts,
      ),
    heliumHighrise: (context) =>
      reward(
        context,
        balance.heliumHighriseUpgrades,
        balance.heliumHighrisePayouts,
      ),
    lithiumLift: (context) =>
      reward(context, balance.lithiumLiftUpgrades, balance.lithiumLiftPayouts),
    berylliumBrilliance: (context) =>
      reward(
        context,
        balance.berylliumBrillianceUpgrades,
        balance.berylliumBrilliancePayouts,
      ),
    carbonCrown: (context) =>
      reward(context, balance.carbonCrownUpgrades, balance.carbonCrownPayouts),
    nitrogenNimbus: (context) =>
      reward(
        context,
        balance.nitrogenNimbusUpgrades,
        balance.nitrogenNimbusPayouts,
      ),
    oxygenOverdrive: (context) =>
      reward(
        context,
        balance.oxygenOverdriveUpgrades,
        balance.oxygenOverdrivePayouts,
      ),
    fluorineFlash: (context) =>
      reward(
        context,
        balance.fluorineFlashUpgrades,
        balance.fluorineFlashPayouts,
      ),
    sodiumSprinkle: (context) =>
      reward(
        context,
        balance.sodiumSprinkleUpgrades,
        balance.sodiumSprinklePayouts,
      ),
    magnesiumMagnificence: (context) =>
      reward(
        context,
        balance.magnesiumMagnificenceUpgrades,
        balance.magnesiumMagnificencePayouts,
      ),
    aluminumAllStar: (context) =>
      reward(
        context,
        balance.aluminumAllStarUpgrades,
        balance.aluminumAllStarPayouts,
      ),
    siliconSpark: (context) =>
      reward(
        context,
        balance.siliconSparkUpgrades,
        balance.siliconSparkPayouts,
      ),
    phosphorusFlare: (context) =>
      reward(
        context,
        balance.phosphorusFlareUpgrades,
        balance.phosphorusFlarePayouts,
      ),
    sulfurSunshine: (context) =>
      reward(
        context,
        balance.sulfurSunshineUpgrades,
        balance.sulfurSunshinePayouts,
      ),
    chlorineConfetti: (context) =>
      reward(
        context,
        balance.chlorineConfettiUpgrades,
        balance.chlorineConfettiPayouts,
      ),
    argonAfterglow: (context) =>
      reward(
        context,
        balance.argonAfterglowUpgrades,
        balance.argonAfterglowPayouts,
      ),
    potassiumPop: (context) =>
      reward(
        context,
        balance.potassiumPopUpgrades,
        balance.potassiumPopPayouts,
      ),
    calciumCornerstone: (context) =>
      reward(
        context,
        balance.calciumCornerstoneUpgrades,
        balance.calciumCornerstonePayouts,
      ),
    scandiumStronghold: (context) =>
      reward(
        context,
        balance.scandiumStrongholdUpgrades,
        balance.scandiumStrongholdPayouts,
      ),
    titaniumTakeoff: (context) =>
      reward(
        context,
        balance.titaniumTakeoffUpgrades,
        balance.titaniumTakeoffPayouts,
      ),
    vanadiumVoltage: (context) =>
      reward(
        context,
        balance.vanadiumVoltageUpgrades,
        balance.vanadiumVoltagePayouts,
      ),
    chromiumGleam: (context) =>
      reward(
        context,
        balance.chromiumGleamUpgrades,
        balance.chromiumGleamPayouts,
      ),
    manganeseMomentum: (context) =>
      reward(
        context,
        balance.manganeseMomentumUpgrades,
        balance.manganeseMomentumPayouts,
      ),
    ironEmpire: (context) =>
      reward(context, balance.ironEmpireUpgrades, balance.ironEmpirePayouts),
    cobaltCharge: (context) =>
      reward(
        context,
        balance.cobaltChargeUpgrades,
        balance.cobaltChargePayouts,
      ),
    nickelNestEgg: (context) =>
      reward(
        context,
        balance.nickelNestEggUpgrades,
        balance.nickelNestEggPayouts,
      ),
    copperCurrent: (context) =>
      reward(
        context,
        balance.copperCurrentUpgrades,
        balance.copperCurrentPayouts,
      ),
    zincZing: (context) =>
      reward(context, balance.zincZingUpgrades, balance.zincZingPayouts),
    galliumGlitter: (context) =>
      reward(
        context,
        balance.galliumGlitterUpgrades,
        balance.galliumGlitterPayouts,
      ),
    germaniumGenius: (context) =>
      reward(
        context,
        balance.germaniumGeniusUpgrades,
        balance.germaniumGeniusPayouts,
      ),
    arsenicAlchemy: (context) =>
      reward(
        context,
        balance.arsenicAlchemyUpgrades,
        balance.arsenicAlchemyPayouts,
      ),
    seleniumSunburst: (context) =>
      reward(
        context,
        balance.seleniumSunburstUpgrades,
        balance.seleniumSunburstPayouts,
      ),
    bromineBounty: (context) =>
      reward(
        context,
        balance.bromineBountyUpgrades,
        balance.bromineBountyPayouts,
      ),
    kryptonKeepsake: (context) =>
      reward(
        context,
        balance.kryptonKeepsakeUpgrades,
        balance.kryptonKeepsakePayouts,
      ),
    rubidiumRadiance: (context) =>
      reward(
        context,
        balance.rubidiumRadianceUpgrades,
        balance.rubidiumRadiancePayouts,
      ),
    strontiumSpectacle: (context) =>
      reward(
        context,
        balance.strontiumSpectacleUpgrades,
        balance.strontiumSpectaclePayouts,
      ),
    yttriumYield: (context) =>
      reward(
        context,
        balance.yttriumYieldUpgrades,
        balance.yttriumYieldPayouts,
      ),
    zirconiumZenith: (context) =>
      reward(
        context,
        balance.zirconiumZenithUpgrades,
        balance.zirconiumZenithPayouts,
      ),
    niobiumNexus: (context) =>
      reward(
        context,
        balance.niobiumNexusUpgrades,
        balance.niobiumNexusPayouts,
      ),
    molybdenumMachine: (context) =>
      reward(
        context,
        balance.molybdenumMachineUpgrades,
        balance.molybdenumMachinePayouts,
      ),
    technetiumTimebank: (context) =>
      reward(
        context,
        balance.technetiumTimebankUpgrades,
        balance.technetiumTimebankPayouts,
      ),
    rutheniumRiches: (context) =>
      reward(
        context,
        balance.rutheniumRichesUpgrades,
        balance.rutheniumRichesPayouts,
      ),
    rhodiumReflection: (context) =>
      reward(
        context,
        balance.rhodiumReflectionUpgrades,
        balance.rhodiumReflectionPayouts,
      ),
    palladiumPilot: (context) =>
      reward(
        context,
        balance.palladiumPilotUpgrades,
        balance.palladiumPilotPayouts,
      ),
    silverMoonrise: (context) =>
      reward(
        context,
        balance.silverMoonriseUpgrades,
        balance.silverMoonrisePayouts,
      ),
    cadmiumCatalyst: (context) =>
      reward(
        context,
        balance.cadmiumCatalystUpgrades,
        balance.cadmiumCatalystPayouts,
      ),
    indiumInsight: (context) =>
      reward(
        context,
        balance.indiumInsightUpgrades,
        balance.indiumInsightPayouts,
      ),
    tinTreasure: (context) =>
      reward(context, balance.tinTreasureUpgrades, balance.tinTreasurePayouts),
    antimonyAscension: (context) =>
      reward(
        context,
        balance.antimonyAscensionUpgrades,
        balance.antimonyAscensionPayouts,
      ),
    telluriumTreasurelight: (context) =>
      reward(
        context,
        balance.telluriumTreasurelightUpgrades,
        balance.telluriumTreasurelightPayouts,
      ),
    iodineIridescence: (context) =>
      reward(
        context,
        balance.iodineIridescenceUpgrades,
        balance.iodineIridescencePayouts,
      ),
    xenonSpotlight: (context) =>
      reward(
        context,
        balance.xenonSpotlightUpgrades,
        balance.xenonSpotlightPayouts,
      ),
    cesiumClockwork: (context) =>
      reward(
        context,
        balance.cesiumClockworkUpgrades,
        balance.cesiumClockworkPayouts,
      ),
    bariumBeacon: (context) =>
      reward(
        context,
        balance.bariumBeaconUpgrades,
        balance.bariumBeaconPayouts,
      ),
    lanthanumLuster: (context) =>
      reward(
        context,
        balance.lanthanumLusterUpgrades,
        balance.lanthanumLusterPayouts,
      ),
    ceriumShine: (context) =>
      reward(context, balance.ceriumShineUpgrades, balance.ceriumShinePayouts),
    praseodymiumPrism: (context) =>
      reward(
        context,
        balance.praseodymiumPrismUpgrades,
        balance.praseodymiumPrismPayouts,
      ),
    neodymiumNorthstar: (context) =>
      reward(
        context,
        balance.neodymiumNorthstarUpgrades,
        balance.neodymiumNorthstarPayouts,
      ),
    promethiumPulse: (context) =>
      reward(
        context,
        balance.promethiumPulseUpgrades,
        balance.promethiumPulsePayouts,
      ),
    samariumSanctuary: (context) =>
      reward(
        context,
        balance.samariumSanctuaryUpgrades,
        balance.samariumSanctuaryPayouts,
      ),
    europiumEncore: (context) =>
      reward(
        context,
        balance.europiumEncoreUpgrades,
        balance.europiumEncorePayouts,
      ),
    gadoliniumGlance: (context) =>
      reward(
        context,
        balance.gadoliniumGlanceUpgrades,
        balance.gadoliniumGlancePayouts,
      ),
    terbiumTempo: (context) =>
      reward(
        context,
        balance.terbiumTempoUpgrades,
        balance.terbiumTempoPayouts,
      ),
    dysprosiumDirection: (context) =>
      reward(
        context,
        balance.dysprosiumDirectionUpgrades,
        balance.dysprosiumDirectionPayouts,
      ),
    holmiumHalo: (context) =>
      reward(context, balance.holmiumHaloUpgrades, balance.holmiumHaloPayouts),
    erbiumElegance: (context) =>
      reward(
        context,
        balance.erbiumEleganceUpgrades,
        balance.erbiumElegancePayouts,
      ),
    thuliumThaw: (context) =>
      reward(context, balance.thuliumThawUpgrades, balance.thuliumThawPayouts),
    ytterbiumHourglass: (context) =>
      reward(
        context,
        balance.ytterbiumHourglassUpgrades,
        balance.ytterbiumHourglassPayouts,
      ),
    lutetiumLimelight: (context) =>
      reward(
        context,
        balance.lutetiumLimelightUpgrades,
        balance.lutetiumLimelightPayouts,
      ),
    hafniumHorizon: (context) =>
      reward(
        context,
        balance.hafniumHorizonUpgrades,
        balance.hafniumHorizonPayouts,
      ),
    tantalumTrove: (context) =>
      reward(
        context,
        balance.tantalumTroveUpgrades,
        balance.tantalumTrovePayouts,
      ),
    tungstenTriumph: (context) =>
      reward(
        context,
        balance.tungstenTriumphUpgrades,
        balance.tungstenTriumphPayouts,
      ),
    rheniumRocket: (context) =>
      reward(
        context,
        balance.rheniumRocketUpgrades,
        balance.rheniumRocketPayouts,
      ),
    platinumPodium: (context) =>
      reward(
        context,
        balance.platinumPodiumUpgrades,
        balance.platinumPodiumPayouts,
      ),
    goldenAtom: (context) =>
      reward(context, balance.goldenAtomUpgrades, balance.goldenAtomPayouts),
    uraniumUplift: (context) =>
      reward(
        context,
        balance.uraniumUpliftUpgrades,
        balance.uraniumUpliftPayouts,
      ),
    heavyElement: (context) => {
      actions.upgrade(context.floors, balance.heavyElementUpgrades);
      actions.payCycles([context.floor], balance.heavyElementPayouts);
    },
    nucleusDividend: (context) => {
      actions.upgrade(context.floors, balance.nucleusDividendUpgrades);
      actions.payCycles([context.floor], balance.nucleusDividendPayouts);
    },
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
