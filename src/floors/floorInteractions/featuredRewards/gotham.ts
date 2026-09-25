import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createGothamRewards({
  actions,
  balance,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    iAmTheNight: (context) =>
      actions.upgrade(context.floors, balance.iAmTheNightUpgrades),
    tubs: (context) => actions.payCycles([context.floor], balance.tubsPayouts),
    whySoSerious: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.whySoSeriousTierSteps,
        balance.whySoSeriousUpgrades,
      ),
    batman: (context) =>
      actions.upgrade([context.floor], balance.batmanUpgrades),
    joker: (context) => actions.payCycles(context.floors, balance.jokerPayouts),
    harleyQuinn: (context) =>
      actions.upgrade([context.floor], balance.harleyQuinnUpgrades),
    killerCroc: (context) =>
      actions.payCycles(context.floors, balance.killerCrocPayouts),
    mrFreeze: (context) =>
      actions.upgrade([context.floor], balance.mrFreezeUpgrades),
    poisonIvy: (context) =>
      actions.payCycles([context.floor], balance.poisonIvyPayouts),
    scarecrow: (context) =>
      actions.upgrade([context.floor], balance.scarecrowUpgrades),
    thePenguin: (context) =>
      actions.payCycles([context.floor], balance.thePenguinPayouts),
    theRiddler: (context) =>
      actions.upgrade([context.floor], balance.theRiddlerUpgrades),
    bane: (context) => actions.upgrade([context.floor], balance.baneUpgrades),
    harleyQuinn2: (context) =>
      actions.payCycles([context.floor], balance.harleyQuinn2Payouts),
    killerCroc2: (context) =>
      actions.upgrade([context.floor], balance.killerCroc2Upgrades),
    poisonIvy2: (context) =>
      actions.upgrade([context.floor], balance.poisonIvy2Upgrades),
    poisonIvy3: (context) =>
      actions.payCycles(context.floors, balance.poisonIvy3Payouts),
    thePenguin2: (context) =>
      actions.upgrade([context.floor], balance.thePenguin2Upgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
