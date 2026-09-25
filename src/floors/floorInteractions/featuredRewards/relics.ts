import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createRelicsRewards({
  actions,
  balance,
  selectByRate,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    ancientRelic: (context) =>
      actions.payCycles([context.floor], balance.ancientRelicPayouts),
    geometricRelic: (context) =>
      actions.payCycles([context.floor], balance.geometricRelicPayouts),
    emberKey: (context) =>
      actions.upgrade([context.floor], balance.emberKeyUpgrades),
    frostRune: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.frostRuneUpgrades,
      ),
    memoryCrystal: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.memoryCrystalTierSteps,
        balance.memoryCrystalUpgrades,
      ),
    neonBeaker: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.neonBeakerPayouts,
      ),
    rainbowRelic: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.rainbowRelicTierSteps,
        balance.rainbowRelicUpgrades,
      ),
    whisperingOrb: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.whisperingOrbTierSteps,
        balance.whisperingOrbUpgrades,
      ),
    lionKey: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.lionKeyTierSteps,
        balance.lionKeyUpgrades,
      ),
    restorationProject: (context) =>
      actions.upgrade([context.floor], balance.restorationProjectUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
