import type { ENERGY_AND_NATURE_CRITS } from "../../critData/energyAndNature";
import type { FeaturedRewards } from "./types";

export const ENERGY_AND_NATURE_REWARDS = {
  californiumCrescendo: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.californiumCrescendoUpgrades,
      balance.californiumCrescendoPayouts,
    ),
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
  livermoriumLightning: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.livermoriumLightningBoostSeconds,
      balance.livermoriumLightningExtraWorkers,
    ),
  mercuryFlow: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  thalliumThrive: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.thalliumThriveUpgrades,
      balance.thalliumThrivePayouts,
    ),
  poloniumPrism: (context, { actions, balance, alternating }) =>
    actions.hireWorkers(alternating(context), balance.poloniumPrismWorkers),
  radonRipple: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.radonRippleContinueChance),
  radiumRhythm: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.radiumRhythmFloors),
  actiniumArc: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.actiniumArcUpgrades,
      balance.actiniumArcPayouts,
    ),
  plutoniumPulse: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.plutoniumPulseContinueChance),
  lithiumLift: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.lithiumLiftFloors),
  berylliumBrilliance: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.berylliumBrillianceUpgrades,
      balance.berylliumBrilliancePayouts,
    ),
  oxygenOverdrive: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.oxygenOverdriveBoostSeconds,
      balance.oxygenOverdriveExtraWorkers,
    ),
  fluorineFlash: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.fluorineFlashWorkers),
  sulfurSunshine: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.sulfurSunshineUpgrades,
      balance.sulfurSunshinePayouts,
    ),
  vanadiumVoltage: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.vanadiumVoltageBoostSeconds,
      balance.vanadiumVoltageExtraWorkers,
    ),
  manganeseMomentum: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  cobaltCharge: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.cobaltChargeBoostSeconds,
      balance.cobaltChargeExtraWorkers,
    ),
  copperCurrent: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  rubidiumRadiance: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  rhodiumReflection: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  telluriumTreasurelight: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.telluriumTreasurelightSeconds),
  iodineIridescence: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.iodineIridescenceDiscount),
  xenonSpotlight: (context, { actions }) => actions.hireManagers([context.floor]),
  bariumBeacon: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.bariumBeaconUpgrades,
      balance.bariumBeaconPayouts,
    ),
  ceriumShine: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.ceriumShineDiscount),
  promethiumPulse: (context, { actions }) => actions.hireManagers([context.floor]),
  samariumSanctuary: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  terbiumTempo: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.terbiumTempoWorkers),
  thuliumThaw: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.thuliumThawWorkers),
  lutetiumLimelight: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  uraniumUplift: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.uraniumUpliftFloors),
} satisfies FeaturedRewards<typeof ENERGY_AND_NATURE_CRITS>;
