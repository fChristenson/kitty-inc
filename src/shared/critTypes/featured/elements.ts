import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ELEMENTS_CRITS = {
  californiumCrescendo: {
    label: "Californium Crescendo",
    color: COLOR.blue,
    image: "crits/elements/californiumCrescendo.webp",
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
    image: "crits/elements/einsteiniumEpiphany.webp",
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
    image: "crits/elements/fermiumFormula.webp",
    description: "Free office chairs for every unlocked floor",
    reward: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  },
  mendeleviumMajesty: {
    label: "Mendelevium Majesty",
    color: COLOR.gold,
    image: "crits/elements/mendeleviumMajesty.webp",
    description: "One tier promotion and 17 upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.mendeleviumMajestyTierSteps,
        balance.mendeleviumMajestyUpgrades,
      ),
  },
  nobeliumLaureate: {
    label: "Nobelium Laureate",
    color: COLOR.starYellow,
    image: "crits/elements/nobeliumLaureate.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  },
  lawrenciumLightspeed: {
    label: "Lawrencium Lightspeed",
    color: COLOR.moneyGreen,
    image: "crits/elements/lawrenciumLightspeed.webp",
    description: "Boosts every worker for 35s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.lawrenciumLightspeedBoostSeconds,
        balance.lawrenciumLightspeedExtraWorkers,
      ),
  },
  rutherfordiumReach: {
    label: "Rutherfordium Reach",
    color: COLOR.mysticTeal,
    image: "crits/elements/rutherfordiumReach.webp",
    description: "Free office supplies for every unlocked floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies(context.floors),
  },
  seaborgiumSwell: {
    label: "Seaborgium Swell",
    color: COLOR.silverTicketGray,
    image: "crits/elements/seaborgiumSwell.webp",
    description: "Boosts every worker for 46s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.seaborgiumSwellBoostSeconds,
        balance.seaborgiumSwellExtraWorkers,
      ),
  },
  bohriumSummit: {
    label: "Bohrium Summit",
    color: COLOR.red,
    image: "crits/elements/bohriumSummit.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.bohriumSummitFloors),
  },
  hassiumMeteor: {
    label: "Hassium Meteor",
    color: COLOR.peppermintPink,
    image: "crits/elements/hassiumMeteor.webp",
    description: "Boosts every worker for 47s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.hassiumMeteorBoostSeconds,
        balance.hassiumMeteorExtraWorkers,
      ),
  },
  meitneriumMarvel: {
    label: "Meitnerium Marvel",
    color: COLOR.blue,
    image: "crits/elements/meitneriumMarvel.webp",
    description: "Boosts every worker for 47s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.meitneriumMarvelBoostSeconds,
        balance.meitneriumMarvelExtraWorkers,
      ),
  },
  darmstadtiumDowntown: {
    label: "Darmstadtium Downtown",
    color: COLOR.purple,
    image: "crits/elements/darmstadtiumDowntown.webp",
    description: "Cuts every price in this building by 6.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(
        context.floors,
        balance.darmstadtiumDowntownDiscount,
      ),
  },
  roentgeniumRevelation: {
    label: "Roentgenium Revelation",
    color: COLOR.cyan,
    image: "crits/elements/roentgeniumRevelation.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  coperniciumCarousel: {
    label: "Copernicium Carousel",
    color: COLOR.gold,
    image: "crits/elements/coperniciumCarousel.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  nihoniumDaybreak: {
    label: "Nihonium Daybreak",
    color: COLOR.starYellow,
    image: "crits/elements/nihoniumDaybreak.webp",
    description: "Cuts every price in this building by 6.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.nihoniumDaybreakDiscount),
  },
  fleroviumFortress: {
    label: "Flerovium Fortress",
    color: COLOR.moneyGreen,
    image: "crits/elements/fleroviumFortress.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  moscoviumMosaic: {
    label: "Moscovium Mosaic",
    color: COLOR.mysticTeal,
    image: "crits/elements/moscoviumMosaic.webp",
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
    image: "crits/elements/livermoriumLightning.webp",
    description: "Boosts every worker for 49s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.livermoriumLightningBoostSeconds,
        balance.livermoriumLightningExtraWorkers,
      ),
  },
  tennessineTwinkle: {
    label: "Tennessine Twinkle",
    color: COLOR.red,
    image: "crits/elements/tennessineTwinkle.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  oganessonOdyssey: {
    label: "Oganesson Odyssey",
    color: COLOR.peppermintPink,
    image: "crits/elements/oganessonOdyssey.webp",
    description: "Hires 1 free worker on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers(context.floors, balance.oganessonOdysseyWorkers),
  },
  osmiumRegalia: {
    label: "Osmium Regalia",
    color: COLOR.silverTicketGray,
    image: "crits/elements/osmiumRegalia.webp",
    description: "One tier promotion and 17 upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(
        lowestLevel(context),
        balance.osmiumRegaliaTierSteps,
        balance.osmiumRegaliaUpgrades,
      ),
  },
  iridiumAegis: {
    label: "Iridium Aegis",
    color: COLOR.cyan,
    image: "crits/elements/iridiumAegis.webp",
    description: "Cuts every price in this building by 4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.iridiumAegisDiscount),
  },
  mercuryFlow: {
    label: "Mercury Flow",
    color: COLOR.blue,
    image: "crits/elements/mercuryFlow.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  thalliumThrive: {
    label: "Thallium Thrive",
    color: COLOR.moneyGreen,
    image: "crits/elements/thalliumThrive.webp",
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
    image: "crits/elements/leadLode.webp",
    description: "Cuts every price in this building by 4.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.leadLodeDiscount),
  },
  bismuthBastion: {
    label: "Bismuth Bastion",
    color: COLOR.peppermintPink,
    image: "crits/elements/bismuthBastion.webp",
    description:
      "Repeats the crit on the floor above, 51% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.bismuthBastionContinueChance),
  },
  poloniumPrism: {
    label: "Polonium Prism",
    color: COLOR.red,
    image: "crits/elements/poloniumPrism.webp",
    description: "Hires 1 free worker on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.hireWorkers(alternating(context), balance.poloniumPrismWorkers),
  },
  astatineAurora: {
    label: "Astatine Aurora",
    color: COLOR.mysticTeal,
    image: "crits/elements/astatineAurora.webp",
    description: "Cuts every price in this building by 4.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.astatineAuroraDiscount),
  },
  radonRipple: {
    label: "Radon Ripple",
    color: COLOR.silverTicketGray,
    image: "crits/elements/radonRipple.webp",
    description:
      "Repeats the crit on the floor below, 51% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.radonRippleContinueChance),
  },
  franciumFortune: {
    label: "Francium Fortune",
    color: COLOR.cyan,
    image: "crits/elements/franciumFortune.webp",
    description: "Adds 11.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.franciumFortuneShare),
  },
  radiumRhythm: {
    label: "Radium Rhythm",
    color: COLOR.blue,
    image: "crits/elements/radiumRhythm.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.radiumRhythmFloors),
  },
  actiniumArc: {
    label: "Actinium Arc",
    color: COLOR.moneyGreen,
    image: "crits/elements/actiniumArc.webp",
    description: "89 upgrades here and 89 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.actiniumArcUpgrades,
        balance.actiniumArcPayouts,
      ),
  },
  thoriumThrone: {
    label: "Thorium Throne",
    color: COLOR.gold,
    image: "crits/elements/thoriumThrone.webp",
    description: "One tier promotion and 16 upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.thoriumThroneTierSteps,
        balance.thoriumThroneUpgrades,
      ),
  },
  protactiniumOrbit: {
    label: "Protactinium Orbit",
    color: COLOR.peppermintPink,
    image: "crits/elements/protactiniumOrbit.webp",
    description: "Cuts every price in this building by 4.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.protactiniumOrbitDiscount),
  },
  neptuniumNova: {
    label: "Neptunium Nova",
    color: COLOR.red,
    image: "crits/elements/neptuniumNova.webp",
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
    image: "crits/elements/americiumAlarm.webp",
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
    image: "crits/elements/plutoniumPulse.webp",
    description:
      "Repeats the crit on the floor above, 54% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.plutoniumPulseContinueChance),
  },
  curiumCrucible: {
    label: "Curium Crucible",
    color: COLOR.silverTicketGray,
    image: "crits/elements/curiumCrucible.webp",
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
    image: "crits/elements/berkeliumBreakthrough.webp",
    description: "Cuts every price in this building by 4.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(
        context.floors,
        balance.berkeliumBreakthroughDiscount,
      ),
  },
  hydrogenHype: {
    label: "Hydrogen Hype",
    color: COLOR.blue,
    image: "crits/elements/hydrogenHype.webp",
    description: "Boosts this floor's workers for 20s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.hydrogenHypeBoostSeconds,
        balance.hydrogenHypeExtraWorkers,
      ),
  },
  heliumHighrise: {
    label: "Helium Highrise",
    color: COLOR.cyan,
    image: "crits/elements/heliumHighrise.webp",
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
    image: "crits/elements/lithiumLift.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.lithiumLiftFloors),
  },
  berylliumBrilliance: {
    label: "Beryllium Brilliance",
    color: COLOR.gold,
    image: "crits/elements/berylliumBrilliance.webp",
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
    image: "crits/elements/carbonCrown.webp",
    description: "One tier promotion and 10 upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(
        lowestLevel(context),
        balance.carbonCrownTierSteps,
        balance.carbonCrownUpgrades,
      ),
  },
  nitrogenNimbus: {
    label: "Nitrogen Nimbus",
    color: COLOR.peppermintPink,
    image: "crits/elements/nitrogenNimbus.webp",
    description: "Boosts this floor's workers for 20s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.nitrogenNimbusBoostSeconds,
        balance.nitrogenNimbusExtraWorkers,
      ),
  },
  oxygenOverdrive: {
    label: "Oxygen Overdrive",
    color: COLOR.silverTicketGray,
    image: "crits/elements/oxygenOverdrive.webp",
    description: "Boosts this floor's workers for 20s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.oxygenOverdriveBoostSeconds,
        balance.oxygenOverdriveExtraWorkers,
      ),
  },
  fluorineFlash: {
    label: "Fluorine Flash",
    color: COLOR.mysticTeal,
    image: "crits/elements/fluorineFlash.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.fluorineFlashWorkers),
  },
  sodiumSprinkle: {
    label: "Sodium Sprinkle",
    color: COLOR.blue,
    image: "crits/elements/sodiumSprinkle.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  magnesiumMagnificence: {
    label: "Magnesium Magnificence",
    color: COLOR.cyan,
    image: "crits/elements/magnesiumMagnificence.webp",
    description: "Free office chairs for this floor",
    reward: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  },
  aluminumAllStar: {
    label: "Aluminum All-Star",
    color: COLOR.moneyGreen,
    image: "crits/elements/aluminumAllStar.webp",
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
    image: "crits/elements/siliconSpark.webp",
    description: "Boosts this floor's workers for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.siliconSparkBoostSeconds,
        balance.siliconSparkExtraWorkers,
      ),
  },
  phosphorusFlare: {
    label: "Phosphorus Flare",
    color: COLOR.red,
    image: "crits/elements/phosphorusFlare.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  sulfurSunshine: {
    label: "Sulfur Sunshine",
    color: COLOR.peppermintPink,
    image: "crits/elements/sulfurSunshine.webp",
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
    image: "crits/elements/chlorineConfetti.webp",
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
    image: "crits/elements/argonAfterglow.webp",
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
    image: "crits/elements/potassiumPop.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
  calciumCornerstone: {
    label: "Calcium Cornerstone",
    color: COLOR.cyan,
    image: "crits/elements/calciumCornerstone.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  scandiumStronghold: {
    label: "Scandium Stronghold",
    color: COLOR.moneyGreen,
    image: "crits/elements/scandiumStronghold.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.scandiumStrongholdWorkers),
  },
  titaniumTakeoff: {
    label: "Titanium Takeoff",
    color: COLOR.gold,
    image: "crits/elements/titaniumTakeoff.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  vanadiumVoltage: {
    label: "Vanadium Voltage",
    color: COLOR.red,
    image: "crits/elements/vanadiumVoltage.webp",
    description: "Boosts this floor's workers for 24s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.vanadiumVoltageBoostSeconds,
        balance.vanadiumVoltageExtraWorkers,
      ),
  },
  chromiumGleam: {
    label: "Chromium Gleam",
    color: COLOR.peppermintPink,
    image: "crits/elements/chromiumGleam.webp",
    description: "Free office chairs for this floor",
    reward: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  },
  manganeseMomentum: {
    label: "Manganese Momentum",
    color: COLOR.silverTicketGray,
    image: "crits/elements/manganeseMomentum.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  ironEmpire: {
    label: "Iron Empire",
    color: COLOR.mysticTeal,
    image: "crits/elements/ironEmpire.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  cobaltCharge: {
    label: "Cobalt Charge",
    color: COLOR.blue,
    image: "crits/elements/cobaltCharge.webp",
    description: "Boosts this floor's workers for 24s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.cobaltChargeBoostSeconds,
        balance.cobaltChargeExtraWorkers,
      ),
  },
  nickelNestEgg: {
    label: "Nickel Nest Egg",
    color: COLOR.cyan,
    image: "crits/elements/nickelNestEgg.webp",
    description:
      "Repeats the crit on the floor above, 16% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.nickelNestEggContinueChance),
  },
  copperCurrent: {
    label: "Copper Current",
    color: COLOR.moneyGreen,
    image: "crits/elements/copperCurrent.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
  zincZing: {
    label: "Zinc Zing",
    color: COLOR.gold,
    image: "crits/elements/zincZing.webp",
    description: "30 upgrades here and 30 payouts on the highest floor",
    reward: (context, { balance, upgradeHereAndPayHighest }) =>
      upgradeHereAndPayHighest(
        context,
        balance.zincZingUpgrades,
        balance.zincZingPayouts,
      ),
  },
  galliumGlitter: {
    label: "Gallium Glitter",
    color: COLOR.red,
    image: "crits/elements/galliumGlitter.webp",
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
    image: "crits/elements/germaniumGenius.webp",
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
    image: "crits/elements/arsenicAlchemy.webp",
    description: "Cuts every price in this building by 1.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.arsenicAlchemyDiscount),
  },
  seleniumSunburst: {
    label: "Selenium Sunburst",
    color: COLOR.mysticTeal,
    image: "crits/elements/seleniumSunburst.webp",
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
    image: "crits/elements/bromineBounty.webp",
    description: "Adds 10s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.bromineBountySeconds),
  },
  kryptonKeepsake: {
    label: "Krypton Keepsake",
    color: COLOR.cyan,
    image: "crits/elements/kryptonKeepsake.webp",
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
    image: "crits/elements/rubidiumRadiance.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  strontiumSpectacle: {
    label: "Strontium Spectacle",
    color: COLOR.gold,
    image: "crits/elements/strontiumSpectacle.webp",
    description:
      "Repeats the crit on the floor above, 26% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "up",
        balance.strontiumSpectacleContinueChance,
      ),
  },
  yttriumYield: {
    label: "Yttrium Yield",
    color: COLOR.red,
    image: "crits/elements/yttriumYield.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  zirconiumZenith: {
    label: "Zirconium Zenith",
    color: COLOR.peppermintPink,
    image: "crits/elements/zirconiumZenith.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  niobiumNexus: {
    label: "Niobium Nexus",
    color: COLOR.silverTicketGray,
    image: "crits/elements/niobiumNexus.webp",
    description: "Cuts every price in this building by 2.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.niobiumNexusDiscount),
  },
  molybdenumMachine: {
    label: "Molybdenum Machine",
    color: COLOR.mysticTeal,
    image: "crits/elements/molybdenumMachine.webp",
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
    image: "crits/elements/technetiumTimebank.webp",
    description: "Adds 5.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.technetiumTimebankShare),
  },
  rutheniumRiches: {
    label: "Ruthenium Riches",
    color: COLOR.cyan,
    image: "crits/elements/rutheniumRiches.webp",
    description: "Adds 11s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.rutheniumRichesSeconds),
  },
  rhodiumReflection: {
    label: "Rhodium Reflection",
    color: COLOR.moneyGreen,
    image: "crits/elements/rhodiumReflection.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  palladiumPilot: {
    label: "Palladium Pilot",
    color: COLOR.gold,
    image: "crits/elements/palladiumPilot.webp",
    description: "Cuts every price in this building by 2.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.palladiumPilotDiscount),
  },
  silverMoonrise: {
    label: "Silver Moonrise",
    color: COLOR.red,
    image: "crits/elements/silverMoonrise.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.silverMoonriseWorkers),
  },
  cadmiumCatalyst: {
    label: "Cadmium Catalyst",
    color: COLOR.peppermintPink,
    image: "crits/elements/cadmiumCatalyst.webp",
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
    image: "crits/elements/indiumInsight.webp",
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
    image: "crits/elements/tinTreasure.webp",
    description: "Adds 5.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.tinTreasureShare),
  },
  antimonyAscension: {
    label: "Antimony Ascension",
    color: COLOR.blue,
    image: "crits/elements/antimonyAscension.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.antimonyAscensionFloors),
  },
  telluriumTreasurelight: {
    label: "Tellurium Treasurelight",
    color: COLOR.cyan,
    image: "crits/elements/telluriumTreasurelight.webp",
    description: "Adds 15s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.telluriumTreasurelightSeconds),
  },
  iodineIridescence: {
    label: "Iodine Iridescence",
    color: COLOR.moneyGreen,
    image: "crits/elements/iodineIridescence.webp",
    description: "Cuts every price in this building by 2.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.iodineIridescenceDiscount),
  },
  xenonSpotlight: {
    label: "Xenon Spotlight",
    color: COLOR.gold,
    image: "crits/elements/xenonSpotlight.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  cesiumClockwork: {
    label: "Cesium Clockwork",
    color: COLOR.red,
    image: "crits/elements/cesiumClockwork.webp",
    description: "Cuts every price in this building by 2.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.cesiumClockworkDiscount),
  },
  bariumBeacon: {
    label: "Barium Beacon",
    color: COLOR.peppermintPink,
    image: "crits/elements/bariumBeacon.webp",
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
    image: "crits/elements/lanthanumLuster.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  ceriumShine: {
    label: "Cerium Shine",
    color: COLOR.mysticTeal,
    image: "crits/elements/ceriumShine.webp",
    description: "Cuts every price in this building by 2.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.ceriumShineDiscount),
  },
  praseodymiumPrism: {
    label: "Praseodymium Prism",
    color: COLOR.blue,
    image: "crits/elements/praseodymiumPrism.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.praseodymiumPrismWorkers),
  },
  neodymiumNorthstar: {
    label: "Neodymium Northstar",
    color: COLOR.cyan,
    image: "crits/elements/neodymiumNorthstar.webp",
    description: "Cuts every price in this building by 2.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(
        context.floors,
        balance.neodymiumNorthstarDiscount,
      ),
  },
  promethiumPulse: {
    label: "Promethium Pulse",
    color: COLOR.moneyGreen,
    image: "crits/elements/promethiumPulse.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  samariumSanctuary: {
    label: "Samarium Sanctuary",
    color: COLOR.gold,
    image: "crits/elements/samariumSanctuary.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  europiumEncore: {
    label: "Europium Encore",
    color: COLOR.red,
    image: "crits/elements/europiumEncore.webp",
    description: "Repeats the crit on the floor below, 52% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.europiumEncoreContinueChance),
  },
  gadoliniumGlance: {
    label: "Gadolinium Glance",
    color: COLOR.peppermintPink,
    image: "crits/elements/gadoliniumGlance.webp",
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
    image: "crits/elements/terbiumTempo.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.terbiumTempoWorkers),
  },
  dysprosiumDirection: {
    label: "Dysprosium Direction",
    color: COLOR.mysticTeal,
    image: "crits/elements/dysprosiumDirection.webp",
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
    image: "crits/elements/holmiumHalo.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  erbiumElegance: {
    label: "Erbium Elegance",
    color: COLOR.cyan,
    image: "crits/elements/erbiumElegance.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  thuliumThaw: {
    label: "Thulium Thaw",
    color: COLOR.moneyGreen,
    image: "crits/elements/thuliumThaw.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.thuliumThawWorkers),
  },
  ytterbiumHourglass: {
    label: "Ytterbium Hourglass",
    color: COLOR.gold,
    image: "crits/elements/ytterbiumHourglass.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  lutetiumLimelight: {
    label: "Lutetium Limelight",
    color: COLOR.red,
    image: "crits/elements/lutetiumLimelight.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  hafniumHorizon: {
    label: "Hafnium Horizon",
    color: COLOR.peppermintPink,
    image: "crits/elements/hafniumHorizon.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.hafniumHorizonWorkers),
  },
  tantalumTrove: {
    label: "Tantalum Trove",
    color: COLOR.silverTicketGray,
    image: "crits/elements/tantalumTrove.webp",
    description: "Free office chairs for every unlocked floor",
    reward: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  },
  tungstenTriumph: {
    label: "Tungsten Triumph",
    color: COLOR.mysticTeal,
    image: "crits/elements/tungstenTriumph.webp",
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
    image: "crits/elements/rheniumRocket.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.rheniumRocketFloors),
  },
  platinumPodium: {
    label: "Platinum Podium",
    color: COLOR.cyan,
    image: "crits/elements/platinumPodium.webp",
    description: "Free office supplies for every unlocked floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies(context.floors),
  },
  goldenAtom: {
    label: "Gold Atom",
    color: COLOR.moneyGreen,
    image: "crits/elements/goldenAtom.webp",
    description: "Adds 23s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldenAtomSeconds),
  },
  uraniumUplift: {
    label: "Uranium Uplift",
    color: COLOR.gold,
    image: "crits/elements/uraniumUplift.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.uraniumUpliftFloors),
  },
  heavyElement: {
    label: "Heavy Element",
    color: COLOR.silverTicketGray,
    image: "crits/elements/heavyElement.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.heavyElementWorkers),
  },
  nucleusDividend: {
    label: "Nucleus Dividend",
    color: COLOR.cyan,
    image: "crits/elements/nucleusDividend.webp",
    description: "Adds 7s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.nucleusDividendSeconds),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
