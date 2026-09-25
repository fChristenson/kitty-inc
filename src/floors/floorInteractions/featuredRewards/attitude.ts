import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createAttitudeRewards({
  actions,
  balance,
  lowestLevel,
  selectByRate,
}: RewardHelpers) {
  return {
    goldenSkull: (context) => {
      actions.upgrade([context.floor], balance.goldenSkullUpgrades);
      actions.payCycles([context.floor], balance.goldenSkullPayouts);
    },
    lordOfMurder: (context) => {
      actions.upgrade(context.floors, balance.lordOfMurderUpgrades);
      actions.payCycles(context.floors, balance.lordOfMurderPayouts);
    },
    speedDemon: (context) => {
      const floor = selectByRate(context, true);
      actions.upgrade([floor], balance.speedDemonUpgrades);
      actions.payCycles([floor], balance.speedDemonPayouts);
    },
    badonkadonk: (context) => {
      actions.upgrade([context.floor], balance.badonkadonkUpgrades);
      actions.payCycles([context.floor], balance.badonkadonkPayouts);
    },
    demonicBuns: (context) => {
      actions.upgrade([context.floor], balance.demonicBunsUpgrades);
      actions.payCycles([context.floor], balance.demonicBunsPayouts);
    },
    infernalInterest: (context) => {
      actions.upgrade([context.floor], balance.infernalInterestUpgrades);
      actions.payCycles([context.floor], balance.infernalInterestPayouts);
    },
    dropItLow: (context) => {
      const floor = lowestLevel(context);
      actions.upgrade([floor], balance.dropItLowUpgrades);
      actions.payCycles([floor], balance.dropItLowPayouts);
    },
    kittyWagon: (context) => {
      actions.upgrade(context.floors, balance.kittyWagonUpgrades);
      actions.payCycles(context.floors, balance.kittyWagonPayouts);
    },
    madeYouLook: (context) => {
      actions.upgrade([context.floor], balance.madeYouLookUpgrades);
      actions.payCycles([context.floor], balance.madeYouLookPayouts);
    },
    wagonWarrior: (context) => {
      actions.upgrade(context.floors, balance.wagonWarriorUpgrades);
      actions.payCycles(context.floors, balance.wagonWarriorPayouts);
    },
    bubbleButt: (context) => {
      actions.upgrade([context.floor], balance.bubbleButtUpgrades);
      actions.payCycles([context.floor], balance.bubbleButtPayouts);
    },
    canNotLie: (context) => {
      actions.upgrade([context.floor], balance.canNotLieUpgrades);
      actions.payCycles([context.floor], balance.canNotLiePayouts);
    },
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
