import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createSteampunkRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    aetherLantern: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.aetherLanternUpgrades,
      ),
    boilerRoom: (context) =>
      actions.upgrade([lowestLevel(context)], balance.boilerRoomUpgrades),
    brassDiver: (context) =>
      actions.payCycles([context.floor], balance.brassDiverPayouts),
    clockworkHand: (context) =>
      actions.upgrade(alternating(context), balance.clockworkHandUpgrades),
    cogwork: (context) =>
      actions.payCycles(context.floors, balance.cogworkPayouts),
    fullSteam: (context) =>
      actions.upgrade(context.floors, balance.fullSteamUpgrades),
    pocketWatch: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.pocketWatchPayouts,
      ),
    tubeDelivery: (context) =>
      actions.upgrade([highestFloor(context)], balance.tubeDeliveryUpgrades),
    windUp: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.windUpTierSteps,
        balance.windUpUpgrades,
      ),
    clockworkSatellite: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.clockworkSatelliteUpgrades,
      ),
    clockworkOwl: (context) =>
      actions.upgrade([context.floor], balance.clockworkOwlUpgrades),
    clockworkWizard2: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.clockworkWizard2Upgrades,
      ),
    metalHeart: (context) =>
      actions.upgrade([context.floor], balance.metalHeartUpgrades),
    metalHeart2: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.metalHeart2Payouts,
      ),
    clockworkWizard: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.clockworkWizardTierSteps,
        balance.clockworkWizardUpgrades,
      ),
    bulwark: (context) =>
      actions.upgrade([context.floor], balance.bulwarkUpgrades),
    fullPlate: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.fullPlateUpgrades,
      ),
    overlord: (context) =>
      actions.payCycles(context.floors, balance.overlordPayouts),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
