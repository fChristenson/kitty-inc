import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createCrittersRewards({
  actions,
  balance,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    crownHedgehog: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.crownHedgehogTierSteps,
        balance.crownHedgehogUpgrades,
      ),
    lanternFox: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.lanternFoxPayouts,
      ),
    lanternLynx: (context) =>
      actions.upgrade([lowestLevel(context)], balance.lanternLynxUpgrades),
    pearlOtter: (context) =>
      actions.payCycles([context.floor], balance.pearlOtterPayouts),
    profitPigeon: (context) =>
      actions.payCycles(alternating(context), balance.profitPigeonPayouts),
    redPanda: (context) =>
      actions.upgrade(alternating(context), balance.redPandaUpgrades),
    goldenGardenGolem: (context) =>
      actions.payCycles(context.floors, balance.goldenGardenGolemPayouts),
    vaultBeetle: (context) =>
      actions.upgrade([context.floor], balance.vaultBeetleUpgrades),
    antleredFoxFortune: (context) =>
      actions.upgrade([context.floor], balance.antleredFoxFortuneUpgrades),
    bestestBoy: (context) =>
      actions.upgrade([context.floor], balance.bestestBoyUpgrades),
    doggo: (context) => actions.payCycles(context.floors, balance.doggoPayouts),
    otterlyAdorable: (context) =>
      actions.payCycles([context.floor], balance.otterlyAdorablePayouts),
    sleepyFox: (context) =>
      actions.payCycles([context.floor], balance.sleepyFoxPayouts),
    sleepyPanda: (context) =>
      actions.upgrade([context.floor], balance.sleepyPandaUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
