import type { SKY_AND_SPACE_ELEMENTS_CRITS } from "../../critData/skyAndSpaceElements";
import type { FeaturedRewards } from "./types";

export const SKY_AND_SPACE_ELEMENTS_REWARDS = {
  hassiumMeteor: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.hassiumMeteorBoostSeconds,
      balance.hassiumMeteorExtraWorkers,
    ),
  coperniciumCarousel: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  nihoniumDaybreak: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.nihoniumDaybreakDiscount),
  tennessineTwinkle: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  oganessonOdyssey: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.oganessonOdysseyWorkers),
  astatineAurora: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.astatineAuroraDiscount),
  protactiniumOrbit: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.protactiniumOrbitDiscount),
  neptuniumNova: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.neptuniumNovaUpgrades,
      balance.neptuniumNovaPayouts,
    ),
  heliumHighrise: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.heliumHighriseUpgrades,
      balance.heliumHighrisePayouts,
    ),
  nitrogenNimbus: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.nitrogenNimbusBoostSeconds,
      balance.nitrogenNimbusExtraWorkers,
    ),
  phosphorusFlare: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  argonAfterglow: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.argonAfterglowUpgrades,
      balance.argonAfterglowPayouts,
    ),
  titaniumTakeoff: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  galliumGlitter: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.galliumGlitterUpgrades,
      balance.galliumGlitterPayouts,
    ),
  seleniumSunburst: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.seleniumSunburstUpgrades,
      balance.seleniumSunburstPayouts,
    ),
  strontiumSpectacle: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "up",
      balance.strontiumSpectacleContinueChance,
    ),
  zirconiumZenith: (context, { actions }) => actions.hireManagers([context.floor]),
  palladiumPilot: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.palladiumPilotDiscount),
  silverMoonrise: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.silverMoonriseWorkers),
  antimonyAscension: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.antimonyAscensionFloors),
  neodymiumNorthstar: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.neodymiumNorthstarDiscount,
    ),
  europiumEncore: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.europiumEncoreContinueChance),
  dysprosiumDirection: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.dysprosiumDirectionUpgrades,
      balance.dysprosiumDirectionPayouts,
    ),
  holmiumHalo: (context, { actions }) => actions.hireManagers([context.floor]),
  hafniumHorizon: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.hafniumHorizonWorkers),
  rheniumRocket: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.rheniumRocketFloors),
} satisfies FeaturedRewards<typeof SKY_AND_SPACE_ELEMENTS_CRITS>;
