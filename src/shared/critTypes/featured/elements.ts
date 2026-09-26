import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ELEMENTS_CRITS = {
  californiumCrescendo: {
    label: "Californium Crescendo",
    color: COLOR.blue,
    image: "crits/elements/californiumCrescendo.png",
    description: "98 upgrades here and 98 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.californiumCrescendoUpgrades,
        balance.californiumCrescendoPayouts,
      ),
  },
  einsteiniumEpiphany: {
    label: "Einsteinium Epiphany",
    color: COLOR.purple,
    image: "crits/elements/einsteiniumEpiphany.png",
    description: "99 upgrades here and 99 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.einsteiniumEpiphanyUpgrades,
        balance.einsteiniumEpiphanyPayouts,
      ),
  },
  fermiumFormula: {
    label: "Fermium Formula",
    color: COLOR.cyan,
    image: "crits/elements/fermiumFormula.png",
    description: "100 upgrades here and 100 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.fermiumFormulaUpgrades,
        balance.fermiumFormulaPayouts,
      ),
  },
  mendeleviumMajesty: {
    label: "Mendelevium Majesty",
    color: COLOR.gold,
    image: "crits/elements/mendeleviumMajesty.png",
    description: "101 upgrades here and 101 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.mendeleviumMajestyUpgrades,
        balance.mendeleviumMajestyPayouts,
      ),
  },
  nobeliumLaureate: {
    label: "Nobelium Laureate",
    color: COLOR.starYellow,
    image: "crits/elements/nobeliumLaureate.png",
    description: "102 upgrades here and 102 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.nobeliumLaureateUpgrades,
        balance.nobeliumLaureatePayouts,
      ),
  },
  lawrenciumLightspeed: {
    label: "Lawrencium Lightspeed",
    color: COLOR.moneyGreen,
    image: "crits/elements/lawrenciumLightspeed.png",
    description: "103 upgrades here and 103 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.lawrenciumLightspeedUpgrades,
        balance.lawrenciumLightspeedPayouts,
      ),
  },
  rutherfordiumReach: {
    label: "Rutherfordium Reach",
    color: COLOR.mysticTeal,
    image: "crits/elements/rutherfordiumReach.png",
    description: "104 upgrades here and 104 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.rutherfordiumReachUpgrades,
        balance.rutherfordiumReachPayouts,
      ),
  },
  seaborgiumSwell: {
    label: "Seaborgium Swell",
    color: COLOR.silverTicketGray,
    image: "crits/elements/seaborgiumSwell.png",
    description: "106 upgrades here and 106 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.seaborgiumSwellUpgrades,
        balance.seaborgiumSwellPayouts,
      ),
  },
  bohriumSummit: {
    label: "Bohrium Summit",
    color: COLOR.red,
    image: "crits/elements/bohriumSummit.png",
    description: "107 upgrades here and 107 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.bohriumSummitUpgrades,
        balance.bohriumSummitPayouts,
      ),
  },
  hassiumMeteor: {
    label: "Hassium Meteor",
    color: COLOR.peppermintPink,
    image: "crits/elements/hassiumMeteor.png",
    description: "108 upgrades here and 108 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.hassiumMeteorUpgrades,
        balance.hassiumMeteorPayouts,
      ),
  },
  meitneriumMarvel: {
    label: "Meitnerium Marvel",
    color: COLOR.blue,
    image: "crits/elements/meitneriumMarvel.png",
    description: "109 upgrades here and 109 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.meitneriumMarvelUpgrades,
        balance.meitneriumMarvelPayouts,
      ),
  },
  darmstadtiumDowntown: {
    label: "Darmstadtium Downtown",
    color: COLOR.purple,
    image: "crits/elements/darmstadtiumDowntown.png",
    description: "110 upgrades here and 110 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.darmstadtiumDowntownUpgrades,
        balance.darmstadtiumDowntownPayouts,
      ),
  },
  roentgeniumRevelation: {
    label: "Roentgenium Revelation",
    color: COLOR.cyan,
    image: "crits/elements/roentgeniumRevelation.png",
    description: "111 upgrades here and 111 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.roentgeniumRevelationUpgrades,
        balance.roentgeniumRevelationPayouts,
      ),
  },
  coperniciumCarousel: {
    label: "Copernicium Carousel",
    color: COLOR.gold,
    image: "crits/elements/coperniciumCarousel.png",
    description: "112 upgrades here and 112 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.coperniciumCarouselUpgrades,
        balance.coperniciumCarouselPayouts,
      ),
  },
  nihoniumDaybreak: {
    label: "Nihonium Daybreak",
    color: COLOR.starYellow,
    image: "crits/elements/nihoniumDaybreak.png",
    description: "113 upgrades here and 113 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.nihoniumDaybreakUpgrades,
        balance.nihoniumDaybreakPayouts,
      ),
  },
  fleroviumFortress: {
    label: "Flerovium Fortress",
    color: COLOR.moneyGreen,
    image: "crits/elements/fleroviumFortress.png",
    description: "114 upgrades here and 114 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.fleroviumFortressUpgrades,
        balance.fleroviumFortressPayouts,
      ),
  },
  moscoviumMosaic: {
    label: "Moscovium Mosaic",
    color: COLOR.mysticTeal,
    image: "crits/elements/moscoviumMosaic.png",
    description: "115 upgrades here and 115 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.moscoviumMosaicUpgrades,
        balance.moscoviumMosaicPayouts,
      ),
  },
  livermoriumLightning: {
    label: "Livermorium Lightning",
    color: COLOR.silverTicketGray,
    image: "crits/elements/livermoriumLightning.png",
    description: "116 upgrades here and 116 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.livermoriumLightningUpgrades,
        balance.livermoriumLightningPayouts,
      ),
  },
  tennessineTwinkle: {
    label: "Tennessine Twinkle",
    color: COLOR.red,
    image: "crits/elements/tennessineTwinkle.png",
    description: "117 upgrades here and 117 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.tennessineTwinkleUpgrades,
        balance.tennessineTwinklePayouts,
      ),
  },
  oganessonOdyssey: {
    label: "Oganesson Odyssey",
    color: COLOR.peppermintPink,
    image: "crits/elements/oganessonOdyssey.png",
    description: "118 upgrades here and 118 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.oganessonOdysseyUpgrades,
        balance.oganessonOdysseyPayouts,
      ),
  },
  osmiumRegalia: {
    label: "Osmium Regalia",
    color: COLOR.silverTicketGray,
    image: "crits/elements/osmiumRegalia.png",
    description: "76 upgrades here and 76 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.osmiumRegaliaUpgrades,
        balance.osmiumRegaliaPayouts,
      ),
  },
  iridiumAegis: {
    label: "Iridium Aegis",
    color: COLOR.cyan,
    image: "crits/elements/iridiumAegis.png",
    description: "77 upgrades here and 77 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.iridiumAegisUpgrades,
        balance.iridiumAegisPayouts,
      ),
  },
  mercuryFlow: {
    label: "Mercury Flow",
    color: COLOR.blue,
    image: "crits/elements/mercuryFlow.png",
    description: "80 upgrades here and 80 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.mercuryFlowUpgrades, balance.mercuryFlowPayouts),
  },
  thalliumThrive: {
    label: "Thallium Thrive",
    color: COLOR.moneyGreen,
    image: "crits/elements/thalliumThrive.png",
    description: "81 upgrades here and 81 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.thalliumThriveUpgrades,
        balance.thalliumThrivePayouts,
      ),
  },
  leadLode: {
    label: "Lead Lode",
    color: COLOR.gold,
    image: "crits/elements/leadLode.png",
    description: "82 upgrades here and 82 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.leadLodeUpgrades, balance.leadLodePayouts),
  },
  bismuthBastion: {
    label: "Bismuth Bastion",
    color: COLOR.peppermintPink,
    image: "crits/elements/bismuthBastion.png",
    description: "83 upgrades here and 83 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.bismuthBastionUpgrades,
        balance.bismuthBastionPayouts,
      ),
  },
  poloniumPrism: {
    label: "Polonium Prism",
    color: COLOR.red,
    image: "crits/elements/poloniumPrism.png",
    description: "84 upgrades here and 84 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.poloniumPrismUpgrades,
        balance.poloniumPrismPayouts,
      ),
  },
  astatineAurora: {
    label: "Astatine Aurora",
    color: COLOR.mysticTeal,
    image: "crits/elements/astatineAurora.png",
    description: "85 upgrades here and 85 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.astatineAuroraUpgrades,
        balance.astatineAuroraPayouts,
      ),
  },
  radonRipple: {
    label: "Radon Ripple",
    color: COLOR.silverTicketGray,
    image: "crits/elements/radonRipple.png",
    description: "86 upgrades here and 86 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.radonRippleUpgrades, balance.radonRipplePayouts),
  },
  franciumFortune: {
    label: "Francium Fortune",
    color: COLOR.cyan,
    image: "crits/elements/franciumFortune.png",
    description: "87 upgrades here and 87 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.franciumFortuneUpgrades,
        balance.franciumFortunePayouts,
      ),
  },
  radiumRhythm: {
    label: "Radium Rhythm",
    color: COLOR.blue,
    image: "crits/elements/radiumRhythm.png",
    description: "88 upgrades here and 88 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.radiumRhythmUpgrades,
        balance.radiumRhythmPayouts,
      ),
  },
  actiniumArc: {
    label: "Actinium Arc",
    color: COLOR.moneyGreen,
    image: "crits/elements/actiniumArc.png",
    description: "89 upgrades here and 89 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.actiniumArcUpgrades, balance.actiniumArcPayouts),
  },
  thoriumThrone: {
    label: "Thorium Throne",
    color: COLOR.gold,
    image: "crits/elements/thoriumThrone.png",
    description: "90 upgrades here and 90 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.thoriumThroneUpgrades,
        balance.thoriumThronePayouts,
      ),
  },
  protactiniumOrbit: {
    label: "Protactinium Orbit",
    color: COLOR.peppermintPink,
    image: "crits/elements/protactiniumOrbit.png",
    description: "91 upgrades here and 91 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.protactiniumOrbitUpgrades,
        balance.protactiniumOrbitPayouts,
      ),
  },
  neptuniumNova: {
    label: "Neptunium Nova",
    color: COLOR.red,
    image: "crits/elements/neptuniumNova.png",
    description: "93 upgrades here and 93 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.neptuniumNovaUpgrades,
        balance.neptuniumNovaPayouts,
      ),
  },
  americiumAlarm: {
    label: "Americium Alarm",
    color: COLOR.mysticTeal,
    image: "crits/elements/americiumAlarm.png",
    description: "95 upgrades here and 95 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.americiumAlarmUpgrades,
        balance.americiumAlarmPayouts,
      ),
  },
  plutoniumPulse: {
    label: "Plutonium Pulse",
    color: COLOR.orange,
    image: "crits/elements/plutoniumPulse.png",
    description: "94 upgrades here and 94 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.plutoniumPulseUpgrades,
        balance.plutoniumPulsePayouts,
      ),
  },
  curiumCrucible: {
    label: "Curium Crucible",
    color: COLOR.silverTicketGray,
    image: "crits/elements/curiumCrucible.png",
    description: "96 upgrades here and 96 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.curiumCrucibleUpgrades,
        balance.curiumCruciblePayouts,
      ),
  },
  berkeliumBreakthrough: {
    label: "Berkelium Breakthrough",
    color: COLOR.cyan,
    image: "crits/elements/berkeliumBreakthrough.png",
    description: "97 upgrades here and 97 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.berkeliumBreakthroughUpgrades,
        balance.berkeliumBreakthroughPayouts,
      ),
  },
  hydrogenHype: {
    label: "Hydrogen Hype",
    color: COLOR.blue,
    image: "crits/elements/hydrogenHype.png",
    description: "1 upgrades here and 1 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.hydrogenHypeUpgrades,
        balance.hydrogenHypePayouts,
      ),
  },
  heliumHighrise: {
    label: "Helium Highrise",
    color: COLOR.cyan,
    image: "crits/elements/heliumHighrise.png",
    description: "2 upgrades here and 2 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.heliumHighriseUpgrades,
        balance.heliumHighrisePayouts,
      ),
  },
  lithiumLift: {
    label: "Lithium Lift",
    color: COLOR.moneyGreen,
    image: "crits/elements/lithiumLift.png",
    description: "3 upgrades here and 3 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.lithiumLiftUpgrades, balance.lithiumLiftPayouts),
  },
  berylliumBrilliance: {
    label: "Beryllium Brilliance",
    color: COLOR.gold,
    image: "crits/elements/berylliumBrilliance.png",
    description: "4 upgrades here and 4 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.berylliumBrillianceUpgrades,
        balance.berylliumBrilliancePayouts,
      ),
  },
  carbonCrown: {
    label: "Carbon Crown",
    color: COLOR.red,
    image: "crits/elements/carbonCrown.png",
    description: "6 upgrades here and 6 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.carbonCrownUpgrades, balance.carbonCrownPayouts),
  },
  nitrogenNimbus: {
    label: "Nitrogen Nimbus",
    color: COLOR.peppermintPink,
    image: "crits/elements/nitrogenNimbus.png",
    description: "7 upgrades here and 7 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.nitrogenNimbusUpgrades,
        balance.nitrogenNimbusPayouts,
      ),
  },
  oxygenOverdrive: {
    label: "Oxygen Overdrive",
    color: COLOR.silverTicketGray,
    image: "crits/elements/oxygenOverdrive.png",
    description: "8 upgrades here and 8 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.oxygenOverdriveUpgrades,
        balance.oxygenOverdrivePayouts,
      ),
  },
  fluorineFlash: {
    label: "Fluorine Flash",
    color: COLOR.mysticTeal,
    image: "crits/elements/fluorineFlash.png",
    description: "9 upgrades here and 9 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.fluorineFlashUpgrades,
        balance.fluorineFlashPayouts,
      ),
  },
  sodiumSprinkle: {
    label: "Sodium Sprinkle",
    color: COLOR.blue,
    image: "crits/elements/sodiumSprinkle.png",
    description: "11 upgrades here and 11 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.sodiumSprinkleUpgrades,
        balance.sodiumSprinklePayouts,
      ),
  },
  magnesiumMagnificence: {
    label: "Magnesium Magnificence",
    color: COLOR.cyan,
    image: "crits/elements/magnesiumMagnificence.png",
    description: "12 upgrades here and 12 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.magnesiumMagnificenceUpgrades,
        balance.magnesiumMagnificencePayouts,
      ),
  },
  aluminumAllStar: {
    label: "Aluminum All-Star",
    color: COLOR.moneyGreen,
    image: "crits/elements/aluminumAllStar.png",
    description: "13 upgrades here and 13 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.aluminumAllStarUpgrades,
        balance.aluminumAllStarPayouts,
      ),
  },
  siliconSpark: {
    label: "Silicon Spark",
    color: COLOR.gold,
    image: "crits/elements/siliconSpark.png",
    description: "14 upgrades here and 14 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.siliconSparkUpgrades,
        balance.siliconSparkPayouts,
      ),
  },
  phosphorusFlare: {
    label: "Phosphorus Flare",
    color: COLOR.red,
    image: "crits/elements/phosphorusFlare.png",
    description: "15 upgrades here and 15 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.phosphorusFlareUpgrades,
        balance.phosphorusFlarePayouts,
      ),
  },
  sulfurSunshine: {
    label: "Sulfur Sunshine",
    color: COLOR.peppermintPink,
    image: "crits/elements/sulfurSunshine.png",
    description: "16 upgrades here and 16 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.sulfurSunshineUpgrades,
        balance.sulfurSunshinePayouts,
      ),
  },
  chlorineConfetti: {
    label: "Chlorine Confetti",
    color: COLOR.silverTicketGray,
    image: "crits/elements/chlorineConfetti.png",
    description: "17 upgrades here and 17 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.chlorineConfettiUpgrades,
        balance.chlorineConfettiPayouts,
      ),
  },
  argonAfterglow: {
    label: "Argon Afterglow",
    color: COLOR.mysticTeal,
    image: "crits/elements/argonAfterglow.png",
    description: "18 upgrades here and 18 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.argonAfterglowUpgrades,
        balance.argonAfterglowPayouts,
      ),
  },
  potassiumPop: {
    label: "Potassium Pop",
    color: COLOR.blue,
    image: "crits/elements/potassiumPop.png",
    description: "19 upgrades here and 19 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.potassiumPopUpgrades,
        balance.potassiumPopPayouts,
      ),
  },
  calciumCornerstone: {
    label: "Calcium Cornerstone",
    color: COLOR.cyan,
    image: "crits/elements/calciumCornerstone.png",
    description: "20 upgrades here and 20 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.calciumCornerstoneUpgrades,
        balance.calciumCornerstonePayouts,
      ),
  },
  scandiumStronghold: {
    label: "Scandium Stronghold",
    color: COLOR.moneyGreen,
    image: "crits/elements/scandiumStronghold.png",
    description: "21 upgrades here and 21 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.scandiumStrongholdUpgrades,
        balance.scandiumStrongholdPayouts,
      ),
  },
  titaniumTakeoff: {
    label: "Titanium Takeoff",
    color: COLOR.gold,
    image: "crits/elements/titaniumTakeoff.png",
    description: "22 upgrades here and 22 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.titaniumTakeoffUpgrades,
        balance.titaniumTakeoffPayouts,
      ),
  },
  vanadiumVoltage: {
    label: "Vanadium Voltage",
    color: COLOR.red,
    image: "crits/elements/vanadiumVoltage.png",
    description: "23 upgrades here and 23 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.vanadiumVoltageUpgrades,
        balance.vanadiumVoltagePayouts,
      ),
  },
  chromiumGleam: {
    label: "Chromium Gleam",
    color: COLOR.peppermintPink,
    image: "crits/elements/chromiumGleam.png",
    description: "24 upgrades here and 24 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.chromiumGleamUpgrades,
        balance.chromiumGleamPayouts,
      ),
  },
  manganeseMomentum: {
    label: "Manganese Momentum",
    color: COLOR.silverTicketGray,
    image: "crits/elements/manganeseMomentum.png",
    description: "25 upgrades here and 25 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.manganeseMomentumUpgrades,
        balance.manganeseMomentumPayouts,
      ),
  },
  ironEmpire: {
    label: "Iron Empire",
    color: COLOR.mysticTeal,
    image: "crits/elements/ironEmpire.png",
    description: "26 upgrades here and 26 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.ironEmpireUpgrades, balance.ironEmpirePayouts),
  },
  cobaltCharge: {
    label: "Cobalt Charge",
    color: COLOR.blue,
    image: "crits/elements/cobaltCharge.png",
    description: "27 upgrades here and 27 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.cobaltChargeUpgrades,
        balance.cobaltChargePayouts,
      ),
  },
  nickelNestEgg: {
    label: "Nickel Nest Egg",
    color: COLOR.cyan,
    image: "crits/elements/nickelNestEgg.png",
    description: "28 upgrades here and 28 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.nickelNestEggUpgrades,
        balance.nickelNestEggPayouts,
      ),
  },
  copperCurrent: {
    label: "Copper Current",
    color: COLOR.moneyGreen,
    image: "crits/elements/copperCurrent.png",
    description: "29 upgrades here and 29 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.copperCurrentUpgrades,
        balance.copperCurrentPayouts,
      ),
  },
  zincZing: {
    label: "Zinc Zing",
    color: COLOR.gold,
    image: "crits/elements/zincZing.png",
    description: "30 upgrades here and 30 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.zincZingUpgrades, balance.zincZingPayouts),
  },
  galliumGlitter: {
    label: "Gallium Glitter",
    color: COLOR.red,
    image: "crits/elements/galliumGlitter.png",
    description: "31 upgrades here and 31 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.galliumGlitterUpgrades,
        balance.galliumGlitterPayouts,
      ),
  },
  germaniumGenius: {
    label: "Germanium Genius",
    color: COLOR.peppermintPink,
    image: "crits/elements/germaniumGenius.png",
    description: "32 upgrades here and 32 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.germaniumGeniusUpgrades,
        balance.germaniumGeniusPayouts,
      ),
  },
  arsenicAlchemy: {
    label: "Arsenic Alchemy",
    color: COLOR.silverTicketGray,
    image: "crits/elements/arsenicAlchemy.png",
    description: "33 upgrades here and 33 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.arsenicAlchemyUpgrades,
        balance.arsenicAlchemyPayouts,
      ),
  },
  seleniumSunburst: {
    label: "Selenium Sunburst",
    color: COLOR.mysticTeal,
    image: "crits/elements/seleniumSunburst.png",
    description: "34 upgrades here and 34 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.seleniumSunburstUpgrades,
        balance.seleniumSunburstPayouts,
      ),
  },
  bromineBounty: {
    label: "Bromine Bounty",
    color: COLOR.blue,
    image: "crits/elements/bromineBounty.png",
    description: "35 upgrades here and 35 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.bromineBountyUpgrades,
        balance.bromineBountyPayouts,
      ),
  },
  kryptonKeepsake: {
    label: "Krypton Keepsake",
    color: COLOR.cyan,
    image: "crits/elements/kryptonKeepsake.png",
    description: "36 upgrades here and 36 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.kryptonKeepsakeUpgrades,
        balance.kryptonKeepsakePayouts,
      ),
  },
  rubidiumRadiance: {
    label: "Rubidium Radiance",
    color: COLOR.moneyGreen,
    image: "crits/elements/rubidiumRadiance.png",
    description: "37 upgrades here and 37 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.rubidiumRadianceUpgrades,
        balance.rubidiumRadiancePayouts,
      ),
  },
  strontiumSpectacle: {
    label: "Strontium Spectacle",
    color: COLOR.gold,
    image: "crits/elements/strontiumSpectacle.png",
    description: "38 upgrades here and 38 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.strontiumSpectacleUpgrades,
        balance.strontiumSpectaclePayouts,
      ),
  },
  yttriumYield: {
    label: "Yttrium Yield",
    color: COLOR.red,
    image: "crits/elements/yttriumYield.png",
    description: "39 upgrades here and 39 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.yttriumYieldUpgrades,
        balance.yttriumYieldPayouts,
      ),
  },
  zirconiumZenith: {
    label: "Zirconium Zenith",
    color: COLOR.peppermintPink,
    image: "crits/elements/zirconiumZenith.png",
    description: "40 upgrades here and 40 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.zirconiumZenithUpgrades,
        balance.zirconiumZenithPayouts,
      ),
  },
  niobiumNexus: {
    label: "Niobium Nexus",
    color: COLOR.silverTicketGray,
    image: "crits/elements/niobiumNexus.png",
    description: "41 upgrades here and 41 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.niobiumNexusUpgrades,
        balance.niobiumNexusPayouts,
      ),
  },
  molybdenumMachine: {
    label: "Molybdenum Machine",
    color: COLOR.mysticTeal,
    image: "crits/elements/molybdenumMachine.png",
    description: "42 upgrades here and 42 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.molybdenumMachineUpgrades,
        balance.molybdenumMachinePayouts,
      ),
  },
  technetiumTimebank: {
    label: "Technetium Timebank",
    color: COLOR.blue,
    image: "crits/elements/technetiumTimebank.png",
    description: "43 upgrades here and 43 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.technetiumTimebankUpgrades,
        balance.technetiumTimebankPayouts,
      ),
  },
  rutheniumRiches: {
    label: "Ruthenium Riches",
    color: COLOR.cyan,
    image: "crits/elements/rutheniumRiches.png",
    description: "44 upgrades here and 44 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.rutheniumRichesUpgrades,
        balance.rutheniumRichesPayouts,
      ),
  },
  rhodiumReflection: {
    label: "Rhodium Reflection",
    color: COLOR.moneyGreen,
    image: "crits/elements/rhodiumReflection.png",
    description: "45 upgrades here and 45 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.rhodiumReflectionUpgrades,
        balance.rhodiumReflectionPayouts,
      ),
  },
  palladiumPilot: {
    label: "Palladium Pilot",
    color: COLOR.gold,
    image: "crits/elements/palladiumPilot.png",
    description: "46 upgrades here and 46 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.palladiumPilotUpgrades,
        balance.palladiumPilotPayouts,
      ),
  },
  silverMoonrise: {
    label: "Silver Moonrise",
    color: COLOR.red,
    image: "crits/elements/silverMoonrise.png",
    description: "47 upgrades here and 47 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.silverMoonriseUpgrades,
        balance.silverMoonrisePayouts,
      ),
  },
  cadmiumCatalyst: {
    label: "Cadmium Catalyst",
    color: COLOR.peppermintPink,
    image: "crits/elements/cadmiumCatalyst.png",
    description: "48 upgrades here and 48 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.cadmiumCatalystUpgrades,
        balance.cadmiumCatalystPayouts,
      ),
  },
  indiumInsight: {
    label: "Indium Insight",
    color: COLOR.silverTicketGray,
    image: "crits/elements/indiumInsight.png",
    description: "49 upgrades here and 49 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.indiumInsightUpgrades,
        balance.indiumInsightPayouts,
      ),
  },
  tinTreasure: {
    label: "Tin Treasure",
    color: COLOR.mysticTeal,
    image: "crits/elements/tinTreasure.png",
    description: "50 upgrades here and 50 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.tinTreasureUpgrades, balance.tinTreasurePayouts),
  },
  antimonyAscension: {
    label: "Antimony Ascension",
    color: COLOR.blue,
    image: "crits/elements/antimonyAscension.png",
    description: "51 upgrades here and 51 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.antimonyAscensionUpgrades,
        balance.antimonyAscensionPayouts,
      ),
  },
  telluriumTreasurelight: {
    label: "Tellurium Treasurelight",
    color: COLOR.cyan,
    image: "crits/elements/telluriumTreasurelight.png",
    description: "52 upgrades here and 52 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.telluriumTreasurelightUpgrades,
        balance.telluriumTreasurelightPayouts,
      ),
  },
  iodineIridescence: {
    label: "Iodine Iridescence",
    color: COLOR.moneyGreen,
    image: "crits/elements/iodineIridescence.png",
    description: "53 upgrades here and 53 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.iodineIridescenceUpgrades,
        balance.iodineIridescencePayouts,
      ),
  },
  xenonSpotlight: {
    label: "Xenon Spotlight",
    color: COLOR.gold,
    image: "crits/elements/xenonSpotlight.png",
    description: "54 upgrades here and 54 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.xenonSpotlightUpgrades,
        balance.xenonSpotlightPayouts,
      ),
  },
  cesiumClockwork: {
    label: "Cesium Clockwork",
    color: COLOR.red,
    image: "crits/elements/cesiumClockwork.png",
    description: "55 upgrades here and 55 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.cesiumClockworkUpgrades,
        balance.cesiumClockworkPayouts,
      ),
  },
  bariumBeacon: {
    label: "Barium Beacon",
    color: COLOR.peppermintPink,
    image: "crits/elements/bariumBeacon.png",
    description: "56 upgrades here and 56 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.bariumBeaconUpgrades,
        balance.bariumBeaconPayouts,
      ),
  },
  lanthanumLuster: {
    label: "Lanthanum Luster",
    color: COLOR.silverTicketGray,
    image: "crits/elements/lanthanumLuster.png",
    description: "57 upgrades here and 57 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.lanthanumLusterUpgrades,
        balance.lanthanumLusterPayouts,
      ),
  },
  ceriumShine: {
    label: "Cerium Shine",
    color: COLOR.mysticTeal,
    image: "crits/elements/ceriumShine.png",
    description: "58 upgrades here and 58 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.ceriumShineUpgrades, balance.ceriumShinePayouts),
  },
  praseodymiumPrism: {
    label: "Praseodymium Prism",
    color: COLOR.blue,
    image: "crits/elements/praseodymiumPrism.png",
    description: "59 upgrades here and 59 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.praseodymiumPrismUpgrades,
        balance.praseodymiumPrismPayouts,
      ),
  },
  neodymiumNorthstar: {
    label: "Neodymium Northstar",
    color: COLOR.cyan,
    image: "crits/elements/neodymiumNorthstar.png",
    description: "60 upgrades here and 60 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.neodymiumNorthstarUpgrades,
        balance.neodymiumNorthstarPayouts,
      ),
  },
  promethiumPulse: {
    label: "Promethium Pulse",
    color: COLOR.moneyGreen,
    image: "crits/elements/promethiumPulse.png",
    description: "61 upgrades here and 61 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.promethiumPulseUpgrades,
        balance.promethiumPulsePayouts,
      ),
  },
  samariumSanctuary: {
    label: "Samarium Sanctuary",
    color: COLOR.gold,
    image: "crits/elements/samariumSanctuary.png",
    description: "62 upgrades here and 62 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.samariumSanctuaryUpgrades,
        balance.samariumSanctuaryPayouts,
      ),
  },
  europiumEncore: {
    label: "Europium Encore",
    color: COLOR.red,
    image: "crits/elements/europiumEncore.png",
    description: "63 upgrades here and 63 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.europiumEncoreUpgrades,
        balance.europiumEncorePayouts,
      ),
  },
  gadoliniumGlance: {
    label: "Gadolinium Glance",
    color: COLOR.peppermintPink,
    image: "crits/elements/gadoliniumGlance.png",
    description: "64 upgrades here and 64 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.gadoliniumGlanceUpgrades,
        balance.gadoliniumGlancePayouts,
      ),
  },
  terbiumTempo: {
    label: "Terbium Tempo",
    color: COLOR.silverTicketGray,
    image: "crits/elements/terbiumTempo.png",
    description: "65 upgrades here and 65 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.terbiumTempoUpgrades,
        balance.terbiumTempoPayouts,
      ),
  },
  dysprosiumDirection: {
    label: "Dysprosium Direction",
    color: COLOR.mysticTeal,
    image: "crits/elements/dysprosiumDirection.png",
    description: "66 upgrades here and 66 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.dysprosiumDirectionUpgrades,
        balance.dysprosiumDirectionPayouts,
      ),
  },
  holmiumHalo: {
    label: "Holmium Halo",
    color: COLOR.blue,
    image: "crits/elements/holmiumHalo.png",
    description: "67 upgrades here and 67 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.holmiumHaloUpgrades, balance.holmiumHaloPayouts),
  },
  erbiumElegance: {
    label: "Erbium Elegance",
    color: COLOR.cyan,
    image: "crits/elements/erbiumElegance.png",
    description: "68 upgrades here and 68 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.erbiumEleganceUpgrades,
        balance.erbiumElegancePayouts,
      ),
  },
  thuliumThaw: {
    label: "Thulium Thaw",
    color: COLOR.moneyGreen,
    image: "crits/elements/thuliumThaw.png",
    description: "69 upgrades here and 69 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.thuliumThawUpgrades, balance.thuliumThawPayouts),
  },
  ytterbiumHourglass: {
    label: "Ytterbium Hourglass",
    color: COLOR.gold,
    image: "crits/elements/ytterbiumHourglass.png",
    description: "70 upgrades here and 70 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.ytterbiumHourglassUpgrades,
        balance.ytterbiumHourglassPayouts,
      ),
  },
  lutetiumLimelight: {
    label: "Lutetium Limelight",
    color: COLOR.red,
    image: "crits/elements/lutetiumLimelight.png",
    description: "71 upgrades here and 71 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.lutetiumLimelightUpgrades,
        balance.lutetiumLimelightPayouts,
      ),
  },
  hafniumHorizon: {
    label: "Hafnium Horizon",
    color: COLOR.peppermintPink,
    image: "crits/elements/hafniumHorizon.png",
    description: "72 upgrades here and 72 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.hafniumHorizonUpgrades,
        balance.hafniumHorizonPayouts,
      ),
  },
  tantalumTrove: {
    label: "Tantalum Trove",
    color: COLOR.silverTicketGray,
    image: "crits/elements/tantalumTrove.png",
    description: "73 upgrades here and 73 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.tantalumTroveUpgrades,
        balance.tantalumTrovePayouts,
      ),
  },
  tungstenTriumph: {
    label: "Tungsten Triumph",
    color: COLOR.mysticTeal,
    image: "crits/elements/tungstenTriumph.png",
    description: "74 upgrades here and 74 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.tungstenTriumphUpgrades,
        balance.tungstenTriumphPayouts,
      ),
  },
  rheniumRocket: {
    label: "Rhenium Rocket",
    color: COLOR.blue,
    image: "crits/elements/rheniumRocket.png",
    description: "75 upgrades here and 75 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.rheniumRocketUpgrades,
        balance.rheniumRocketPayouts,
      ),
  },
  platinumPodium: {
    label: "Platinum Podium",
    color: COLOR.cyan,
    image: "crits/elements/platinumPodium.png",
    description: "78 upgrades here and 78 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.platinumPodiumUpgrades,
        balance.platinumPodiumPayouts,
      ),
  },
  goldenAtom: {
    label: "Gold Atom",
    color: COLOR.moneyGreen,
    image: "crits/elements/goldenAtom.png",
    description: "79 upgrades here and 79 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(context, balance.goldenAtomUpgrades, balance.goldenAtomPayouts),
  },
  uraniumUplift: {
    label: "Uranium Uplift",
    color: COLOR.gold,
    image: "crits/elements/uraniumUplift.png",
    description: "92 upgrades here and 92 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.uraniumUpliftUpgrades,
        balance.uraniumUpliftPayouts,
      ),
  },
  heavyElement: {
    label: "Heavy Element",
    color: COLOR.silverTicketGray,
    image: "crits/elements/heavyElement.png",
    description: "Seven upgrades on every unlocked floor and five payouts here",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.heavyElementUpgrades);
      actions.payCycles([context.floor], balance.heavyElementPayouts);
    },
  },
  nucleusDividend: {
    label: "Nucleus Dividend",
    color: COLOR.cyan,
    image: "crits/elements/nucleusDividend.png",
    description: "Six upgrades on every unlocked floor and four payouts here",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.nucleusDividendUpgrades);
      actions.payCycles([context.floor], balance.nucleusDividendPayouts);
    },
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
