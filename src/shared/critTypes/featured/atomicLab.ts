import type { ATOMIC_LAB_CRITS } from "../../critData/atomicLab";
import type { FeaturedRewards } from "./types";

export const ATOMIC_LAB_REWARDS = {
  einsteiniumEpiphany: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.einsteiniumEpiphanyUpgrades,
      balance.einsteiniumEpiphanyPayouts,
    ),
  fermiumFormula: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  meitneriumMarvel: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.meitneriumMarvelBoostSeconds,
      balance.meitneriumMarvelExtraWorkers,
    ),
  roentgeniumRevelation: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  americiumAlarm: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.americiumAlarmUpgrades,
      balance.americiumAlarmPayouts,
    ),
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
  sodiumSprinkle: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  siliconSpark: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.siliconSparkBoostSeconds,
      balance.siliconSparkExtraWorkers,
    ),
  chlorineConfetti: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.chlorineConfettiUpgrades,
      balance.chlorineConfettiPayouts,
    ),
  potassiumPop: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  zincZing: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.zincZingUpgrades,
      balance.zincZingPayouts,
    ),
  germaniumGenius: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.germaniumGeniusUpgrades,
      balance.germaniumGeniusPayouts,
    ),
  arsenicAlchemy: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.arsenicAlchemyDiscount),
  kryptonKeepsake: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.kryptonKeepsakeUpgrades,
      balance.kryptonKeepsakePayouts,
    ),
  yttriumYield: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  niobiumNexus: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.niobiumNexusDiscount),
  technetiumTimebank: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.technetiumTimebankShare),
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
  cesiumClockwork: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.cesiumClockworkDiscount),
  praseodymiumPrism: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.praseodymiumPrismWorkers),
  gadoliniumGlance: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.gadoliniumGlanceUpgrades,
      balance.gadoliniumGlancePayouts,
    ),
  ytterbiumHourglass: (context, { actions }) => actions.hireManagers([context.floor]),
  goldenAtom: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldenAtomSeconds),
  nucleusDividend: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.nucleusDividendSeconds),
} satisfies FeaturedRewards<typeof ATOMIC_LAB_CRITS>;
