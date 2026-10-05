import type { RELICS_CRITS } from "../../critData/relics";
import type { FeaturedRewards } from "./types";

export const RELICS_REWARDS = {
  ancientRelic: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.ancientRelicPayouts),
  geometricRelic: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.geometricRelicDiscount),
  emberKey: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.emberKeyFloors),
  frostRune: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.frostRuneDiscount),
  memoryCrystal: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.memoryCrystalTierSteps,
      balance.memoryCrystalUpgrades,
    ),
  neonBeaker: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.neonBeakerPayouts,
    ),
  rainbowRelic: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.rainbowRelicTierSteps,
      balance.rainbowRelicUpgrades,
    ),
  whisperingOrb: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.whisperingOrbTierSteps,
      balance.whisperingOrbUpgrades,
    ),
  lionKey: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.lionKeyTierSteps,
      balance.lionKeyUpgrades,
    ),
  restorationProject: (context, { actions, lowestLevel }) =>
    actions.armCrit([lowestLevel(context)], "crit"),
  relicCompass: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.relicCompassUpgrades),
} satisfies FeaturedRewards<typeof RELICS_CRITS>;
