import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createDessertsRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  alternating,
}: RewardHelpers) {
  return {
    berryParfait: (context) =>
      actions.payCycles(context.floors, balance.berryParfaitPayouts),
    lemonTart: (context) =>
      actions.upgrade([highestFloor(context)], balance.lemonTartUpgrades),
    berryShortcake: (context) =>
      actions.payCycles([context.floor], balance.berryShortcakePayouts),
    cinnamonSwirl: (context) =>
      actions.upgrade(alternating(context), balance.cinnamonSwirlUpgrades),
    chocolateCake: (context) =>
      actions.upgrade([context.floor], balance.chocolateCakeUpgrades),
    strawberryShortcake: (context) =>
      actions.payCycles([context.floor], balance.strawberryShortcakePayouts),
    rainbowDonut: (context) =>
      actions.upgrade([context.floor], balance.rainbowDonutUpgrades),
    iceCreamSundae: (context) =>
      actions.payCycles(context.floors, balance.iceCreamSundaePayouts),
    iceCreamSundae2: (context) =>
      actions.upgrade([context.floor], balance.iceCreamSundae2Upgrades),
    macaronTower: (context) =>
      actions.payCycles(context.floors, balance.macaronTowerPayouts),
    macaronTower2: (context) =>
      actions.upgrade([context.floor], balance.macaronTower2Upgrades),
    apple: (context) =>
      actions.payCycles([lowestLevel(context)], balance.applePayouts),
    cupcake: (context) =>
      actions.upgrade([context.floor], balance.cupcakeUpgrades),
    donut: (context) =>
      actions.payCycles([context.floor], balance.donutPayouts),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
